// @vitest-environment happy-dom
import "@artifactory/design-system/library-revisit";
import paintFromKeptCopy from "@artifactory/design-system/library-revisit-paint?raw";
import {
  keptSummariesKey,
  memoryLibraryTransport,
  startLibraryStatuses,
  type LibraryStatuses,
} from "@artifactory/design-system/library-statuses";
import {
  libraryQuestionsBlock,
  type LibraryQuestions,
} from "@artifactory/design-system/question-markers";
import type { Mark, Summary } from "@artifactory/design-system/scoring";
import type { Window as HappyWindow } from "happy-dom";
import { afterEach, expect, test, vi } from "vitest";

const buildId = "5b7e2c90-1f4a-4d38-a6e1-0c9d8b7a6f52";

const powerRuleSection = "A derivada de <math><msup><mi>x</mi><mi>n</mi></msup></math>";

function summary(marks: Record<string, Mark>, total: number): Summary {
  const answered = Object.keys(marks).length;
  return {
    marks,
    progress: { answered, total },
    score: Object.values(marks).filter((mark) => mark === "right").length,
    finished: answered === total,
  };
}

const listedQuestions: LibraryQuestions[] = [
  {
    artifactId: "e1g3nv4l",
    questions: [{ id: "spring-frequency", number: 1, section: "Oscillations" }],
  },
  { artifactId: "l1m1t3s1", questions: [{ id: "limite-de-1-sobre-x", number: 1 }] },
  {
    artifactId: "d3r1v4d4",
    questions: [
      { id: "regra-da-potencia", number: 1 },
      { id: "por-que-2x", number: 2, section: powerRuleSection },
      { id: "regra-da-cadeia", number: 3, section: "Regra da cadeia" },
    ],
  },
];

function mountLibrary(block = listedQuestions) {
  const template = document.createElement("template");
  template.innerHTML = `
    <main class="page">
      <ol class="library-list">
        <li class="library-row" data-artifact-id="e1g3nv4l" data-subject="Linear Algebra"><a class="library-title" href="/eigenvalues/" lang="en">Eigenvalues</a></li>
        <li class="library-row" data-artifact-id="l1m1t3s1" data-subject="Cálculo"><a class="library-title" href="/limites/" lang="pt-BR">Limites</a></li>
        <li class="library-row" data-artifact-id="b4s3sn1t" data-subject="Bioquímica"><a class="library-title" href="/bases-nitrogenadas/" lang="pt-BR">Bases nitrogenadas</a></li>
        <li class="library-row" data-artifact-id="d3r1v4d4" data-subject="Cálculo"><a class="library-title" href="/derivadas/" lang="pt-BR">Derivadas</a></li>
      </ol>
      <library-revisit></library-revisit>
    </main>
    ${libraryQuestionsBlock(block)}`;
  document.body.append(template.content);
}

function shown() {
  const section = document.querySelector("library-revisit > section");
  if (section === null) return null;
  return {
    heading: section.querySelector("h2")?.textContent,
    groups: [...section.querySelectorAll("ol")].map((list) => {
      const title = document.getElementById(list.getAttribute("aria-labelledby") ?? "");
      return {
        title: title?.textContent,
        lang: title?.getAttribute("lang"),
        heading: title?.localName,
        rows: [...list.querySelectorAll("li")].map((row) => {
          const section = row.querySelector("span");
          return {
            link: row.querySelector("a")?.textContent,
            href: row.querySelector("a")?.getAttribute("href"),
            section: section?.innerHTML,
            sectionLang: section?.getAttribute("lang"),
          };
        }),
      };
    }),
  };
}

const derivativesWrong = {
  title: "Derivadas",
  lang: "pt-BR",
  heading: "h3",
  rows: [
    {
      link: "Question 1",
      href: "/derivadas/#q-regra-da-potencia",
      section: undefined,
      sectionLang: undefined,
    },
    {
      link: "Question 3",
      href: "/derivadas/#q-regra-da-cadeia",
      section: "Regra da cadeia",
      sectionLang: "pt-BR",
    },
  ],
};

