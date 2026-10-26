import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Window } from "happy-dom";
import { libraryQuestionsInBlock } from "@artifactory/design-system/question-markers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  checkTimeout,
  createFixtureRepo,
  type CheckRun,
  type FixtureRepo,
} from "./fixture-repo.ts";

function artifact(frontmatter: string[], body = ["Texto."]): string {
  return ["---", ...frontmatter, "---", "", ...body, ""].join("\n");
}

const limitsBody = [
  'import SingleChoice from "@artifactory/design-system/single-choice";',
  "",
  "O limite de $1/x$ quando $x$ cresce é zero.",
  "",
  '<SingleChoice id="limite-de-1-sobre-x" answer={1}>',
  "",
  "Qual é o limite de $1/x$ quando $x$ cresce?",
  "",
  "1. $0$",
  "2. $1$",
  "",
  "</SingleChoice>",
];

interface ManifestEntry {
  contentHash: string;
  questions: { id: string; kind: string; key?: unknown }[];
}

describe("a repo with published artifacts and drafts, some with questions", () => {
  let repo: FixtureRepo;
  let run: CheckRun;
  let manifest: Record<string, ManifestEntry>;

  beforeAll(async () => {
    repo = await createFixtureRepo({
      "artifacts/derivadas/index.mdx": artifact(
        [
          "id: d3r1v4d4",
          "title: Derivadas",
          "subject: Cálculo",
          "lang: pt-BR",
          "published: 2026-08-30",
        ],
        [
          'import OpenQuestion from "@artifactory/design-system/open-question";',
          'import SingleChoice from "@artifactory/design-system/single-choice";',
          "",
          '<SingleChoice id="regra-da-potencia" answer={2}>',
          "",
          "Qual é a derivada de $x^2$?",
          "",
          "1. $x$",
          "2. $2x$",
          "",
          "</SingleChoice>",
          "",
          "## Definição",
          "",
          "A derivada é o limite da razão incremental.",
          "",
          "## A derivada de $x^n$",
          "",
          '<OpenQuestion id="por-que-2x">',
          "",
          "Por que a derivada de $x^2$ é $2x$?",
          "",
          "---",
          "",
          "Pela definição de derivada como limite.",
          "",
          "</OpenQuestion>",
        ],
      ),
      "artifacts/bases-nitrogenadas/index.mdx": artifact([
        "id: b4s3sn1t",
        "title: Bases nitrogenadas",
        "subject: Bioquímica",
        "lang: pt-BR",
        "published: 2026-10-12",
      ]),
      "artifacts/limites/index.mdx": artifact(
        [
          "id: l1m1t3s1",
          "title: Limites",
          "subject: Cálculo",
          "lang: pt-BR",
          "published: 2026-10-14",
        ],
        limitsBody,
      ),
      "artifacts/limites-copia/index.mdx": artifact(
        [
          "id: l1m1t3s2",
          "title: Limites",
          "subject: Cálculo",
          "lang: pt-BR",
          "published: 2026-10-11",
          "public: true",
          "formerSlugs: [limites-antigo]",
        ],
        limitsBody,
      ),
      "artifacts/limites-revisado/index.mdx": artifact(
        [
          "id: l1m1t3s3",
          "title: Limites",
          "subject: Cálculo",
          "lang: pt-BR",
          "published: 2026-10-10",
        ],
        ["O limite de $1/x$ quando $x$ cresce é nulo."],
      ),
      "artifacts/teoria-acido-base/index.mdx": artifact([
        "id: 4c1d0sb4",
        "title: Ácidos e bases",
        "subject: Química",
        "lang: pt-BR",
        "published: 2026-10-12",
      ]),
      "artifacts/eigenvalues/index.mdx": artifact(
        [
          "id: e1g3nv4l",
          "title: Eigenvalues",
          "subject: Linear Algebra",
          "lang: en",
          "published: 2026-10-13",
        ],
        [
          'import NumericQuestion from "@artifactory/design-system/numeric-question";',
          "",
          '<NumericQuestion id="spring-frequency" answer="10" tolerance={0.05} unit="rad/s">',
          "",
          "A $2\\,\\mathrm{kg}$ mass hangs on a spring with $k = 200\\,\\mathrm{N/m}$. What is its angular frequency $\\omega$?",
          "",
          "</NumericQuestion>",
        ],
      ),
      "artifacts/genetica/index.mdx": artifact([
        "id: g3n3t1c4",
        "title: Genética",
        "subject: Genética",
        "lang: pt-BR",
        "published: 2026-10-01",
        "draft: true",
      ]),
      "artifacts/integrais/index.mdx": artifact(
        [
          "id: 1nt3gr41",
          "title: Integrais",
          "subject: Cálculo",
          "lang: pt-BR",
          "published: 2026-10-15",
          "draft: true",
        ],
        [
          'import SingleChoice from "@artifactory/design-system/single-choice";',
          "",
          '<SingleChoice id="regra-da-potencia" answer={1}>',
          "",
          "Qual é uma primitiva de $2x$?",
          "",
          "1. $x^2$",
          "2. $2$",
          "",
          "</SingleChoice>",
        ],
      ),
    });
    run = await repo.check(["--artifacts-only"]);
    manifest = JSON.parse(
      await readFile(join(repo.root, "dist-worker/question-manifest.json"), "utf8"),
    ) as Record<string, ManifestEntry>;
  }, checkTimeout);

  afterAll(() => repo.remove());

  it("passes, since question IDs only need to be unique within an artifact", () => {
    expect(run.summary).toEqual(["pnpm check: 0 failures"]);
    expect(run.exitCode).toBe(0);
  });

  async function builtPage(path: string): Promise<Document> {
    const html = await readFile(join(repo.root, "dist", path, "index.html"), "utf8");
    return new new Window().DOMParser().parseFromString(html, "text/html") as unknown as Document;
  }

  // Only the head is written: the theme and the viewer have to be set there, before the stylesheets
  // and the body. An artifact's head also holds its module scripts, which happy-dom runs at once
  // rather than deferred, so an element defined there would connect before its body is parsed.
  async function setInHead(
    file: string,
    attribute: string,
    device: { prefersColorScheme?: "light" | "dark"; storage: Record<string, string> | "blocked" },
  ) {
    const html = await readFile(join(repo.root, "dist", file), "utf8");
    const window = new Window({
      settings: {
        enableJavaScriptEvaluation: true,
        suppressInsecureJavaScriptEnvironmentWarning: true,
        disableJavaScriptFileLoading: true,
        disableCSSFileLoading: true,
        device: { prefersColorScheme: device.prefersColorScheme ?? "light" },
      },
    });
    if (device.storage === "blocked") {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new window.DOMException("The operation is insecure.", "SecurityError");
        },
      });
    } else {
      for (const [key, value] of Object.entries(device.storage)) {
        window.localStorage.setItem(key, value);
      }
    }
    window.document.write(html.slice(0, html.indexOf("</head>")));
    const value = window.document.documentElement.getAttribute(attribute);
    await window.happyDOM.close();
    return value;
  }

  function inLanguage(element: Element | null | undefined, lang: "en" | "pt") {
    const copy = element?.ownerDocument.importNode(element, true);
    const otherLanguage = copy?.querySelectorAll(`[data-lang]:not([data-lang="${lang}"])`) ?? [];
    for (const label of otherLanguage) label.remove();
    const text = (node: Element) => node.textContent.replace(/\s+/g, " ").trim();
    return {
      copy,
      // Astro writes a component's script where it's declared, so the eye's module sits in its row.
      slots: (row: Element | null | undefined) =>
        [...(row?.children ?? [])].filter((slot) => slot.localName !== "script").map(text),
      toggles: [...(copy?.querySelectorAll("button[aria-pressed]") ?? [])].map(text),
    };
  }

  describe("the Library and the drafts page", () => {
    function rows(page: Document): string[] {
      return [...page.querySelectorAll("main > ol > li")].map((row) =>
        [...row.querySelectorAll("*")]
          .filter((element) => element.children.length === 0)
          .map((element) => element.textContent.trim())
          .join(" "),
      );
    }

    function links(page: Document): string[] {
      return [...page.querySelectorAll("main > ol > li a")].map(
        (link) => link.getAttribute("href") ?? "",
      );
    }

    function subjectChoices(page: Document): string[] {
      return [...page.querySelectorAll("select option")].map((option) => option.textContent);
    }

    it("lists every published artifact in the Library, newest published first and same-day ones by title", async () => {
      const library = await builtPage("");
      expect(rows(library)).toEqual([
        "Limites Cálculo 14 Oct 2026",
        "Eigenvalues Linear Algebra 13 Oct 2026",
        "Ácidos e bases Química 12 Oct 2026",
        "Bases nitrogenadas Bioquímica 12 Oct 2026",
        "Limites Cálculo 11 Oct 2026 Public",
        "Limites Cálculo 10 Oct 2026",
        "Derivadas Cálculo 30 Aug 2026",
      ]);
      expect(links(library)).toEqual([
        "/limites/",
        "/eigenvalues/",
        "/teoria-acido-base/",
        "/bases-nitrogenadas/",
        "/limites-copia/",
        "/limites-revisado/",
        "/derivadas/",
      ]);
    });

    it("lists every draft on the drafts page, in the same format and order", async () => {
      const drafts = await builtPage("drafts");
      expect(rows(drafts)).toEqual([
        "Integrais Cálculo 15 Oct 2026",
        "Genética Genética 1 Oct 2026",
      ]);
      expect(links(drafts)).toEqual(["/integrais/", "/genetica/"]);
    });

    it("says Public after the date on a public artifact's row, in English whatever its language, and on no other row", async () => {
      const metaLines = (page: Document) =>
        [...page.querySelectorAll("main > ol > li > p")].map((line) =>
          [...line.children].map((item) => item.textContent.trim()),
        );
      const library = await builtPage("");
      const mark = [...library.querySelectorAll("main > ol > li > p > *")].find(
        (item) => item.textContent.trim() === "Public",
      );
      expect(mark?.closest("[lang]")?.getAttribute("lang")).toBe("en");
      expect(metaLines(library)).toEqual([
        ["Cálculo", "14 Oct 2026"],
        ["Linear Algebra", "13 Oct 2026"],
        ["Química", "12 Oct 2026"],
        ["Bioquímica", "12 Oct 2026"],
        ["Cálculo", "11 Oct 2026", "Public"],
        ["Cálculo", "10 Oct 2026"],
        ["Cálculo", "30 Aug 2026"],
      ]);
      expect(metaLines(await builtPage("drafts"))).toEqual([
        ["Cálculo", "15 Oct 2026"],
        ["Genética", "1 Oct 2026"],
      ]);
    });

    it("offers All and only the subjects in use on each page as subject filters", async () => {
      expect(subjectChoices(await builtPage(""))).toEqual([
        "All",
        "Bioquímica",
        "Cálculo",
        "Linear Algebra",
        "Química",
      ]);
      expect(subjectChoices(await builtPage("drafts"))).toEqual(["All", "Cálculo", "Genética"]);
    });

    it("carries the number and section of each listed artifact's questions into the Library and the drafts page, in the list's order", async () => {
      async function questionsOn(path: string) {
        const html = await readFile(join(repo.root, "dist", path, "index.html"), "utf8");
        return libraryQuestionsInBlock(html).map(({ artifactId, questions }) => ({
          artifactId,
          questions: questions.map(({ id, number, section }) => {
            if (section === undefined) return { id, number };
            const title = new Window().document.createElement("span");
            title.innerHTML = section;
            return {
              id,
              number,
              section: title.textContent,
              math: [...title.querySelectorAll("math")].map((math) => math.textContent),
            };
          }),
        }));
      }

      expect(await questionsOn("")).toEqual([
        { artifactId: "l1m1t3s1", questions: [{ id: "limite-de-1-sobre-x", number: 1 }] },
        { artifactId: "e1g3nv4l", questions: [{ id: "spring-frequency", number: 1 }] },
        { artifactId: "l1m1t3s2", questions: [{ id: "limite-de-1-sobre-x", number: 1 }] },
        {
          artifactId: "d3r1v4d4",
          questions: [
            { id: "regra-da-potencia", number: 1 },
            { id: "por-que-2x", number: 2, section: "A derivada de xn", math: ["xn"] },
          ],
        },
      ]);
      expect(await questionsOn("drafts")).toEqual([
        { artifactId: "1nt3gr41", questions: [{ id: "regra-da-potencia", number: 1 }] },
      ]);
    });

    it("stamps one build ID into the Library, the drafts page and the Worker", async () => {
      const buildId = (page: Document) => page.documentElement.getAttribute("data-build-id");
      const workerBuildId = JSON.parse(
        await readFile(join(repo.root, "dist-worker/build-id.json"), "utf8"),
      ) as unknown;

      expect(workerBuildId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(buildId(await builtPage(""))).toBe(workerBuildId);
      expect(buildId(await builtPage("drafts"))).toBe(workerBuildId);
    });

    it("links the Library and the drafts page to each other", async () => {
      const outsideTheList = (page: Document) =>
        [...page.querySelectorAll("a")]
          .filter((link) => link.closest("ol") === null)
          .map((link) => link.getAttribute("href"));
      expect(outsideTheList(await builtPage(""))).toEqual(["/drafts/"]);
      expect(outsideTheList(await builtPage("drafts"))).toEqual(["/"]);
    });

    it("holds the eye in the running head, between artifactory and the link to the other list", async () => {
      function runningHead(page: Document) {
        const { copy, slots, toggles } = inLanguage(
          page.querySelector("main")?.firstElementChild,
          "en",
        );
        return { slots: slots(copy), toggles };
      }
      expect(runningHead(await builtPage(""))).toEqual({
        slots: ["artifactory", "Dark theme", "Drafts"],
        toggles: ["Dark theme"],
      });
      expect(runningHead(await builtPage("drafts"))).toEqual({
        slots: ["artifactory", "Dark theme", "Library"],
        toggles: ["Dark theme"],
      });
    });
  });

  describe("an artifact's masthead", () => {
    function masthead(page: Document, lang: "en" | "pt") {
      const { copy, slots, toggles } = inLanguage(page.querySelector("header"), lang);
      const [runningHead, identRow] = copy?.children ?? [];
      return { runningHead: slots(runningHead), identRow: slots(identRow), toggles };
    }

    const backLink = (page: Document) =>
      page.querySelector("header a:not([href^='#'])")?.getAttribute("href");

    it("says a draft is a draft once, on its date line, links back to the drafts page and holds the eye", async () => {
      const draft = await builtPage("integrais");
      expect(masthead(draft, "pt")).toEqual({
        runningHead: ["Pular para o texto", "Rascunhos", "Tema escuro", "1 questão"],
        identRow: ["Cálculo", "Rascunho · criado em 15 out. 2026"],
        toggles: ["Tema escuro"],
      });
      expect(masthead(draft, "en")).toEqual({
        runningHead: ["Skip to the text", "Drafts", "Dark theme", "1 question"],
        identRow: ["Cálculo", "Draft · created 15 Oct 2026"],
        toggles: ["Dark theme"],
      });
      expect(backLink(draft)).toBe("/drafts/");
    });

    it("dates a published artifact by its published date, links back to the Library and holds the eye", async () => {
      const published = await builtPage("derivadas");
      expect(masthead(published, "pt")).toEqual({
        runningHead: ["Pular para o texto", "Biblioteca", "Tema escuro", "2 seções · 2 questões"],
        identRow: ["Cálculo", "Publicado em 30 ago. 2026"],
        toggles: ["Tema escuro"],
      });
      expect(masthead(published, "en")).toEqual({
        runningHead: ["Skip to the text", "Library", "Dark theme", "2 sections · 2 questions"],
        identRow: ["Cálculo", "Published 30 Aug 2026"],
        toggles: ["Dark theme"],
      });
      expect(backLink(published)).toBe("/");
    });

    it("marks a public artifact's page public and holds both the back link and the visitor's line, which a private page lacks", async () => {
      const shared = await builtPage("limites-copia");
      expect(shared.documentElement.hasAttribute("data-public")).toBe(true);
      expect(masthead(shared, "pt")).toEqual({
        runningHead: ["Pular para o texto", "Biblioteca", "Tema escuro", "1 questão"],
        identRow: [
          "Cálculo",
          "Publicado em 11 out. 2026",
          "Suas respostas ficam só nesta página e somem quando você sai.",
        ],
        toggles: ["Tema escuro"],
      });
      expect(masthead(shared, "en").identRow).toEqual([
        "Cálculo",
        "Published 11 Oct 2026",
        "Your answers stay on this page and are gone when you leave.",
      ]);
      expect(backLink(shared)).toBe("/");

      const kept = await builtPage("limites");
      expect(kept.documentElement.hasAttribute("data-public")).toBe(false);
      expect(masthead(kept, "pt").identRow).toEqual(["Cálculo", "Publicado em 14 out. 2026"]);
    });

    it("sends a signed-out owner to the Library from a public page, and reloads a private one", async () => {
      const signInAction = (page: Document) => {
        const action = page.querySelector("[data-notice=signedOut] .state-notice-action");
        return {
          href: action?.getAttribute("href") ?? null,
          pt: action?.querySelector("[data-lang=pt]")?.textContent,
          en: action?.querySelector("[data-lang=en]")?.textContent,
        };
      };
      expect(signInAction(await builtPage("limites-copia"))).toEqual({
        href: "/",
        pt: "Entrar pela Biblioteca",
        en: "Sign in from the Library",
      });
      expect(signInAction(await builtPage("limites"))).toEqual({
        href: null,
        pt: "Recarregue para entrar",
        en: "Reload to sign in",
      });
    });
  });

  describe("the viewer of a public artifact's page", () => {
    const ownerMark = { "artifactory-owner": "" };
    const viewerDecidedInHead = (slug: string, storage: Record<string, string> | "blocked") =>
      setInHead(`${slug}/index.html`, "data-viewer", { storage });

    it("is the owner on a device with the owner mark, and a visitor without it or without storage", async () => {
      expect(await viewerDecidedInHead("limites-copia", ownerMark)).toBe("owner");
      expect(await viewerDecidedInHead("limites-copia", {})).toBe("visitor");
      expect(await viewerDecidedInHead("limites-copia", "blocked")).toBe("visitor");
    });

    it("isn't decided on a private artifact's page", async () => {
      expect(await viewerDecidedInHead("limites", ownerMark)).toBeNull();
      expect(await viewerDecidedInHead("limites", {})).toBeNull();
    });
  });

  describe("the theme this device chose", () => {
    const pages = ["index.html", "drafts/index.html", "derivadas/index.html", "404.html"];

    // The device shows the other theme, because a choice equal to the device is forgotten.
    const themeAppliedInHead = (file: string, chosen: "light" | "dark") =>
      setInHead(file, "data-theme", {
        prefersColorScheme: chosen === "dark" ? "light" : "dark",
        storage: { "artifactory-theme": chosen },
      });

    it("applies in the head of the Library, the drafts page, an artifact and the 404", async () => {
      for (const page of pages) {
        expect(await themeAppliedInHead(page, "dark"), page).toBe("dark");
        expect(await themeAppliedInHead(page, "light"), page).toBe("light");
      }
    });

    it("has no eye on the 404", async () => {
      const notFound = new new Window().DOMParser().parseFromString(
        await readFile(join(repo.root, "dist/404.html"), "utf8"),
        "text/html",
      );
      expect(notFound.querySelector("h1")?.textContent).toBe("Not found");
      expect(notFound.querySelectorAll("button[aria-pressed]")).toHaveLength(0);
    });
  });

  describe("the question manifest", () => {
    it("writes every artifact's questions, with drafts included, into the question manifest", () => {
      const questionsByArtifact = Object.fromEntries(
        Object.entries(manifest).map(([artifactId, { questions }]) => [artifactId, questions]),
      );
      expect(questionsByArtifact).toEqual({
        d3r1v4d4: [
          { id: "regra-da-potencia", kind: "single-choice", key: 2 },
          { id: "por-que-2x", kind: "open-question" },
        ],
        "1nt3gr41": [{ id: "regra-da-potencia", kind: "single-choice", key: 1 }],
        b4s3sn1t: [],
        l1m1t3s1: [{ id: "limite-de-1-sobre-x", kind: "single-choice", key: 1 }],
        l1m1t3s2: [{ id: "limite-de-1-sobre-x", kind: "single-choice", key: 1 }],
        l1m1t3s3: [],
        "4c1d0sb4": [],
        e1g3nv4l: [
          {
            id: "spring-frequency",
            kind: "numeric",
            key: { value: "10", tolerance: 0.05 },
          },
        ],
        g3n3t1c4: [],
      });
    });

    it("writes into each page the content hash the question manifest has for its artifact", async () => {
      for (const slug of [
        "derivadas",
        "bases-nitrogenadas",
        "limites",
        "limites-copia",
        "limites-revisado",
        "teoria-acido-base",
        "eigenvalues",
        "genetica",
        "integrais",
      ]) {
        const page = await readFile(join(repo.root, `dist/${slug}/index.html`), "utf8");
        const html = /<html[^>]*>/.exec(page)?.[0] ?? "";
        const artifactId = /data-artifact-id="([^"]+)"/.exec(html)?.[1] ?? "";
        const contentHash = /data-content-hash="([^"]+)"/.exec(html)?.[1];
        expect(contentHash).toMatch(/^\S+$/);
        expect(contentHash).toBe(manifest[artifactId]?.contentHash);
      }
    });

    it("derives the content hash from the rendered content, so one changed word changes it and making an artifact public doesn't", () => {
      const hashOf = (artifactId: string) => manifest[artifactId]?.contentHash;
      expect(hashOf("l1m1t3s2")).toBe(hashOf("l1m1t3s1"));
      expect(hashOf("l1m1t3s3")).not.toBe(hashOf("l1m1t3s1"));
    });
  });

  it("keeps every page out of search with one header rule on every path, and lets crawlers see it", async () => {
    expect(await readFile(join(repo.root, "dist/_headers"), "utf8")).toBe(
      "/*\n  X-Robots-Tag: noindex\n",
    );
    expect(existsSync(join(repo.root, "dist/robots.txt"))).toBe(false);
  });

  describe("the public paths manifest", () => {
    it("opens the public artifact's slug and former slug, with and without the slash, and the shared assets", async () => {
      const publicPaths = JSON.parse(
        await readFile(join(repo.root, "dist-worker/public-paths.json"), "utf8"),
      ) as unknown;
      expect(publicPaths).toEqual([
        "/_astro/*",
        "/favicon.svg",
        "/limites-antigo",
        "/limites-antigo/",
        "/limites-copia",
        "/limites-copia/",
      ]);
    });
  });
});
