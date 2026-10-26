import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { homedir } from "node:os";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { Browser, install } from "@puppeteer/browsers";
import puppeteer, { type ElementHandle, type Page, type Viewport } from "puppeteer-core";

export const lookViewports = [
  { width: 393, height: 852, deviceScaleFactor: 3 },
  { width: 1920, height: 1080, deviceScaleFactor: 1 },
] satisfies [Viewport, Viewport];

export interface Requested {
  viewport: Viewport;
  language: string;
  media: "screen" | "print";
  colorScheme: "light" | "dark";
  reducedMotion: "reduce";
  storage: "fresh-context";
  target: string;
}

interface Assertion {
  name: string;
  expected: unknown;
  actual: unknown;
  passed: boolean;
}

export interface BrowserCase {
  id: string;
  url: string;
  requested: Requested;
  observed: Record<string, unknown>;
  outcome:
    | "passed"
    | "failed"
    | "unavailable"
    | "unsupported"
    | "captured-awaiting-visual-review"
    | "refused"
    | "not-applicable";
  assertions: Assertion[];
  captures: string[];
  visualReview?: "awaiting-human-review";
}

export interface BrowserReport {
  schemaVersion: 1;
  output: { directory: string; sha256: string; files: { path: string; sha256: string }[] };
  browser: { version: string | null };
  cases: BrowserCase[];
}

class AssertionFailed extends Error {}

export function assertCase(
  test: BrowserCase,
  name: string,
  expected: unknown,
  actual: unknown,
): void {
  const passed = JSON.stringify(expected) === JSON.stringify(actual);
  test.assertions.push({ name, expected, actual, passed });
  if (!passed) {
    test.outcome = "failed";
    throw new AssertionFailed(
      `${test.id}: ${name}: expected ${JSON.stringify(expected)}, actual ${JSON.stringify(actual)}`,
    );
  }
}

export function required<T>(test: BrowserCase, name: string, value: T | null | undefined): T {
  if (value === null || value === undefined) {
    test.outcome = "failed";
    test.assertions.push({ name, expected: "present", actual: value ?? null, passed: false });
    throw new AssertionFailed(`${test.id}: ${name}: expected present, actual ${String(value)}`);
  }
  assertCase(test, name, "present", "present");
  return value;
}

export function failCase(test: BrowserCase, error: unknown): void {
  if (error instanceof AssertionFailed) return;
  test.outcome = "failed";
  test.assertions.push({
    name: "browser operation",
    expected: "completed",
    actual: String(error),
    passed: false,
  });
}

export function browserCase(id: string, url: string, requested: Requested): BrowserCase {
  return { id, url, requested, observed: {}, outcome: "passed", assertions: [], captures: [] };
}

export async function outputIdentity(directory: string): Promise<BrowserReport["output"]> {
  const files: { path: string; sha256: string }[] = [];
  async function visit(folder: string): Promise<void> {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const file = join(folder, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile() && /\.(html|css|js)$/.test(entry.name)) {
        files.push({
          path: relative(directory, file),
          sha256: createHash("sha256")
            .update(await readFile(file))
            .digest("hex"),
        });
      }
    }
  }
  await visit(directory);
  files.sort((a, b) => a.path.localeCompare(b.path));
  return {
    directory,
    sha256: createHash("sha256").update(JSON.stringify(files)).digest("hex"),
    files,
  };
}

const contentTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".css": "text/css",
  ".html": "text/html",
  ".jpg": "image/jpeg",
  ".js": "text/javascript",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

export async function startBrowser(directory: string) {
  const server = createServer((request, response) => {
    void (async () => {
      try {
        const pathname = decodeURIComponent(
          new URL(request.url ?? "/", "http://localhost").pathname,
        );
        const file = resolve(directory, `.${pathname}`, pathname.endsWith("/") ? "index.html" : "");
        if (!file.startsWith(`${resolve(directory)}${sep}`))
          throw new Error("outside built output");
        const body = await readFile(file);
        response
          .writeHead(200, {
            "Content-Type": contentTypes[extname(file)] ?? "application/octet-stream",
          })
          .end(body);
      } catch {
        if (!response.headersSent) response.writeHead(404);
        response.end();
      }
    })();
  });
  await new Promise<void>((done, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", done);
  });
  const closeServer = () =>
    new Promise<void>((done, reject) => {
      server.closeAllConnections();
      server.close((error) => {
        if (error) reject(error);
        else done();
      });
    });
  try {
    // Resolving "stable" needs an unavailable endpoint in cloud sessions; pin Puppeteer's Chrome.
    const executablePath =
      process.env.CHROME_PATH ??
      (
        await install({
          browser: Browser.CHROME,
          buildId: "155.0.8059.79",
          cacheDir: join(homedir(), ".cache", "puppeteer"),
          downloadProgressCallback: "default",
        })
      ).executablePath;
    const browser = await puppeteer.launch({
      executablePath,
      args: process.getuid?.() === 0 ? ["--no-sandbox"] : [],
    });
    return {
      browser,
      origin: `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`,
      async close() {
        try {
          await browser.close();
        } finally {
          await closeServer();
        }
      },
    };
  } catch (error) {
    await closeServer();
    throw error;
  }
}