function openLibrary(summaries: Record<string, Summary>, block = listedQuestions) {
  const transport = memoryLibraryTransport({ buildId, summaries });
  const statuses = startLibraryStatuses({ buildId, transport });
  mountLibrary(block);
  return { transport, statuses };
}

async function loaded(statuses: LibraryStatuses) {
  await vi.waitFor(() => {
    expect(statuses.loaded).toBe(true);
  });
}

function reloadedOnVisibilityChange(statuses: LibraryStatuses) {
  const reloaded = new Promise<void>((resolve) => {
    const stop = statuses.subscribe(() => {
      stop();
      resolve();
    });
  });
  document.dispatchEvent(new Event("visibilitychange"));
  return reloaded;
}

function openLibraryBeforeLoad(summaries: Record<string, Summary>) {
  const transport = memoryLibraryTransport({ buildId, summaries });
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const statuses = startLibraryStatuses({
    buildId,
    transport: { load: () => released.then(() => transport.load()) },
  });
  mountLibrary();
  return { transport, statuses, release };
}

// Runs the inline script LibraryLayout writes after the Library questions block, as the page does.
function paintedFromKeptCopy(kept: string | null) {
  if (kept !== null) localStorage.setItem(keptSummariesKey, kept);
  (window as unknown as HappyWindow).happyDOM.settings.enableJavaScriptEvaluation = true;
  const script = document.createElement("script");
  script.dataset.keptSummariesKey = keptSummariesKey;
  script.textContent = paintFromKeptCopy;
  document.body.append(script);
  return document.querySelector("library-revisit");
}

afterEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
});

test("what to revisit lists each artifact's wrong questions under its title, in the Library's order, linking to each question with its number and section", async () => {
  const { statuses } = openLibrary({
    d3r1v4d4: summary(
      { "regra-da-potencia": "wrong", "por-que-2x": "wrong", "regra-da-cadeia": "wrong" },
      3,
    ),
    e1g3nv4l: summary({ "spring-frequency": "wrong" }, 1),
  });

  await loaded(statuses);

  expect(shown()).toEqual({
    heading: "To revisit",
    groups: [
      {
        title: "Eigenvalues",
        lang: "en",
        heading: "h3",
        rows: [
          {
            link: "Question 1",
            href: "/eigenvalues/#q-spring-frequency",
            section: "Oscillations",
            sectionLang: "en",
          },
        ],
      },
      {
        ...derivativesWrong,
        rows: [
          derivativesWrong.rows[0],
          {
            link: "Question 2",
            href: "/derivadas/#q-por-que-2x",
            section: powerRuleSection,
            sectionLang: "pt-BR",
          },
          derivativesWrong.rows[1],
        ],
      },
    ],
  });
});

test("each group carries its artifact's subject, which the subject filter narrows by", async () => {
  const { statuses } = openLibrary({
    d3r1v4d4: summary({ "regra-da-potencia": "wrong" }, 3),
    e1g3nv4l: summary({ "spring-frequency": "wrong" }, 1),
  });

  await loaded(statuses);

  expect(
    [...document.querySelectorAll(".library-revisit-group")].map((group) => [
      group.querySelector("h3")?.textContent,
      group.getAttribute("data-subject"),
    ]),
  ).toEqual([
    ["Eigenvalues", "Linear Algebra"],
    ["Derivadas", "Cálculo"],
  ]);
});

test("right and unanswered questions, artifacts with nothing wrong, and questions or artifacts the page doesn't list are left out", async () => {
  const { statuses } = openLibrary({
    d3r1v4d4: summary(
      { "regra-da-potencia": "wrong", "por-que-2x": "right", "regra-da-cadeia": "wrong" },
      4,
    ),
    l1m1t3s1: summary({ "limite-de-1-sobre-x": "right" }, 1),
    e1g3nv4l: summary({ "a-removed-question": "wrong" }, 1),
    n0tl1st3: summary({ elsewhere: "wrong" }, 1),
  });

  await loaded(statuses);

  expect(shown()).toEqual({ heading: "To revisit", groups: [derivativesWrong] });
});

