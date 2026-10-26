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

const diagramsAndFiguresSelector =
  "main figure.diagram, main figure.figure, main artifact-stepper:has(.stepper-boards, .stepper-figure)";
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
  { number: string; description: string; summary: string | undefined; files: string[] }
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
    target: diagramsAndFiguresSelector,
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
      target: diagramsAndFiguresSelector,
    });
    report.cases.push(test);
    const context = await session.browser.createBrowserContext();
    try {
      const page = await context.newPage();
      await preparePage(page, test.requested);
      await ready(page, test);
      assertCase(test, "fresh theme storage", null, test.observed.storedTheme);
      const elements = await page.$$(diagramsAndFiguresSelector);
      if (elements.length === 0) test.outcome = "not-applicable";
      for (const [index, element] of elements.entries()) {
        const name = `${String(index + 1).padStart(2, "0")}-${await kindOf(element)}`;
        const { files, summary } = (await element.evaluate((node) => node.matches(".stage")))
          ? await screenshotStage(page, test, element, name, viewport.width)
          : {
              files: await screenshot(page, test, element, name, viewport.width),
              summary: undefined,
            };
        screenshots.set(name, {
          number: await numberOf(page, element),
          description: await describe(element),
          summary,
          files: [...(screenshots.get(name)?.files ?? []), ...files],
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
if (screenshots.size === 0) console.log(`\npnpm look: ${entry} has no diagrams or figures`);
else {
  const widths = lookViewports.map(({ width }) => `${String(width)} px`).join(" and ");
  console.log(`\npnpm look: ${entry} at ${widths} wide`);
  for (const [name, { number, description, summary, files }] of screenshots) {
    console.log(`\n${name}${number === "" ? "" : ` (${number})`}: ${description}`);
    if (summary !== undefined) console.log(`  ${summary}`);
    for (const file of files) console.log(`  ${folder}/${file}`);
  }
}
console.log(
  `\npnpm look: ${folder}/results.json and ${folder}/contact-sheet.html; captures await human visual review`,
);
process.exitCode = report.cases.some((test) =>
  ["failed", "unavailable", "unsupported"].includes(test.outcome),
)
  ? 1
  : 0;

function kindOf(element: ElementHandle): Promise<string> {
  return element.evaluate((node) =>
    node.matches(".stepper")
      ? "stepper"
      : node.matches(".stage")
        ? node.querySelector(".stage-input") === null
          ? "stage-choose"
          : "stage-input"
        : node.matches(".diagram")
          ? "diagram"
          : "figure",
  );
}

// A Stage of code or tables has no drawing, so no `alt`: its caption says what it shows.
function describe(element: ElementHandle): Promise<string> {
  return element.evaluate((node) => {
    const alt = node.querySelector("svg[role='img']")?.getAttribute("aria-label");
    if (alt != null) return alt;
    const caption = node.querySelector(":scope > figcaption")?.cloneNode(true);
    if (!(caption instanceof Element)) return "no drawing and no caption";
    caption.querySelector(".figure-number")?.remove();
    return `no drawing; caption: ${caption.textContent.replace(/\s+/g, " ").trim()}`;
  });
}

// The number is a CSS counter, which only the rendered page knows, so it's read from the
// accessibility tree: the label, then the counter's pieces ("1", ".", "2") under one node.
async function numberOf(page: Page, element: ElementHandle): Promise<string> {
  const number = await element.$(":scope > figcaption .figure-number");
  if (number === null) return "";
  const textOf = (node: SerializedAXNode, separator: string): string =>
    node.role === "StaticText"
      ? (node.name ?? "")
      : (node.children ?? []).map((child) => textOf(child, "")).join(separator);
  const tree = await page.accessibility.snapshot({ root: number, interestingOnly: false });
  return tree === null ? "" : textOf(tree, " ").replace(/\s+/g, " ").trim();
}

// A stepper is shot once per step, with its buttons and caption, the way the owner sees each step.
async function screenshot(
  page: Page,
  test: BrowserCase,
  element: ElementHandle,
  pathPrefix: string,
  width: number,
): Promise<string[]> {
  const steps = await element.evaluate((node) => Number(node.getAttribute("data-count") ?? "1"));
  return shootSteps(
    page,
    test,
    element,
    steps,
    (step) => `${pathPrefix}${steps > 1 ? `-step-${String(step)}` : ""}-${String(width)}.png`,
    "button.stepper-forward",
  );
}

// Only the first option or example is shot: `pnpm check` runs the others. The fields open filled
// with the first example, so Start runs it.
async function screenshotStage(
  page: Page,
  test: BrowserCase,
  element: ElementHandle,
  pathPrefix: string,
  width: number,
): Promise<{ files: string[]; summary: string }> {
  const asWritten = `${pathPrefix}-as-written-${String(width)}.png`;
  await capture(page, test, folder, asWritten, element);
  const prompt = await element.$eval(".stage-say", (say) => say.textContent);
  const fields = await element.$$eval(".stage-field input", (nodes) =>
    nodes.map((node) => ({ name: node.name, value: node.value })),
  );
  const control = required(
    test,
    `${pathPrefix}: Stage action exists`,
    await element.$(fields.length === 0 ? ".stage-option input" : ".stage-start"),
  );
  assertCase(
    test,
    `${pathPrefix}: Stage action available`,
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
  assertCase(test, `${pathPrefix}: Stage ran or explicitly refused`, true, await completed());
  if (fields.length === 0)
    assertCase(
      test,
      `${pathPrefix}: requested option selected`,
      true,
      await control.evaluate((node) => (node as HTMLInputElement).checked),
    );
  const steps = await element.$eval("p.stage-counter", (counter) =>
    counter.hidden ? 0 : Number(counter.querySelector(".stage-count")?.textContent),
  );
  if (steps === 0) {
    const refused = `${pathPrefix}-refused-${String(width)}.png`;
    await capture(page, test, folder, refused, element);
    test.outcome = "refused";
    const refusal = await element.$eval(".stage-say", (say) => say.textContent);
    return {
      files: [asWritten, refused],
      summary: `${first}, refused: ${refusal}`,
    };
  }
  const files = await shootSteps(
    page,
    test,
    element,
    steps,
    (step) => `${pathPrefix}-step-${String(step)}-${String(width)}.png`,
    "button.stage-forward",
  );
  return {
    files: [asWritten, ...files],
    summary: `${first}, ${String(steps)} steps`,
  };
}

async function shootSteps(
  page: Page,
  test: BrowserCase,
  element: ElementHandle,
  steps: number,
  fileFor: (step: number) => string,
  forwardSelector: string,
): Promise<string[]> {
  const files: string[] = [];
  const selector = forwardSelector.includes("stage") ? ".stage-current" : ".stepper-current";
  assertCase(test, `${fileFor(1)}: capture step count`, true, Number.isInteger(steps) && steps > 0);
  for (let step = 1; step <= steps; step += 1) {
    const file = fileFor(step);
    if (await element.evaluate((node) => node.matches(".stepper, .stage"))) {
      const actual = await element.evaluate(
        (node, selector) => node.querySelector(selector)?.textContent.trim(),
        selector,
      );
      assertCase(test, `${file}: current step`, String(step), actual);
    }
    await capture(page, test, folder, file, element);
    files.push(file);
    if (step < steps) {
      const button = required(test, `${file}: forward exists`, await element.$(forwardSelector));
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
          (node, selector, expected) =>
            node.querySelector(selector)?.textContent.trim() === expected,
          {},
          element,
          selector,
          String(step + 1),
        )
        .catch(() => undefined);
      assertCase(
        test,
        `${file}: advancement`,
        String(step + 1),
        await element.evaluate(
          (node, selector) => node.querySelector(selector)?.textContent.trim(),
          selector,
        ),
      );
    }
  }
  return files;
}
