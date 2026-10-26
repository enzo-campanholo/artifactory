import { readFile, rm, stat } from "node:fs/promises";
import { resolve, join } from "node:path";
import type { Page } from "puppeteer-core";
import {
  assertCase,
  browserCase,
  capture,
  failCase,
  lookViewports,
  observePage,
  outputIdentity,
  preparePage,
  ready,
  required,
  settle,
  startBrowser,
  writeReport,
  type BrowserCase,
  type BrowserReport,
  type Requested,
} from "./browser-session.ts";

const usage =
  "usage: scripts/heavy node scripts/verify-browser.ts <artifact-slug> [--dist <built-directory>]";
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--help") {
  console.log(usage);
  process.exit(0);
}
const [slug, option, directory] = args;
function invalid(message: string): never {
  console.error(`verify-browser: ${message}`);
  process.exit(2);
}
if (
  slug === undefined ||
  !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
  !(
    args.length === 1 ||
    (args.length === 3 && option === "--dist" && directory !== "" && !directory?.startsWith("--"))
  )
)
  invalid(usage);
const dist = resolve(directory ?? "dist");
let html: string;
try {
  if (!(await stat(dist)).isDirectory()) invalid(`built directory is not a directory: ${dist}`);
  html = await readFile(join(dist, slug, "index.html"), "utf8");
} catch {
  invalid(
    `missing built page: ${join(dist, slug, "index.html")}; build it before running this command`,
  );
}
const language = /<html\b[^>]*\blang=["']([^"']+)["']/.exec(html)?.[1];
if (language !== "en" && language !== "pt-BR")
  invalid("built artifact must have document language en or pt-BR");
