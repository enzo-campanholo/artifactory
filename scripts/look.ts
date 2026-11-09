import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { ElementHandle, Page, SerializedAXNode } from "puppeteer-core";
import { kebabCase } from "../src/artifacts.ts";
import {
  assertCase,
  browserCase,
  capture,
  failCase,
  lookViewports,
  outputIdentity,
  preparePage,
  ready,
  required,
  startBrowser,
  writeReport,
  type BrowserCase,
  type BrowserReport,
} from "./browser-session.ts";

type Kind =
  | "stepper-boards"
  | "stepper-lines"
  | "stepper-blocks"
  | "stepper-figure"
  | "stepper-unknown"
  | "stage-input"
  | "stage-choose"
  | "stage-unknown"
  | "diagram"
  | "figure";

// The caption's number, "" when it shows none, or where an item without one sits.
type Place = { number: string } | { location: string };

interface Item {
  element: ElementHandle;
  kind: Kind;
  name: string;
  place: Place;
  modelAnswer?: ElementHandle<HTMLDetailsElement>;
}

interface Shooting {
  page: Page;
  test: BrowserCase;
  item: Item;
  width: number;
}

interface Shots {
  files: string[];
  summary?: string;
}

interface ShotProblem {
  problem: string;
}

interface Stepping {
  forward: string;
  current: string;
}

const stepperStepping: Stepping = {
  forward: "button.stepper-forward",
  current: ".stepper-current",
};
const stageStepping: Stepping = { forward: "button.stage-forward", current: ".stage-current" };

// An item takes the first kind whose `element` it is and whose `marks` it holds, so each form
// comes before its family's unknown one. A form look doesn't know is never shot as one it does:
// its kind names a problem in place of `takeShots`. A Stage is shot by its `figure`, which holds
// its caption and number.
const kinds: Record<
  Kind,
  {
    element: string;
    marks: string[];
    shotPart?: string;
    stem: string;
    describe: (item: Item) => Promise<string>;
  } & ({ takeShots: (shooting: Shooting) => Promise<Shots> } | ShotProblem)
> = {
  "stepper-boards": {
    element: "artifact-stepper",
    marks: [".stepper-boards"],
    stem: "stepper",
    takeShots: shootStepper,
    describe: describeStepper,
  },
  "stepper-lines": {
    element: "artifact-stepper",
    marks: [".stepper-code"],
    stem: "stepper",
    takeShots: shootStepper,
    describe: describeStepper,
  },
  "stepper-blocks": {
    element: "artifact-stepper",
    marks: [".stepper-blocks"],
    stem: "stepper",
    takeShots: shootStepper,
    describe: describeStepper,
  },
  "stepper-figure": {
    element: "artifact-stepper",
    marks: [".stepper-figure"],
    stem: "stepper",
    takeShots: shootStepper,
    describe: describeStepper,
  },
  "stepper-unknown": {
    element: "artifact-stepper",
    marks: [],
    stem: "stepper",
    problem: "a Stepper form look doesn't know",
    describe: describeStepper,
  },
  "stage-input": {
    element: "artifact-stage",
    marks: [":scope > figure", ".stage-input"],
    shotPart: ":scope > figure",
    stem: "stage-input",
    takeShots: shootStage,
    describe: describeDrawing,
  },
  "stage-choose": {
    element: "artifact-stage",
    marks: [":scope > figure"],
    shotPart: ":scope > figure",
    stem: "stage-choose",
    takeShots: shootStage,
    describe: describeDrawing,
  },
  "stage-unknown": {
    element: "artifact-stage",
    marks: [],
    stem: "stage",
    problem: "a Stage form look doesn't know",
    describe: describeDrawing,
  },
  diagram: {
    element: "figure.diagram",
    marks: [],
    stem: "diagram",
    takeShots: shootOnce,
    describe: describeDrawing,
  },
  figure: {
    element: "figure.figure",
    marks: [],
    stem: "figure",
    takeShots: shootOnce,
    describe: describeDrawing,
  },
};