test("nothing is drawn before the first load", async () => {
  const { release } = openLibraryBeforeLoad({
    d3r1v4d4: summary({ "regra-da-potencia": "wrong" }, 3),
  });

  expect(shown()).toBeNull();
  release();

  await vi.waitFor(() => {
    expect(shown()?.groups).toHaveLength(1);
  });
});

test.each([
  {
    nothing: "every answer is right",
    summaries: { l1m1t3s1: summary({ "limite-de-1-sobre-x": "right" }, 1) },
    block: listedQuestions,
  },
  { nothing: "no artifact has an attempt", summaries: {}, block: listedQuestions },
  {
    nothing: "no listed artifact has questions",
    summaries: { d3r1v4d4: summary({ "regra-da-potencia": "wrong" }, 3) },
    block: [],
  },
])("nothing is drawn when $nothing", async ({ summaries, block }) => {
  const { statuses } = openLibrary(summaries, block);

  await loaded(statuses);

  expect(document.querySelector("library-revisit")?.childElementCount).toBe(0);
});

test("a load that finds a newer attempt removes and adds rows in place", async () => {
  const { transport, statuses } = openLibrary({
    d3r1v4d4: summary({ "regra-da-potencia": "wrong", "regra-da-cadeia": "wrong" }, 3),
  });
  await loaded(statuses);
  transport.summaries.d3r1v4d4 = summary({ "regra-da-potencia": "right" }, 3);
  transport.summaries.e1g3nv4l = summary({ "spring-frequency": "wrong" }, 1);

  document.dispatchEvent(new Event("visibilitychange"));

  await vi.waitFor(() => {
    expect(shown()?.groups).toEqual([
      {
        title: "Eigenvalues",
        lang: "en",
        heading: "h3",
        rows: [
          {
            link: "Question 1",
            href: "/eigenvalues/#q-spring-frequency",
            section: "Oscillations",
            sectionLang: "en",
          },
        ],
      },
    ]);
  });
  transport.summaries.e1g3nv4l = summary({ "spring-frequency": "right" }, 1);
  document.dispatchEvent(new Event("visibilitychange"));
  await vi.waitFor(() => {
    expect(shown()).toBeNull();
  });
});

test.each(["load fails", "signed out"] as const)(
  "a reload that comes back %s leaves what to revisit as it was",
  async (outcome) => {
    const { transport, statuses } = openLibrary({
      d3r1v4d4: summary({ "regra-da-potencia": "wrong", "regra-da-cadeia": "wrong" }, 3),
    });
    await loaded(statuses);
    transport.summaries.d3r1v4d4 = summary({ "regra-da-potencia": "right" }, 3);
    transport.forced.add(outcome);

    await reloadedOnVisibilityChange(statuses);

    expect(shown()).toEqual({ heading: "To revisit", groups: [derivativesWrong] });
  },
);

const keptWrong = {
  d3r1v4d4: summary(
    { "regra-da-potencia": "wrong", "por-que-2x": "wrong", "regra-da-cadeia": "wrong" },
    3,
  ),
  e1g3nv4l: summary({ "spring-frequency": "wrong" }, 1),
};

const sectionFromKeptWrong =
  '<section class="page-close"><div><h2 class="page-close-heading">To revisit</h2>' +
  '<div class="library-revisit-group" data-artifact-id="e1g3nv4l" data-subject="Linear Algebra">' +
  '<h3 class="library-revisit-title" id="library-revisit-e1g3nv4l" lang="en">Eigenvalues</h3>' +
  '<ol class="revisit-list" aria-labelledby="library-revisit-e1g3nv4l">' +
  '<li><a href="/eigenvalues/#q-spring-frequency">Question 1</a><span lang="en">Oscillations</span></li>' +
  "</ol></div>" +
  '<div class="library-revisit-group" data-artifact-id="d3r1v4d4" data-subject="Cálculo">' +
  '<h3 class="library-revisit-title" id="library-revisit-d3r1v4d4" lang="pt-BR">Derivadas</h3>' +
  '<ol class="revisit-list" aria-labelledby="library-revisit-d3r1v4d4">' +
  '<li><a href="/derivadas/#q-regra-da-potencia">Question 1</a></li>' +
  '<li><a href="/derivadas/#q-por-que-2x">Question 2</a><span lang="pt-BR">A derivada de <math><msup><mi>x</mi><mi>n</mi></msup></math></span></li>' +
  '<li><a href="/derivadas/#q-regra-da-cadeia">Question 3</a><span lang="pt-BR">Regra da cadeia</span></li>' +
  "</ol></div></div></section>";