export async function preparePage(page: Page, requested: Requested): Promise<void> {
  page.setDefaultTimeout(6000);
  await page.setViewport(requested.viewport);
  const client = await page.createCDPSession();
  // Chromium clears these overrides on CDP detach; the caller's context owns the session lifetime.
  await client.send("Emulation.setEmulatedMedia", {
    media: requested.media,
    features: [
      { name: "prefers-color-scheme", value: requested.colorScheme },
      { name: "prefers-reduced-motion", value: requested.reducedMotion },
      { name: "forced-colors", value: "none" },
    ],
  });
}

export async function ready(page: Page, test: BrowserCase): Promise<void> {
  const response = await page.goto(test.url, { waitUntil: "networkidle0" });
  assertCase(test, "built page HTTP status", 200, response?.status());
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await settle(page);
  await observePage(page, test);
}

export async function settle(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((done) =>
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            done();
          });
        }),
      ),
  );
}

export async function observePage(page: Page, test: BrowserCase) {
  const actual = await page.evaluate(() => ({
    url: location.href,
    language: document.documentElement.lang,
    viewport: { width: innerWidth, height: innerHeight, deviceScaleFactor: devicePixelRatio },
    media: matchMedia("print").matches
      ? "print"
      : matchMedia("screen").matches
        ? "screen"
        : "neither",
    colorScheme: matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "neither",
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "reduce"
      : "no-preference",
    forcedColors: matchMedia("(forced-colors: active)").matches,
    storedTheme: localStorage.getItem("artifactory-theme"),
    scroll: { x: scrollX, y: scrollY },
  }));
  test.observed = { ...test.observed, ...actual };
  assertCase(test, "page URL", test.url, actual.url);
  assertCase(test, "document language", test.requested.language, actual.language);
  assertCase(
    test,
    "viewport",
    {
      width: test.requested.viewport.width,
      height: test.requested.viewport.height,
      deviceScaleFactor: test.requested.viewport.deviceScaleFactor ?? 1,
    },
    actual.viewport,
  );
  assertCase(test, "media type", test.requested.media, actual.media);
  assertCase(test, "color scheme media", test.requested.colorScheme, actual.colorScheme);
  assertCase(test, "reduced motion media", test.requested.reducedMotion, actual.reducedMotion);
  assertCase(test, "forced colors media", false, actual.forcedColors);
  return actual;
}

export async function capture(
  page: Page,
  test: BrowserCase,
  folder: string,
  file: string,
  element?: ElementHandle,
): Promise<void> {
  const measured = await observePage(page, test);
  const before = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  await mkdir(dirname(join(folder, file)), { recursive: true });
  if (element) await element.screenshot({ path: join(folder, file) });
  else await page.screenshot({ path: join(folder, file), fullPage: true });
  test.captures.push(file);
  test.visualReview = "awaiting-human-review";
  await page.setViewport(test.requested.viewport);
  await page.evaluate(({ x, y }) => {
    scrollTo(x, y);
  }, before);
  await settle(page);
  const restored = await observePage(page, test);
  assertCase(
    test,
    "theme storage restored after capture",
    measured.storedTheme,
    restored.storedTheme,
  );
  assertCase(
    test,
    "scroll restored after capture",
    before,
    await page.evaluate(() => ({ x: scrollX, y: scrollY })),
  );
  const measurements = (test.observed.captureMeasurements ?? []) as unknown[];
  measurements.push({ file, before: measured, restored });
  test.observed.captureMeasurements = measurements;
}

export async function writeReport(folder: string, report: BrowserReport): Promise<void> {
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, "results.json"), `${JSON.stringify(report, null, 2)}\n`);
  const escape = (value: string) =>
    value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
  await writeFile(
    join(folder, "contact-sheet.html"),
    `<!doctype html><html lang="en"><meta charset="utf-8"><title>Browser evidence</title><style>body{font:16px system-ui;margin:24px}section{border-top:2px solid;padding-top:12px;margin-top:24px}.captures{display:flex;flex-wrap:wrap;gap:16px}figure{margin:0;width:360px}img{max-width:100%;max-height:600px;object-fit:contain;object-position:top;display:block}figcaption{overflow-wrap:anywhere}pre{white-space:pre-wrap}</style><h1>Browser evidence</h1><p>Images await human visual review. Assertion outcomes do not approve appearance or prove the first frame.</p><p>Browser: ${escape(report.browser.version ?? "unavailable")}. Output SHA-256: ${escape(report.output.sha256)}</p>${report.cases
      .map(
        (test) =>
          `<section><h2>${escape(test.id)} — ${escape(test.outcome)}</h2><p>${escape(test.url)}</p><pre>${escape(JSON.stringify(test.requested))}</pre>${test.assertions
            .filter((a) => !a.passed)
            .map(
              (a) =>
                `<pre>${escape(a.name)}: expected ${escape(JSON.stringify(a.expected))}; actual ${escape(JSON.stringify(a.actual))}</pre>`,
            )
            .join(
              "",
            )}<div class="captures">${test.captures.map((file) => `<figure><a href="${escape(file)}"><img src="${escape(file)}" alt="${escape(test.id)}: ${escape(file)}"></a><figcaption>${escape(file)} — awaiting human visual review</figcaption></figure>`).join("")}</div></section>`,
      )
      .join("")}</html>`,
  );
}