// Items are selected by element, never by what they hold, so a new Stepper form can't drop out of
// the shots unseen. A Stage's `figure` is also a `figure.figure`, so it's left out to count it once.
const itemElements = new Set(Object.values(kinds).map(({ element }) => element));
const itemSelector = `main :is(${[...itemElements].join(", ")}):not(artifact-stage > figure)`;

const root = process.cwd();
function fail(message: string): never {
  console.error(`pnpm look: ${message}`);
  process.exit(1);
}
const [slug, ...extra] = process.argv.slice(2);
if (slug === undefined || extra.length > 0) fail("usage: pnpm look <slug>");
const entry = `artifacts/${slug}/index.mdx`;
if (!kebabCase.test(slug) || !existsSync(join(root, entry)))
  fail(`there's no artifact at ${entry}`);
const folder = `.look/${slug}`;
await new Promise<void>((done, reject) => {
  spawn("astro", ["build"], { stdio: "inherit" })
    .on("error", reject)
    .on("exit", (code) => {
      if (code === 0) done();
      else reject(new Error("the build failed; `pnpm check` lists every failure"));
    });
}).catch((error: unknown) => fail(String(error)));
await rm(join(root, folder), { recursive: true, force: true });
const dist = resolve("dist");
const html = await readFile(join(dist, slug, "index.html"), "utf8");
const language = /<html\b[^>]*\blang=["']([^"']+)["']/.exec(html)?.[1] ?? "";
const report: BrowserReport = {
  schemaVersion: 1,
  output: await outputIdentity(dist),
  browser: { version: null },
  cases: [],
};
const screenshots = new Map<
  string,
  Place & { description: string; summary: string | undefined; files: string[] }
