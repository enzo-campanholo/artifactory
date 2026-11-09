import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkTimeout, createFixtureRepo, succeeds, type FixtureRepo } from "./fixture-repo.ts";

const exec = promisify(execFile);
const cli = resolve("scripts/verify-browser.ts");
const usage =
  "verify-browser: usage: scripts/heavy node scripts/verify-browser.ts <artifact-slug> [--dist <built-directory>]";

describe("built-browser command boundary", () => {
  let root: string;
  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "artifactory-browser-cli-"));
  });
  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });
  async function run(args: string[]) {
    try {
      const result = await exec(process.execPath, [cli, ...args], {
        cwd: root,
        env: { ...process.env, CHROME_PATH: "/browser-must-not-launch" },
      });
      return { exitCode: 0, output: result.stdout + result.stderr };
    } catch (error) {
      const result = error as { code: number; stdout: string; stderr: string };
      return { exitCode: result.code, output: result.stdout + result.stderr };
    }
  }
  it.each([
    [],
    ["../escape"],
    ["valid", "--dist"],
    ["valid", "--dist", ""],
    ["valid", "--unknown", "dist"],
    ["valid", "--dist", "--help"],
    ["valid", "--dist", "dist", "extra"],
  ])("refuses malformed arguments before launching a browser: %j", async (...args) => {
    const result = await run(args);
    expect(result.exitCode).toBe(2);
    expect(result.output.trim()).toBe(usage);
  });
  it("refuses absent default built output without building it", async () => {
    const result = await run(["browser-fixture"]);
    expect(result.exitCode).toBe(2);
    expect(result.output.trim()).toBe(
      `verify-browser: missing built page: ${join(root, "dist/browser-fixture/index.html")}; build it before running this command`,
    );
    expect(await readdir(root)).toEqual([]);
  });
  it("refuses an explicit built root that is a file", async () => {
    await writeFile(join(root, "not-a-directory"), "built output is a directory");
    const result = await run(["browser-fixture", "--dist", "not-a-directory"]);
    expect(result.exitCode).toBe(2);
    expect(result.output.trim()).toBe(
      `verify-browser: built directory is not a directory: ${join(root, "not-a-directory")}`,
    );
  });
  it("refuses an absent artifact in existing output", async () => {
    await mkdir(join(root, "built"));
    const result = await run(["absent", "--dist", "built"]);
    expect(result.exitCode).toBe(2);
    expect(result.output.trim()).toBe(
      `verify-browser: missing built page: ${join(root, "built/absent/index.html")}; build it before running this command`,
    );
  });
  it("refuses a page without the real artifact module", async () => {
    await mkdir(join(root, "built/browser-fixture"));
    await writeFile(
      join(root, "built/browser-fixture/index.html"),
      '<!doctype html><html lang="en"><title>Literal boundary fixture</title></html>',
    );
    const result = await run(["browser-fixture", "--dist", "built"]);
    expect(result.exitCode).toBe(2);
    expect(result.output.trim()).toBe(
      "verify-browser: built artifact has no render-blocking page module",
    );
  });
});

const browserFixture = {
  "artifacts/browser-fixture/index.mdx": [
    "---",
    "id: br0wser1",
    "title: Browser evidence fixture",
    "subject: Artifactory",
    "lang: en",
    "published: 2026-10-25",
    "---",
    "",
    'import NumericQuestion from "@artifactory/design-system/numeric-question";',
    "",
    "## Native table",
    "",
    "| First measurement column | Second measurement column | Third measurement column | Fourth measurement column | Fifth measurement column |",
    "| --- | --- | --- | --- | --- |",
    "| 12345678901234567890 | 23456789012345678901 | 34567890123456789012 | 45678901234567890123 | 56789012345678901234 |",
    "",
    '<NumericQuestion id="one-plus-one" answer="2">',
    "",
    "What is one plus one?",
    "",
    "</NumericQuestion>",
    "",
    "## Tall capture",
    "",
    ...Array.from(
      { length: 24 },
      () =>
        "This literal paragraph makes the page taller than the phone viewport, so capture restoration is observable.\n",
    ),
  ].join("\n"),
};