test("this device's copy paints what to revisit before the load, and a load that agrees leaves it as it is", async () => {
  const { statuses, release } = openLibraryBeforeLoad(keptWrong);

  const revisit = paintedFromKeptCopy(JSON.stringify(keptWrong));
  const painted = revisit?.firstElementChild;

  expect(revisit?.innerHTML).toBe(sectionFromKeptWrong);
  release();
  await loaded(statuses);
  expect(revisit?.firstElementChild).toBe(painted);
  expect(revisit?.querySelector("li")).toBe(painted?.querySelector("li"));
  expect(revisit?.innerHTML).toBe(sectionFromKeptWrong);
});

test("a load that differs from this device's copy corrects the painted section in place", async () => {
  const { statuses, release } = openLibraryBeforeLoad({
    d3r1v4d4: summary({ "regra-da-potencia": "wrong", "regra-da-cadeia": "wrong" }, 3),
    e1g3nv4l: summary({ "spring-frequency": "right" }, 1),
  });
  const revisit = paintedFromKeptCopy(JSON.stringify(keptWrong));
  expect(revisit?.innerHTML).toBe(sectionFromKeptWrong);

  release();
  await loaded(statuses);

  expect(shown()).toEqual({ heading: "To revisit", groups: [derivativesWrong] });
  expect(document.querySelectorAll("library-revisit")).toHaveLength(1);
  expect(revisit?.isConnected).toBe(true);
});

test.each(["load fails", "signed out"] as const)(
  "a first load that comes back %s leaves the section painted from this device's copy",
  async (outcome) => {
    const { transport, statuses, release } = openLibraryBeforeLoad({});
    transport.forced.add(outcome);
    paintedFromKeptCopy(JSON.stringify(keptWrong));
    const notified = new Promise<void>((resolve) => {
      statuses.subscribe(resolve);
    });

    release();
    await notified;

    expect(document.querySelector("library-revisit")?.innerHTML).toBe(sectionFromKeptWrong);
  },
);

test.each([
  { copy: "no copy", kept: null },
  { copy: "a copy that can't be read", kept: "{not json" },
  { copy: "a copy that isn't an object", kept: "[1]" },
  { copy: "a copy with marks that aren't an object", kept: '{"d3r1v4d4":{"marks":"wrong"}}' },
  {
    copy: "a copy with nothing wrong",
    kept: JSON.stringify({ d3r1v4d4: summary({ "regra-da-potencia": "right" }, 3) }),
  },
])("$copy paints nothing, and the load fills the section in", async ({ kept }) => {
  const { statuses, release } = openLibraryBeforeLoad({
    d3r1v4d4: summary({ "regra-da-potencia": "wrong", "regra-da-cadeia": "wrong" }, 3),
  });

  const revisit = paintedFromKeptCopy(kept);

  expect(revisit?.childNodes).toHaveLength(0);
  release();
  await loaded(statuses);
  expect(shown()).toEqual({ heading: "To revisit", groups: [derivativesWrong] });
});

test("questions and artifacts the page doesn't list paint no row from this device's copy", () => {
  openLibraryBeforeLoad({});

  paintedFromKeptCopy(
    JSON.stringify({
      d3r1v4d4: summary(
        { "regra-da-potencia": "wrong", "por-que-2x": "right", "regra-da-cadeia": "wrong" },
        4,
      ),
      e1g3nv4l: summary({ "a-removed-question": "wrong" }, 1),
      n0tl1st3: summary({ elsewhere: "wrong" }, 1),
    }),
  );

  expect(shown()).toEqual({ heading: "To revisit", groups: [derivativesWrong] });
});