>();
let session: Awaited<ReturnType<typeof startBrowser>>;
try {
  session = await startBrowser(dist);
} catch (error) {
  const test = browserCase("browser-launch", `/${slug}/`, {
    viewport: lookViewports[0],
    language,
    media: "screen",
    colorScheme: "light",
    reducedMotion: "reduce",
    storage: "fresh-context",
    target: itemSelector,
  });
  test.outcome = "unavailable";
  test.assertions.push({
    name: "Chromium launch",
    expected: "available",
    actual: String(error),
    passed: false,
  });
  report.cases.push(test);
  await writeReport(folder, report);
  fail(`Chrome didn't start: ${String(error)}`);
}
try {
  report.browser.version = await session.browser.version();
  for (const viewport of lookViewports) {
    const test = browserCase(`look-${String(viewport.width)}`, `${session.origin}/${slug}/`, {
      viewport,
      language,
      media: "screen",
      colorScheme: "light",
      reducedMotion: "reduce",
      storage: "fresh-context",
      target: itemSelector,
    });
    report.cases.push(test);
    const context = await session.browser.createBrowserContext();
    try {
      const page = await context.newPage();
      await preparePage(page, test.requested);
      await ready(page, test);
      assertCase(test, "fresh theme storage", null, test.observed.storedTheme);
      const elements = await page.$$(itemSelector);
      if (elements.length === 0) test.outcome = "not-applicable";
      for (const [index, element] of elements.entries()) {
        const item = await resolveItem(page, test, element, index);
        const description = await kinds[item.kind].describe(item);
        const shots = await shootRevealed({ page, test, item, width: viewport.width });
        if ("problem" in shots) {
          couldNotShoot(test, item, description, shots.problem);
          continue;
        }
        screenshots.set(item.name, {
          ...item.place,
          description,
          summary: shots.summary,
          files: [...(screenshots.get(item.name)?.files ?? []), ...shots.files],
        });
      }
      test.observed.figures = [...screenshots].map(([name, details]) => ({ name, ...details }));
      if (test.outcome === "passed") test.outcome = "captured-awaiting-visual-review";
    } catch (error) {
      failCase(test, error);
      console.error(`pnpm look: ${test.id}: ${String(error)}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await session.close();
  await writeReport(folder, report);
}
if (screenshots.size > 0) {
  const widths = lookViewports.map(({ width }) => `${String(width)} px`).join(" and ");
  console.log(`\npnpm look: ${entry} at ${widths} wide`);
  for (const [name, { description, summary, files, ...place }] of screenshots) {
    console.log(`\n${withPlace(name, place)}: ${description}`);
    if (summary !== undefined) console.log(`  ${summary}`);
    for (const file of files) console.log(`  ${folder}/${file}`);
  }
}
console.log(
  `\npnpm look: ${folder}/results.json and ${folder}/contact-sheet.html; captures await human visual review`,
);
if (report.cases.every((test) => test.outcome === "not-applicable"))
  console.log(`\npnpm look: ${entry} has nothing for look to shoot`);
process.exitCode = report.cases.some((test) =>
  ["failed", "unavailable", "unsupported"].includes(test.outcome),
)
  ? 1
  : 0;

function placeText(place: Place): string {
  return "location" in place ? place.location : place.number;
}

function withPlace(name: string, place: Place): string {
  const text = placeText(place);
  return text === "" ? name : `${name} (${text})`;
}

// Every item look couldn't shoot is named, not only the first, so one run shows everything to fix.
function couldNotShoot(
  test: BrowserCase,
  { name, kind, place }: Item,
  description: string,
  problem: string,
): void {
  test.outcome = "failed";
  const named = { place: placeText(place), kind, description };
  test.assertions.push({
    name: `${name}: look can shoot it`,
    expected: { ...named, problem: null },
    actual: { ...named, problem },
    passed: false,
  });
  console.error(
    `pnpm look: ${test.id}: couldn't shoot ${withPlace(name, place)}, a ${kind}: ${problem}; ${description}`,
  );
}

async function resolveItem(
  page: Page,
  test: BrowserCase,
  selected: ElementHandle,
  index: number,
): Promise<Item> {
  const kind = await selected.evaluate(
    (node, forms) =>
      forms.find(
        ({ element, marks }) =>
          node.matches(element) && marks.every((mark) => node.querySelector(mark) !== null),
      )?.kind,
    (Object.keys(kinds) as Kind[]).map((kind) => ({
      kind,
      element: kinds[kind].element,
      marks: kinds[kind].marks,
    })),
  );
  if (kind === undefined) throw new Error(`item ${String(index + 1)} is of no kind look has`);
  const { shotPart, stem } = kinds[kind];
  const element = shotPart === undefined ? selected : ((await selected.$(shotPart)) ?? selected);
  const name = `${String(index + 1).padStart(2, "0")}-${stem}`;
  const modelAnswer = (
    await element.evaluateHandle((node) => node.closest("details.question-model-answer"))
  ).asElement() as ElementHandle<HTMLDetailsElement> | null;
  if (modelAnswer === null) return { element, kind, name, place: await numberOf(page, element) };
  const question = required(
    test,
    `${name}: question number`,
    (
      await modelAnswer.evaluateHandle((node) =>
        node.closest(".question")?.querySelector(".question-number"),
      )
    ).asElement(),
  );
  const location = `inside the model answer of ${await accessibleText(page, question)}`;
  return { element, kind, name, place: { location }, modelAnswer };
}

// A model answer opens only once an answer is written, so look opens it itself, on the build's
// throwaway state, and closes it again once its item is shot.
async function shootRevealed(shooting: Shooting): Promise<Shots | ShotProblem> {
  const { test, item } = shooting;
  const known = kinds[item.kind];
  if ("problem" in known) return { problem: known.problem };
  const shootRendered = async (after: string): Promise<Shots | ShotProblem> => {
    const unrendered = await item.element.evaluate((node) => {
      if (!node.checkVisibility()) return "checkVisibility() is false";
      const box = node.getBoundingClientRect();
      return box.width > 0 && box.height > 0 ? null : "its box has no size";
    });
    return unrendered === null
      ? known.takeShots(shooting)
      : { problem: `not rendered${after} (${unrendered})` };
  };
  if (item.modelAnswer === undefined) return shootRendered("");
  const { modelAnswer } = item;
  await toggle(modelAnswer, true);
  const shots = await shootRendered(" after its reveal");
  await toggle(modelAnswer, false);
  assertCase(
    test,
    `${item.name}: model answer closed again`,
    false,
    await modelAnswer.evaluate((node) => node.open),
  );
  return shots;
}

function toggle(details: ElementHandle<HTMLDetailsElement>, open: boolean): Promise<void> {
  return details.evaluate(
    (node, open) =>
      new Promise<void>((done) => {
        if (node.open === open) {
          done();
          return;
        }
        node.addEventListener(
          "toggle",
          () => {
            done();
          },
          { once: true },
        );
        node.open = open;
      }),
    open,
  );
}

function altOf(element: ElementHandle): Promise<string | null> {
  return element.evaluate(
    (node) => node.querySelector("svg[role='img']")?.getAttribute("aria-label") ?? null,
  );
}

function squashed(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// Code has no `alt`, so a code Stepper's captions say what each step shows in its place.
async function describeStepper({ element }: Item): Promise<string> {
  const alt = await altOf(element);
  if (alt !== null) return alt;
  const captions = await element.$$eval(".stepper-captions > p", (nodes) =>
    nodes.map((caption) => caption.textContent),
  );
  return captions.length === 0
    ? "no drawing and no caption"
    : `no drawing; captions, one per step: ${captions.map((caption) => `"${squashed(caption)}"`).join(", ")}`;
}

// A Stage of code or tables has no drawing, so no `alt`: its caption says what it shows.
async function describeDrawing({ element }: Item): Promise<string> {
  const alt = await altOf(element);
  if (alt !== null) return alt;
  const caption = await element.evaluate((node) => {
    const caption = node.querySelector(":scope > figcaption")?.cloneNode(true);
    if (!(caption instanceof Element)) return null;
    caption.querySelector(".figure-number")?.remove();
    return caption.textContent;
  });
  return caption === null
    ? "no drawing and no caption"
    : `no drawing; caption: ${squashed(caption)}`;
}

async function numberOf(page: Page, element: ElementHandle): Promise<Place> {
  const number = await element.$(":scope > figcaption .figure-number");
  return { number: number === null ? "" : await accessibleText(page, number) };
}

// Figure and question numbers are CSS counters, which only the rendered page knows, so they're
// read from the accessibility tree: the label, in the page's language, then the counter's pieces
// ("1", ".", "2") under one node.
async function accessibleText(page: Page, number: ElementHandle<Node>): Promise<string> {
  const textOf = (node: SerializedAXNode, separator: string): string =>
    node.role === "StaticText"
      ? (node.name ?? "")
      : (node.children ?? []).map((child) => textOf(child, "")).join(separator);
  const tree = await page.accessibility.snapshot({ root: number, interestingOnly: false });
  return tree === null ? "" : squashed(textOf(tree, " "));
}

// Layers are found by computed style, not class, so a new fixed layer can't get into the shots.
// Opacity keeps a sticky layer's room in the flow, so the item doesn't move between measuring and
// shooting, and unlike `visibility` a descendant can't opt back in.
async function shootAlone({ page, test, item }: Shooting, file: string): Promise<void> {
  const layout = () =>
    item.element.evaluate((node) => {
      const box = node.getBoundingClientRect();
      return {
        scroll: { x: scrollX, y: scrollY },
        item: { x: box.x + scrollX, y: box.y + scrollY, width: box.width, height: box.height },
      };
    });
  const before = await layout();
  const layers = await item.element.evaluateHandle((item) => {
    const found: (HTMLElement | SVGElement)[] = [];
    for (const node of document.body.querySelectorAll("*")) {
      if (!(node instanceof HTMLElement || node instanceof SVGElement)) continue;
      if (node.contains(item) || item.contains(node)) continue;
      if (found.some((layer) => layer.contains(node))) continue;
      if (["fixed", "sticky"].includes(getComputedStyle(node).position)) found.push(node);
    }
    return found;
  });
  const stateOf = () =>
    layers.evaluate((layers) =>
      layers.map((layer) => ({
        layer: [
          layer.localName,
          ...(layer.id === "" ? [] : [`#${layer.id}`]),
          ...[...layer.classList].map((name) => `.${name}`),
        ].join(""),
        opacity: getComputedStyle(layer).opacity,
        inline:
          `${layer.style.getPropertyValue("opacity")} ${layer.style.getPropertyPriority("opacity")}`.trim(),
      })),
    );
  const shown = await stateOf();
  const saved = await layers.evaluate((layers) =>
    layers.map((layer) => {
      const box = layer.getBoundingClientRect();
      const inView =
        box.width > 0 &&
        box.height > 0 &&
        box.bottom > 0 &&
        box.right > 0 &&
        box.top < innerHeight &&
        box.left < innerWidth;
      const had = {
        style: layer.hasAttribute("style"),
        value: layer.style.getPropertyValue("opacity"),
        priority: layer.style.getPropertyPriority("opacity"),
      };
      layer.style.setProperty("opacity", "0", "important");
      return { inView, had };
    }),
  );
  const hidden = await stateOf();
  const hiddenLayers = (test.observed.hiddenLayers ?? []) as unknown[];
  hiddenLayers.push({
    file,
    layers: hidden.map(({ layer }, index) => ({ layer, inView: saved[index]?.inView })),
  });
  test.observed.hiddenLayers = hiddenLayers;
  assertCase(
    test,
    `${file}: layers hidden`,
    hidden.map(({ layer }) => ({ layer, opacity: "0" })),
    hidden.map(({ layer, opacity }) => ({ layer, opacity })),
  );
  assertCase(test, `${file}: layout kept while layers hidden`, before, await layout());
  await capture(page, test, folder, file, item.element);
  await layers.evaluate((layers, saved) => {
    for (const [index, layer] of layers.entries()) {
      const had = saved[index]?.had;
      if (had === undefined) continue;
      if (had.value === "") layer.style.removeProperty("opacity");
      else layer.style.setProperty("opacity", had.value, had.priority);
      if (!had.style && layer.getAttribute("style") === "") layer.removeAttribute("style");
    }
  }, saved);
  assertCase(test, `${file}: hidden layers restored`, shown, await stateOf());
  await layers.dispose();
}

async function shootOnce(shooting: Shooting): Promise<Shots> {
  const { item, width } = shooting;
  return { files: await shootSteps(shooting, 1, () => `${item.name}-${String(width)}.png`) };
}

// A stepper is shot once per step, with its buttons and caption, the way the owner sees each step.
async function shootStepper(shooting: Shooting): Promise<Shots> {
  const { item, width } = shooting;
  const steps = await item.element.evaluate((node) =>
    Number(node.getAttribute("data-count") ?? "1"),
  );
  return {
    files: await shootSteps(
      shooting,
      steps,
      (step) => `${item.name}${steps > 1 ? `-step-${String(step)}` : ""}-${String(width)}.png`,
      stepperStepping,
    ),
  };
}

// Only the first option or example is shot: `pnpm check` runs the others. The fields open filled
// with the first example, so Start runs it.
async function shootStage(shooting: Shooting): Promise<Shots> {
  const { page, test, item, width } = shooting;
  const { element, name } = item;
  const asWritten = `${name}-as-written-${String(width)}.png`;
  await shootAlone(shooting, asWritten);
  const prompt = await element.$eval(".stage-say", (say) => say.textContent);
  const fields = await element.$$eval(".stage-field input", (nodes) =>
    nodes.map((node) => ({ name: node.name, value: node.value })),
  );
  const control = required(
    test,
    `${name}: Stage action exists`,
    await element.$(fields.length === 0 ? ".stage-option input" : ".stage-start"),
  );
  assertCase(
    test,
    `${name}: Stage action available`,
    true,
    await control.evaluate((node) => !node.matches(":disabled") && !node.closest("[inert]")),
  );
  const first =
    fields.length === 0
      ? `first option ${await control.evaluate((node) => (node as HTMLInputElement).value)}`
      : `first example ${fields.map(({ name, value }) => `${name} = ${value}`).join(", ")}`;
  await control.click();
  const completed = () =>
    element.evaluate(
      (node, prompt) =>
        node.closest("artifact-stage")?.hasAttribute("data-stepped") === true ||
        node.querySelector(".stage-say")?.textContent !== prompt,
      prompt,
    );
  await page
    .waitForFunction(
      (node, prompt) =>
        node.closest("artifact-stage")?.hasAttribute("data-stepped") === true ||
        node.querySelector(".stage-say")?.textContent !== prompt,
      {},
      element,
      prompt,
    )
    .catch(() => undefined);
  assertCase(test, `${name}: Stage ran or explicitly refused`, true, await completed());
  if (fields.length === 0)
    assertCase(
      test,
      `${name}: requested option selected`,
      true,
      await control.evaluate((node) => (node as HTMLInputElement).checked),
    );
  const steps = await element.$eval("p.stage-counter", (counter) =>
    counter.hidden ? 0 : Number(counter.querySelector(".stage-count")?.textContent),
  );
  if (steps === 0) {
    const refused = `${name}-refused-${String(width)}.png`;
    await shootAlone(shooting, refused);
    if (test.outcome === "passed") test.outcome = "refused";
    const refusal = await element.$eval(".stage-say", (say) => say.textContent);
    return {
      files: [asWritten, refused],
      summary: `${first}, refused: ${refusal}`,
    };
  }
  const files = await shootSteps(
    shooting,
    steps,
    (step) => `${name}-step-${String(step)}-${String(width)}.png`,
    stageStepping,
  );
  return {
    files: [asWritten, ...files],
    summary: `${first}, ${String(steps)} steps`,
  };
}

async function shootSteps(
  shooting: Shooting,
  steps: number,
  fileFor: (step: number) => string,
  stepping?: Stepping,
): Promise<string[]> {
  const { page, test, item } = shooting;
  const { element } = item;
  const files: string[] = [];
  const currentStep = (current: string) =>
    element.evaluate((node, current) => node.querySelector(current)?.textContent.trim(), current);
  assertCase(test, `${fileFor(1)}: capture step count`, true, Number.isInteger(steps) && steps > 0);
  for (let step = 1; step <= steps; step += 1) {
    const file = fileFor(step);
    if (stepping !== undefined)
      assertCase(test, `${file}: current step`, String(step), await currentStep(stepping.current));
    await shootAlone(shooting, file);
    files.push(file);
    if (stepping !== undefined && step < steps) {
      const button = required(test, `${file}: forward exists`, await element.$(stepping.forward));
      assertCase(
        test,
        `${file}: forward available`,
        true,
        await button.evaluate(
          (node) =>
            node instanceof HTMLButtonElement &&
            !node.disabled &&
            node.getAttribute("aria-disabled") !== "true",
        ),
      );
      await button.click();
      await page
        .waitForFunction(
          (node, current, expected) => node.querySelector(current)?.textContent.trim() === expected,
          {},
          element,
          stepping.current,
          String(step + 1),
        )
        .catch(() => undefined);
      assertCase(
        test,
        `${file}: advancement`,
        String(step + 1),
        await currentStep(stepping.current),
      );
    }
  }
  return files;
}