describe.skipIf(process.env.ARTIFACTORY_BROWSER_ACCEPTANCE !== "1")(
  "opt-in production browser evidence",
  () => {
    let repo: FixtureRepo;
    const evidence = process.env.ARTIFACTORY_BROWSER_EVIDENCE;
    beforeAll(async () => {
      repo = await createFixtureRepo(browserFixture);
      const builtOutput = process.env.ARTIFACTORY_BROWSER_BUILT_OUTPUT;
      if (builtOutput) await cp(builtOutput, join(repo.root, "dist"), { recursive: true });
      else await succeeds(repo.run("pnpm", ["build"]));
      if (evidence) {
        await mkdir(evidence, { recursive: true });
        await writeFile(join(evidence, "fixture-root.txt"), `${repo.root}\n`);
        await cp(join(repo.root, "dist"), join(evidence, "built-output"), { recursive: true });
      }
    }, checkTimeout);
    afterAll(async () => {
      await repo.remove();
    });
    async function verify(name: string, directory: string) {
      const result = await repo.run("node", [cli, "browser-fixture", "--dist", directory]);
      const output = join(repo.root, ".look/browser-fixture/browser");
      const report = JSON.parse(await readFile(join(output, "results.json"), "utf8")) as {
        schemaVersion: number;
        browser: { version: string };
        output: { sha256: string };
        cases: {
          id: string;
          outcome: string;
          assertions: { name: string; expected: unknown; actual: unknown; passed: boolean }[];
          captures: string[];
        }[];
      };
      if (evidence) {
        await cp(output, join(evidence, name), { recursive: true });
        await writeFile(join(evidence, `${name}.log`), result.output);
      }
      return { ...result, report };
    }
    it(
      "checks real startup, native keyboard themes, rendered scroll cues and isolated media from one built fixture",
      async () => {
        const result = await verify("normal", join(repo.root, "dist"));
        expect(result.output).not.toContain("unavailable");
        expect(result.exitCode, result.output).toBe(0);
        expect(result.report.schemaVersion).toBe(1);
        expect(result.report.browser.version).toMatch(/Chrome\//);
        expect(result.report.cases.map((test) => [test.id, test.outcome])).toEqual([
          ["theme-keyboard-en", "passed"],
          ["theme-keyboard-pt-BR", "passed"],
          ["media-dark-screen", "passed"],
          ["media-light-print", "passed"],
          ["media-light-screen", "passed"],
          ["native-table-scroll", "passed"],
          ["artifact-startup-normal", "passed"],
          ["artifact-startup-unrelated-error", "passed"],
          ["artifact-startup-missing-module", "passed"],
        ]);
        expect(
          result.report.cases.every((test) =>
            test.assertions.every((assertion) => assertion.passed),
          ),
        ).toBe(true);
        for (const test of result.report.cases.filter((test) => test.id.startsWith("media-"))) {
          expect(test.assertions).toContainEqual({
            name: "scroll restored after capture",
            expected: { x: 0, y: 0 },
            actual: { x: 0, y: 0 },
            passed: true,
          });
          expect(test.assertions).toContainEqual({
            name: "theme storage restored after capture",
            expected: null,
            actual: null,
            passed: true,
          });
        }
        const contactSheet = await readFile(
          join(repo.root, ".look/browser-fixture/browser/contact-sheet.html"),
          "utf8",
        );
        expect(contactSheet).toContain("Images await human visual review");
        for (const test of result.report.cases)
          for (const file of test.captures) expect(contactSheet).toContain(`src="${file}"`);
      },
      checkTimeout,
    );
    it.each([
      {
        name: "missing-table-target",
        page: "browser-fixture/index.html",
        injection:
          '<script>addEventListener("DOMContentLoaded",()=>document.querySelector("main .table-scroller").remove())</script>',
        caseId: "native-table-scroll",
        assertion: "overflowing native table",
        expected: true,
        actual: false,
      },
      {
        name: "missing-cue",
        page: "browser-fixture/index.html",
        injection:
          "<style>.table-scroller{border-image-source:none!important;animation:none!important}</style>",
        caseId: "native-table-scroll",
        assertion: "cue visible before scroll end",
        expected: true,
        actual: false,
      },
      {
        name: "broad-error-handler",
        page: "browser-fixture/index.html",
        injection:
          '<script>addEventListener("error",()=>{addEventListener("DOMContentLoaded",()=>{document.querySelector("[data-notice=startFailed]").hidden=false})},true)</script>',
        caseId: "artifact-startup-unrelated-error",
        assertion: "startup failure notice visibility",
        expected: false,
        actual: true,
      },
      {
        name: "absent-theme-target",
        page: "catalog/eye/index.html",
        injection:
          '<script>addEventListener("DOMContentLoaded",()=>document.querySelector("theme-eye").remove())</script>',
        caseId: "theme-keyboard-en",
        assertion: "required target theme-eye button",
        expected: "present",
        actual: null,
      },
      {
        name: "inert-theme-target",
        page: "catalog/eye/index.html",
        injection:
          '<script>addEventListener("DOMContentLoaded",()=>document.querySelector("theme-eye").inert=true)</script>',
        caseId: "theme-keyboard-en",
        assertion: "target available",
        expected: true,
        actual: false,
      },
      {
        name: "no-op-theme-handler",
        page: "catalog/eye/index.html",
        injection:
          '<script>addEventListener("keydown",event=>{if(event.target.closest("theme-eye") && [" ","Enter"].includes(event.key)){event.preventDefault();event.stopImmediatePropagation()}},true)</script>',
        caseId: "theme-keyboard-en",
        assertion: "Space changes aria, storage and computed theme",
        expected: {
          pressed: "true",
          stored: "dark",
          chosen: "dark",
          scheme: "dark",
          background: "rgb(18, 18, 18)",
          color: "rgb(237, 237, 237)",
          focused: true,
        },
        actual: {
          pressed: "false",
          stored: null,
          chosen: null,
          scheme: "light dark",
          background: "rgb(255, 255, 255)",
          color: "rgb(17, 17, 17)",
          focused: true,
        },
      },
      {
        name: "unreachable-theme-target",
        page: "catalog/eye/index.html",
        injection:
          '<script>addEventListener("DOMContentLoaded",()=>document.querySelector("theme-eye button").tabIndex=-1)</script>',
        caseId: "theme-keyboard-en",
        assertion: "native Tab focus",
        expected: "theme-eye button",
      },
    ])(
      "rejects $name with expected/actual evidence",
      async (scenario) => {
        const directory = join(repo.root, scenario.name);
        await cp(join(repo.root, "dist"), directory, { recursive: true });
        const page = join(directory, scenario.page);
        await writeFile(
          page,
          (await readFile(page, "utf8")).replace("</head>", `${scenario.injection}</head>`),
        );
        const result = await verify(scenario.name, directory);
        expect(result.exitCode, result.output).toBe(1);
        const test = result.report.cases.find((test) => test.id === scenario.caseId);
        expect(test?.outcome).toBe("failed");
        expect(test?.assertions).toContainEqual(
          expect.objectContaining({
            name: scenario.assertion,
            expected: scenario.expected,
            ...("actual" in scenario ? { actual: scenario.actual } : {}),
            passed: false,
          }),
        );
        expect(
          result.report.cases
            .filter((test) => test.id.startsWith("media-"))
            .map((test) => test.outcome),
        ).toEqual(["passed", "passed", "passed"]);
      },
      checkTimeout,
    );
  },
);

interface LookCase {
  id: string;
  outcome: string;
  captures: string[];
  assertions: { name: string; expected: unknown; actual: unknown; passed: boolean }[];
  observed: Record<string, unknown>;
}

async function look(repo: FixtureRepo, slug: string) {
  const result = await repo.run("pnpm", ["look", slug]);
  const output = join(repo.root, ".look", slug);
  const report = JSON.parse(await readFile(join(output, "results.json"), "utf8")) as {
    cases: LookCase[];
  };
  const evidence = process.env.ARTIFACTORY_BROWSER_EVIDENCE;
  if (evidence) {
    await cp(output, join(evidence, slug), { recursive: true });
    await writeFile(join(evidence, `${slug}.log`), result.output);
  }
  return { ...result, report };
}

const frontmatter = (id: string, slug: string) => [
  "---",
  `id: ${id}`,
  `title: ${slug}`,
  "subject: Artifactory",
  "lang: en",
  "published: 2026-10-25",
  "---",
  "",
];

describe.skipIf(process.env.ARTIFACTORY_BROWSER_ACCEPTANCE !== "1")(
  "opt-in Look Stage evidence",
  () => {
    let repo: FixtureRepo;
    beforeAll(async () => {
      const files: Record<string, string> = {
        "public/block-stage-forward.js":
          'addEventListener("click", event => { if (event.target instanceof Element && event.target.closest("button.stage-forward")) event.stopImmediatePropagation(); }, true);\n',
      };
      for (const [slug, id] of [
        ["look-equal-prompt", "equal001"],
        ["look-stuck", "stuck001"],
        ["look-refused", "refused1"],
      ] as const) {
        files[`artifacts/${slug}/index.mdx`] = [
          ...frontmatter(id, slug),
          'import Stage from "@artifactory/design-system/stage";',
          "",
          "## Three steps",
          "",
          '<Stage build="sequence" choose={{label:"Choose",options:["A","B"]}} prompt="Choose an option." caption="Literal Stage evidence.">',
          "",
          "| Value |",
          "| --- |",
          "| 1 |",
          "",
          "</Stage>",
          "",
          ...(slug === "look-stuck" ? ['<script src="/block-stage-forward.js"></script>'] : []),
          "",
        ].join("\n");
        files[`artifacts/${slug}/sequence.build.ts`] = [
          'import { defineBuild } from "@artifactory/design-system/stage-build";',
          slug === "look-refused"
            ? 'export default defineBuild({ steps() { throw new Error("Literal deliberate refusal"); } });'
            : 'export default defineBuild({ steps: () => [{ say: "Choose an option." }, { say: "Second step." }, { say: "Third step." }] });',
          "",
        ].join("\n");
      }
      repo = await createFixtureRepo(files);
    });
    afterAll(async () => {
      await repo.remove();
    });
    it.each(["look-equal-prompt", "look-stuck", "look-refused"])(
      "records all Stage steps or an explicit failure/refusal through pnpm look: %s",
      async (slug) => {
        const result = await look(repo, slug);
        expect(result.exitCode, result.output).toBe(slug === "look-stuck" ? 1 : 0);
        expect(result.report.cases.map((test) => test.id)).toEqual(["look-393", "look-1920"]);
        for (const test of result.report.cases) {
          const width = test.id === "look-393" ? 393 : 1920;
          if (slug === "look-stuck") {
            expect(test.outcome).toBe("failed");
            expect(test.assertions).toContainEqual({
              name: `01-stage-choose-step-1-${String(width)}.png: advancement`,
              expected: "2",
              actual: "1",
              passed: false,
            });
          } else {
            expect(test.outcome).toBe(
              slug === "look-refused" ? "refused" : "captured-awaiting-visual-review",
            );
            expect(test.assertions.every((assertion) => assertion.passed)).toBe(true);
            expect(test.captures).toEqual([
              `01-stage-choose-as-written-${String(width)}.png`,
              ...(slug === "look-refused"
                ? [`01-stage-choose-refused-${String(width)}.png`]
                : [
                    `01-stage-choose-step-1-${String(width)}.png`,
                    `01-stage-choose-step-2-${String(width)}.png`,
                    `01-stage-choose-step-3-${String(width)}.png`,
                  ]),
            ]);
          }
        }
      },
      checkTimeout,
    );
  },
);

describe.skipIf(process.env.ARTIFACTORY_BROWSER_ACCEPTANCE !== "1")(
  "opt-in Look Stepper evidence",
  () => {
    let repo: FixtureRepo;
    const code = ["```ts", "const radius = 2;", "const area = radius * radius;", "```"];
    beforeAll(async () => {
      repo = await createFixtureRepo({
        "artifacts/look-code-stepper/index.mdx": [
          ...frontmatter("codestp1", "look-code-stepper"),
          'import Stepper from "@artifactory/design-system/stepper";',
          "",
          "## Code read a line at a time",
          "",
          '<Stepper lines={["1", "2"]} captions={["Literal radius.", "Literal area."]}>',
          "",
          ...code,
          "",
          "</Stepper>",
          "",
          '<Stepper lines={["1", "2"]}>',
          "",
          ...code,
          "",
          "</Stepper>",
          "",
        ].join("\n"),
        "artifacts/look-nothing/index.mdx": [
          ...frontmatter("nothing1", "look-nothing"),
          "## Prose and plain code",
          "",
          "This literal paragraph sits above a code block that no Stepper holds.",
          "",
          ...code,
          "",
        ].join("\n"),
      });
    });
    afterAll(async () => {
      await repo.remove();
    });
    it(
      "shoots a one-block code Stepper at every step, printing its captions in place of an alt",
      async () => {
        const result = await look(repo, "look-code-stepper");
        expect(result.exitCode, result.output).toBe(0);
        const captures = (width: number) =>
          ["01-stepper", "02-stepper"].flatMap((name) =>
            [1, 2].map((step) => `${name}-step-${String(step)}-${String(width)}.png`),
          );
        const printed = (name: string) =>
          [...captures(393), ...captures(1920)]
            .filter((file) => file.startsWith(name))
            .map((file) => `  .look/look-code-stepper/${file}`);
        expect(result.output).toContain(
          [
            '01-stepper: no drawing; captions, one per step: "Literal radius.", "Literal area."',
            ...printed("01-stepper"),
            "",
            "02-stepper: no drawing and no caption",
            ...printed("02-stepper"),
          ].join("\n"),
        );
        expect(
          result.report.cases.map(({ id, outcome, captures }) => ({ id, outcome, captures })),
        ).toEqual(
          [393, 1920].map((width) => ({
            id: `look-${String(width)}`,
            outcome: "captured-awaiting-visual-review",
            captures: captures(width),
          })),
        );
      },
      checkTimeout,
    );
    it(
      "ends on a line saying an artifact of prose and plain code has nothing for look to shoot",
      async () => {
        const result = await look(repo, "look-nothing");
        expect(result.exitCode, result.output).toBe(0);
        expect(result.stdout.trimEnd().split("\n").at(-1)).toBe(
          "pnpm look: artifacts/look-nothing/index.mdx has nothing for look to shoot",
        );
        expect(result.report.cases.map(({ id, outcome }) => ({ id, outcome }))).toEqual([
          { id: "look-393", outcome: "not-applicable" },
          { id: "look-1920", outcome: "not-applicable" },
        ]);
      },
      checkTimeout,
    );
  },
);

describe.skipIf(process.env.ARTIFACTORY_BROWSER_ACCEPTANCE !== "1")(
  "opt-in Look fixed-layer evidence",
  () => {
    let repo: FixtureRepo;
    beforeAll(async () => {
      const paragraph =
        "This literal paragraph makes the page taller than the phone viewport, so the bar can slide in.\n";
      repo = await createFixtureRepo({
        "public/slide-bar-in.js": [
          'addEventListener("load", () => {',
          "  if (innerWidth > 600) return;",
          '  const stepper = document.querySelector("artifact-stepper");',
          '  const bar = document.querySelector(".artifact-bar");',
          "  const target = scrollY + stepper.getBoundingClientRect().bottom - innerHeight + bar.offsetHeight / 2;",
          '  dispatchEvent(new KeyboardEvent("keydown"));',
          "  scrollTo(0, target + 400);",
          "  setTimeout(() => scrollTo(0, target), 150);",
          "});",
          "",
        ].join("\n"),
        "artifacts/look-bar/steps.svg": [
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 300">',
          '<rect class="stroke-text" x="20" y="20" width="320" height="260" fill="none" stroke-width="2"/>',
          '<circle data-step="2-" class="stroke-text" cx="180" cy="150" r="60" fill="none" stroke-width="2"/>',
          "</svg>",
          "",
        ].join("\n"),
        "artifacts/look-bar/index.mdx": [
          ...frontmatter("lookbar1", "look-bar"),
          'import Stepper from "@artifactory/design-system/stepper";',
          'import steps from "./steps.svg?raw";',
          "",
          "## Before",
          "",
          ...Array.from({ length: 12 }, () => paragraph),
          "## Stepper",
          "",
          '<Stepper figure={steps} alt="A literal box, then a circle inside it." captions={["The box.", "The circle."]} />',
          "",
          "## After",
          "",
          ...Array.from({ length: 24 }, () => paragraph),
          '<script src="/slide-bar-in.js"></script>',
          "",
        ].join("\n"),
      });
    });
    afterAll(async () => {
      await repo.remove();
    });
    it(
      "hides the slid-in bar for every shot of a Stepper under it, then shows it again",
      async () => {
        const result = await look(repo, "look-bar");
        expect(result.exitCode, result.output).toBe(0);
        const phone = result.report.cases.find((test) => test.id === "look-393");
        expect(phone?.outcome).toBe("captured-awaiting-visual-review");
        expect(phone?.assertions.every((assertion) => assertion.passed)).toBe(true);
        const files = ["01-stepper-step-1-393.png", "01-stepper-step-2-393.png"];
        expect(phone?.captures).toEqual(files);
        for (const file of files) {
          const barStates = (phone?.assertions ?? [])
            .filter((assertion) => assertion.name.startsWith(`${file}: `))
            .flatMap((assertion) =>
              Array.isArray(assertion.actual) ? (assertion.actual as unknown[]) : [],
            )
            .filter((state) => JSON.stringify(state).includes("artifact-bar"));
          expect(barStates).toEqual([
            expect.objectContaining({ opacity: "0" }),
            expect.objectContaining({ opacity: "1" }),
          ]);
        }
      },
      checkTimeout,
    );
  },
);

describe.skipIf(process.env.ARTIFACTORY_BROWSER_ACCEPTANCE !== "1")(
  "opt-in Look model answer evidence",
  () => {
    let repo: FixtureRepo;
    beforeAll(async () => {
      repo = await createFixtureRepo({
        "artifacts/look-model-answer/circle.svg":
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" class="stroke-accent" fill="none" stroke-width="4"/></svg>\n',
        "artifacts/look-model-answer/index.mdx": [
          ...frontmatter("modelans", "look-model-answer"),
          'import Figure from "@artifactory/design-system/figure";',
          'import NumericQuestion from "@artifactory/design-system/numeric-question";',
          'import OpenQuestion from "@artifactory/design-system/open-question";',
          'import circle from "./circle.svg?raw";',
          "",
          "## Questions",
          "",
          '<NumericQuestion id="one-plus-one" answer="2">',
          "",
          "What is one plus one?",
          "",
          "</NumericQuestion>",
          "",
          '<OpenQuestion id="draw-a-circle">',
          "",
          "Draw a circle.",
          "",
          "---",
          "",
          "A circle:",
          "",
          '<Figure src={circle} alt="Literal circle of radius forty." />',
          "",
          "</OpenQuestion>",
          "",
        ].join("\n"),
      });
    });
    afterAll(async () => {
      await repo.remove();
    });
    it(
      "reveals a figure inside a model answer to shoot it, names its question, then closes the model answer",
      async () => {
        const result = await look(repo, "look-model-answer");
        expect(result.exitCode, result.output).toBe(0);
        expect(result.output).toContain(
          [
            "01-figure (inside the model answer of Question 2): Literal circle of radius forty.",
            "  .look/look-model-answer/01-figure-393.png",
            "  .look/look-model-answer/01-figure-1920.png",
          ].join("\n"),
        );
        for (const width of [393, 1920]) {
          const test = result.report.cases.find(({ id }) => id === `look-${String(width)}`);
          expect(test?.outcome).toBe("captured-awaiting-visual-review");
          expect(test?.captures).toEqual([`01-figure-${String(width)}.png`]);
          expect(test?.assertions).toContainEqual({
            name: "01-figure: model answer closed again",
            expected: false,
            actual: false,
            passed: true,
          });
          expect(test?.observed.figures).toContainEqual(
            expect.objectContaining({
              name: "01-figure",
              location: "inside the model answer of Question 2",
            }),
          );
        }
      },
      checkTimeout,
    );
  },
);

describe.skipIf(process.env.ARTIFACTORY_BROWSER_ACCEPTANCE !== "1")(
  "opt-in Look failure evidence",
  () => {
    let repo: FixtureRepo;
    const square =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" class="stroke-accent" fill="none" stroke-width="4"/></svg>\n';
    beforeAll(async () => {
      repo = await createFixtureRepo({
        "public/keep-unrendered.js": [
          'addEventListener("DOMContentLoaded", () => {',
          '  const [, flat] = document.querySelectorAll("main > figure.figure");',
          '  flat.style.cssText = "height: 0; min-height: 0; padding: 0; border: 0; overflow: hidden";',
          '  document.querySelector(".question-model-answer figure").style.display = "none";',
          "});",
          "",
        ].join("\n"),
        "artifacts/look-unrendered/square.svg": square,
        "artifacts/look-unrendered/index.mdx": [
          ...frontmatter("unrender", "look-unrendered"),
          'import Figure from "@artifactory/design-system/figure";',
          'import OpenQuestion from "@artifactory/design-system/open-question";',
          'import square from "./square.svg?raw";',
          "",
          "## Figures",
          "",
          '<Figure src={square} alt="Literal shown square." />',
          "",
          '<Figure src={square} alt="Literal flattened square." />',
          "",
          '<OpenQuestion id="draw-a-square">',
          "",
          "Draw a square.",
          "",
          "---",
          "",
          '<Figure src={square} alt="Literal hidden square." />',
          "",
          "</OpenQuestion>",
          "",
          '<script src="/keep-unrendered.js"></script>',
          "",
        ].join("\n"),
        "public/disguise-stepper.js": [
          'addEventListener("DOMContentLoaded", () => {',
          '  document.querySelector(".stepper-figure").className = "stepper-stage stepper-unfamiliar";',
          "});",
          "",
        ].join("\n"),
        "artifacts/look-unknown-stepper/steps.svg": [
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
          '<rect class="stroke-text" x="10" y="10" width="80" height="80" fill="none" stroke-width="2"/>',
          '<circle data-step="2-" class="stroke-text" cx="50" cy="50" r="20" fill="none" stroke-width="2"/>',
          "</svg>",
          "",
        ].join("\n"),
        "artifacts/look-unknown-stepper/index.mdx": [
          ...frontmatter("unknownf", "look-unknown-stepper"),
          'import Stepper from "@artifactory/design-system/stepper";',
          'import steps from "./steps.svg?raw";',
          "",
          "## Stepper",
          "",
          '<Stepper figure={steps} alt="Literal box, then a circle inside it." captions={["The box.", "The circle."]} />',
          "",
          '<script src="/disguise-stepper.js"></script>',
          "",
        ].join("\n"),
      });
    });
    afterAll(async () => {
      await repo.remove();
    });
    it(
      "fails the case on every item still unrendered when its turn comes, naming each, and shoots none of them",
      async () => {
        const result = await look(repo, "look-unrendered");
        expect(result.exitCode, result.output).toBe(1);
        for (const width of [393, 1920]) {
          const id = `look-${String(width)}`;
          const test = result.report.cases.find((test) => test.id === id);
          expect(test?.outcome).toBe("failed");
          expect(test?.captures).toEqual([`01-figure-${String(width)}.png`]);
          expect(test?.assertions).toContainEqual({
            name: "02-figure: look can shoot it",
            expected: {
              place: "Figure 1.2",
              kind: "figure",
              description: "Literal flattened square.",
              problem: null,
            },
            actual: {
              place: "Figure 1.2",
              kind: "figure",
              description: "Literal flattened square.",
              problem: "not rendered (its box has no size)",
            },
            passed: false,
          });
          expect(test?.assertions).toContainEqual({
            name: "03-figure: look can shoot it",
            expected: {
              place: "inside the model answer of Question 1",
              kind: "figure",
              description: "Literal hidden square.",
              problem: null,
            },
            actual: {
              place: "inside the model answer of Question 1",
              kind: "figure",
              description: "Literal hidden square.",
              problem: "not rendered after its reveal (checkVisibility() is false)",
            },
            passed: false,
          });
          expect(test?.assertions).toContainEqual({
            name: "03-figure: model answer closed again",
            expected: false,
            actual: false,
            passed: true,
          });
          expect(result.output).toContain(
            `pnpm look: ${id}: couldn't shoot 02-figure (Figure 1.2), a figure: not rendered (its box has no size); Literal flattened square.`,
          );
          expect(result.output).toContain(
            `pnpm look: ${id}: couldn't shoot 03-figure (inside the model answer of Question 1), a figure: not rendered after its reveal (checkVisibility() is false); Literal hidden square.`,
          );
        }
        expect(result.output).not.toContain(".look/look-unrendered/02-figure");
        expect(result.output).not.toContain(".look/look-unrendered/03-figure");
      },
      checkTimeout,
    );
    it(
      "fails the case on a Stepper whose form look doesn't know, naming it, and never shoots it as a known form",
      async () => {
        const result = await look(repo, "look-unknown-stepper");
        expect(result.exitCode, result.output).toBe(1);
        for (const width of [393, 1920]) {
          const id = `look-${String(width)}`;
          const test = result.report.cases.find((test) => test.id === id);
          expect(test?.outcome).toBe("failed");
          expect(test?.captures).toEqual([]);
          expect(test?.assertions).toContainEqual({
            name: "01-stepper: look can shoot it",
            expected: {
              place: "",
              kind: "stepper-unknown",
              description: "Literal box, then a circle inside it.",
              problem: null,
            },
            actual: {
              place: "",
              kind: "stepper-unknown",
              description: "Literal box, then a circle inside it.",
              problem: "a Stepper form look doesn't know",
            },
            passed: false,
          });
          expect(result.output).toContain(
            `pnpm look: ${id}: couldn't shoot 01-stepper, a stepper-unknown: a Stepper form look doesn't know; Literal box, then a circle inside it.`,
          );
        }
        expect(result.output).not.toContain("has nothing for look to shoot");
      },
      checkTimeout,
    );
  },
);