const moduleTags = [...html.matchAll(/<script\b[^>]*>/g)]
  .map(([tag]) => tag)
  .filter((tag) => /\btype=["']module["']/.test(tag) && /\bblocking=["']render["']/.test(tag));
let modulePath: string | undefined;
for (const tag of moduleTags) {
  const src = /\bsrc=["']([^"']+)["']/.exec(tag)?.[1];
  if (!src?.startsWith("/")) continue;
  let source: string;
  try {
    source = await readFile(join(dist, new URL(src, "http://built.local").pathname), "utf8");
  } catch {
    invalid(`missing built module: ${src}`);
  }
  if (source.includes(".dataset.storeStarted")) {
    modulePath = src;
    break;
  }
}
if (!modulePath) invalid("built artifact has no render-blocking page module");
const folder = resolve(".look", slug, "browser");
await rm(folder, { recursive: true, force: true });
const report: BrowserReport = {
  schemaVersion: 1,
  output: await outputIdentity(dist),
  browser: { version: null },
  cases: [],
};
const phone = lookViewports[0];
const request = (target: string, lang = language): Requested => ({
  viewport: phone,
  language: lang,
  media: "screen",
  colorScheme: "light",
  reducedMotion: "reduce",
  storage: "fresh-context",
  target,
});
let session: Awaited<ReturnType<typeof startBrowser>>;
try {
  session = await startBrowser(dist);
} catch (error) {
  const test = browserCase("browser-launch", `/${slug}/`, request("browser"));
  test.outcome = "unavailable";
  test.assertions.push({
    name: "Chromium launch",
    expected: "available",
    actual: String(error),
    passed: false,
  });
  report.cases.push(test);
  await writeReport(folder, report);
  console.error(`verify-browser: unavailable: ${String(error)}`);
  process.exit(1);
}

async function runCase(
  id: string,
  path: string,
  requested: Requested,
  action: (page: Page, test: BrowserCase) => Promise<void>,
  setup?: (page: Page) => Promise<void>,
): Promise<void> {
  const test = browserCase(id, `${session.origin}${path}`, requested);
  report.cases.push(test);
  const context = await session.browser.createBrowserContext();
  try {
    const page = await context.newPage();
    await preparePage(page, requested);
    await setup?.(page);
    await ready(page, test);
    assertCase(test, "fresh theme storage", null, test.observed.storedTheme);
    await action(page, test);
  } catch (error) {
    failCase(test, error);
  } finally {
    await context.close();
  }
  console.log(`verify-browser: ${id}: ${test.outcome}`);
  for (const assertion of test.assertions.filter((a) => !a.passed)) {
    console.error(
      `  ${assertion.name}: expected ${JSON.stringify(assertion.expected)}, actual ${JSON.stringify(assertion.actual)}`,
    );
  }
}

async function tabTo(
  page: Page,
  test: BrowserCase,
  selector: string,
  targetIndex = 0,
): Promise<void> {
  const target = required(
    test,
    `required target ${selector}`,
    (await page.$$(selector))[targetIndex],
  );
  assertCase(
    test,
    "target available",
    true,
    await target.evaluate(
      (node) =>
        node instanceof HTMLElement &&
        !node.closest("[inert]") &&
        !node.matches(":disabled, [aria-disabled=true]") &&
        node.getClientRects().length > 0,
    ),
  );
  const visited = new Set<number>();
  const budget = await page.evaluate(() => document.querySelectorAll("*").length + 1);
  for (let count = 0; count < budget; count += 1) {
    await page.keyboard.press("Tab");
    const focus = await page.evaluate(
      (node) => ({
        reached: document.activeElement === node,
        index: [...document.querySelectorAll("*")].findIndex(
          (node) => node === document.activeElement,
        ),
      }),
      target,
    );
    if (focus.reached) {
      assertCase(
        test,
        "native Tab focus",
        selector,
        await page.evaluate(
          (node, selector) =>
            document.activeElement === node ? selector : document.activeElement?.outerHTML,
          target,
          selector,
        ),
      );
      return;
    }
    if (visited.has(focus.index)) break;
    visited.add(focus.index);
  }
  assertCase(
    test,
    "native Tab focus",
    selector,
    await page.evaluate(() => document.activeElement?.outerHTML),
  );
}

async function themeState(page: Page) {
  return page.evaluate(() => ({
    pressed: document.querySelector("theme-eye button")?.getAttribute("aria-pressed"),
    stored: localStorage.getItem("artifactory-theme"),
    chosen: document.documentElement.dataset.theme ?? null,
    scheme: getComputedStyle(document.documentElement).colorScheme,
    background: getComputedStyle(document.body).backgroundColor,
    color: getComputedStyle(document.body).color,
    focused: document.activeElement === document.querySelector("theme-eye button"),
  }));
}

try {
  report.browser.version = await session.browser.version();
  for (const lang of ["en", "pt-BR"]) {
    await runCase(
      `theme-keyboard-${lang}`,
      `/catalog/eye/${lang === "pt-BR" ? "?lang=pt-BR" : ""}`,
      request("theme-eye button", lang),
      async (page, test) => {
        await tabTo(page, test, "theme-eye button");
        const initial = await themeState(page);
        test.observed.initialTheme = initial;
        assertCase(
          test,
          "initial light theme",
          {
            pressed: "false",
            stored: null,
            chosen: null,
            scheme: "light dark",
            background: "rgb(255, 255, 255)",
            color: "rgb(17, 17, 17)",
            focused: true,
          },
          initial,
        );
        await page.keyboard.press("Space");
        await settle(page);
        const dark = await themeState(page);
        test.observed.afterSpace = dark;
        assertCase(
          test,
          "Space changes aria, storage and computed theme",
          {
            pressed: "true",
            stored: "dark",
            chosen: "dark",
            scheme: "dark",
            background: "rgb(18, 18, 18)",
            color: "rgb(237, 237, 237)",
            focused: true,
          },
          dark,
        );
        await capture(page, test, folder, `${test.id}-dark.png`);
        await page.keyboard.press("Enter");
        await settle(page);
        const light = await themeState(page);
        test.observed.afterEnter = light;
        assertCase(test, "Enter restores aria, storage and computed theme", initial, light);
        await capture(page, test, folder, `${test.id}-light.png`);
      },
    );
  }
  for (const [name, media, colorScheme] of [
    ["dark-screen", "screen", "dark"],
    ["light-print", "print", "light"],
    ["light-screen", "screen", "light"],
  ] as const) {
    await runCase(
      `media-${name}`,
      `/${slug}/`,
      { ...request("html"), media, colorScheme },
      async (page, test) => {
        await capture(page, test, folder, `${test.id}.png`);
        await observePage(page, test);
      },
    );
  }
  await runCase(
    "native-table-scroll",
    `/${slug}/`,
    request("main .table-scroller"),
    async (page, test) => {
      const supported = await page.evaluate(() =>
        CSS.supports("animation-timeline", "scroll(self inline)"),
      );
      if (!supported) {
        test.outcome = "unsupported";
        test.assertions.push({
          name: "scroll timeline capability",
          expected: true,
          actual: false,
          passed: false,
        });
        return;
      }
      const overflows = await page.$$eval("main .table-scroller", (nodes) =>
        nodes.map((node) => node.scrollWidth > node.clientWidth + 1),
      );
      const index = overflows.indexOf(true);
      assertCase(test, "overflowing native table", true, index >= 0);
      const table = required(
        test,
        "overflowing table target",
        (await page.$$("main .table-scroller"))[index],
      );
      await tabTo(page, test, "main .table-scroller", index);
      const measure = () =>
        table.evaluate((node) => {
          const style = getComputedStyle(node);
          const right = style.borderImageWidth.split(/\s+/)[1] ?? "0";
          return {
            pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
            pageScrollX: scrollX,
            scrollLeft: node.scrollLeft,
            maximum: node.scrollWidth - node.clientWidth,
            focused: document.activeElement === node,
            cueVisible:
              style.borderImageSource !== "none" &&
              Number.parseFloat(right) > 0 &&
              style.visibility === "visible" &&
              Number(style.opacity) > 0,
            borderImageWidth: style.borderImageWidth,
            borderImageSource: style.borderImageSource,
          };
        });
      const start = await measure();
      test.observed.beforeScroll = start;
      assertCase(test, "no page sideways overflow", false, start.pageOverflow);
      assertCase(test, "table starts at left", 0, start.scrollLeft);
      assertCase(test, "cue visible before scroll end", true, start.cueVisible);
      await capture(page, test, folder, "native-table-start.png", table);
      await page.keyboard.press("ArrowRight");
      await page.waitForFunction((node) => node.scrollLeft > 0, {}, table).catch(() => undefined);
      const keyboard = await measure();
      test.observed.afterArrowRight = keyboard;
      assertCase(
        test,
        "arrow scrolls container and retains focus",
        true,
        keyboard.scrollLeft > 0 && keyboard.focused && keyboard.pageScrollX === 0,
      );
      await table.evaluate((node) => {
        node.scrollLeft = node.scrollWidth;
      });
      await settle(page);
      const end = await measure();
      test.observed.atEnd = end;
      assertCase(
        test,
        "container reached scroll end",
        true,
        Math.abs(end.scrollLeft - end.maximum) <= 1,
      );
      assertCase(test, "cue gone at scroll end", false, end.cueVisible);
      assertCase(test, "focus retained at end", true, end.focused);
      assertCase(test, "no sideways overflow at end", false, end.pageOverflow);
      await capture(page, test, folder, "native-table-end.png", table);
    },
  );
  for (const mode of ["normal", "unrelated-error", "missing-module"] as const) {
    await runCase(
      `artifact-startup-${mode}`,
      `/${slug}/`,
      request("[data-artifact-id] [data-notice=startFailed]"),
      async (page, test) => {
        const state = await page.evaluate(() => {
          const notice = document.querySelector<HTMLElement>("[data-notice=startFailed]");
          return {
            artifact: document.documentElement.hasAttribute("data-artifact-id"),
            questions: document.querySelectorAll("[data-question-id]").length,
            started: document.documentElement.hasAttribute("data-store-started"),
            noticeExists: notice !== null,
            noticeVisible: notice !== null && !notice.hidden && notice.getClientRects().length > 0,
          };
        });
        test.observed.startup = state;
        assertCase(
          test,
          "real question-bearing artifact layout",
          true,
          state.artifact && state.questions > 0 && state.noticeExists,
        );
        assertCase(test, "store started marker", mode !== "missing-module", state.started);
        if (mode === "missing-module")
          assertCase(
            test,
            "artifact startup module blocked",
            new URL(modulePath, test.url).href,
            test.observed.blockedModule,
          );
        assertCase(
          test,
          "startup failure notice visibility",
          mode === "missing-module",
          state.noticeVisible,
        );
        if (mode === "unrelated-error")
          assertCase(
            test,
            "unrelated external error executed",
            true,
            test.observed.unrelatedErrorSeen === true,
          );
        await capture(page, test, folder, `${test.id}.png`);
      },
      async (page) => {
        const test = report.cases.at(-1);
        if (test === undefined) throw new Error("startup case missing");
        page.on("pageerror", (error) => {
          if (String(error).includes("browser-verification unrelated external script"))
            test.observed.unrelatedErrorSeen = true;
        });
        if (mode === "normal") return;
        await page.setRequestInterception(true);
        page.on("request", (request) => {
          void (async () => {
            if (
              mode === "missing-module" &&
              request.url() === new URL(modulePath, `${session.origin}/${slug}/`).href
            ) {
              test.observed.blockedModule = request.url();
              await request.respond({ status: 404, contentType: "text/javascript", body: "" });
            } else if (
              mode === "unrelated-error" &&
              request.isNavigationRequest() &&
              request.frame() === page.mainFrame()
            ) {
              await request.respond({
                status: 200,
                contentType: "text/html",
                body: html.replace(
                  "</head>",
                  '<script src="/__browser-unrelated.js"></script></head>',
                ),
              });
            } else if (new URL(request.url()).pathname === "/__browser-unrelated.js") {
              await request.respond({
                status: 200,
                contentType: "text/javascript",
                body: 'throw new Error("browser-verification unrelated external script");',
              });
            } else await request.continue();
          })().catch((error: unknown) => {
            failCase(test, error);
          });
        });
      },
    );
  }
} finally {
  await session.close();
  await writeReport(folder, report);
}
const passed = report.cases.every((test) => test.outcome === "passed");
console.log(
  `verify-browser: ${passed ? "passed" : "non-pass"}; ${folder}/results.json; captures await human visual review`,
);
process.exitCode = passed ? 0 : 1;
