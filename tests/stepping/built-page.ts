import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Window } from "happy-dom";
import { populateGlobal } from "vitest/runtime";
import { createFixtureRepo } from "../check/fixture-repo.ts";

export function artifact(frontmatter: string[], body: string[]): string {
  return ["---", ...frontmatter, "---", "", ...body, ""].join("\n");
}

export interface BuiltPage {
  close(): Promise<void>;
}

// One page per test file: a custom element is defined once per file, and the window can't be
// replaced between tests.
export async function openBuiltPage(
  files: Record<string, string>,
  slug: string,
): Promise<BuiltPage> {
  const repo = await createFixtureRepo(files);
  const run = await repo.check(["--artifacts-only"]);
  if (run.exitCode !== 0) {
    await repo.remove();
    throw new Error(run.output);
  }
  const inDist = (path: string) => pathToFileURL(join(repo.root, "dist", path)).href;
  const html = await readFile(join(repo.root, "dist", slug, "index.html"), "utf8");
  // The colour fade cancels its animations, and happy-dom rejects each cancelled one unhandled, as
  // a browser doesn't. With reduced motion the page has no fade.
  const window = new Window({
    url: `https://artifactory.test/${slug}/`,
    settings: { device: { prefersReducedMotion: "reduce" } },
  });
  populateGlobal(globalThis, window, { bindFunctions: true });
  // In place before the scripts load, so each element connects with its children already there.
  const parsed = new DOMParser().parseFromString(html, "text/html");
  document.documentElement.remove();
  document.append(document.adoptNode(parsed.documentElement));
  for (const element of document.querySelectorAll<HTMLElement>("[data-module]")) {
    element.dataset.module = inDist(element.dataset.module ?? "");
  }
  const scripts = [...document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]')];
  for (const script of scripts) {
    await import(/* @vite-ignore */ inDist(script.getAttribute("src") ?? ""));
  }
  return {
    close: async () => {
      await window.happyDOM.abort();
      await window.happyDOM.close();
      await repo.remove();
    },
  };
}

// happy-dom applies none of the page's stylesheets, which sit in cascade layers, so the words in the
// page's other language, which page.css hides, are left out here by their `data-lang`.
function hiddenFromTheOwner(element: Element): boolean {
  const other = document.documentElement.lang.startsWith("pt") ? "en" : "pt";
  return (
    element.hasAttribute("hidden") ||
    element.getAttribute("aria-hidden") === "true" ||
    element.getAttribute("data-lang") === other
  );
}

// The text a screen reader reads out, with its runs of white space as one space. A no-break space
// stays, as the page writes one to keep words together.
export function textOf(node: Node): string {
  const text = (part: Node): string =>
    part instanceof Element
      ? hiddenFromTheOwner(part)
        ? ""
        : [...part.childNodes].map(text).join("")
      : part.nodeType === part.TEXT_NODE
        ? (part.textContent ?? "")
        : "";
  return text(node)
    .replace(/[ \t\r\n]+/g, " ")
    .trim();
}

function onlyOne<Found extends Element>(found: Found[], what: string): Found {
  const [first, ...more] = found;
  if (first === undefined || more.length > 0)
    throw new Error(`${String(found.length)} ${what}, not one`);
  return first;
}

export function button(scope: ParentNode, name: string): HTMLButtonElement {
  return onlyOne(
    [...scope.querySelectorAll("button")].filter((found) => textOf(found) === name),
    `buttons named "${name}"`,
  );
}

export function radio(scope: ParentNode, name: string): HTMLInputElement {
  return onlyOne(
    [...scope.querySelectorAll<HTMLInputElement>('input[type="radio"]')].filter(
      (found) => found.labels?.[0] !== undefined && textOf(found.labels[0]) === name,
    ),
    `options named "${name}"`,
  );
}

export function textField(scope: ParentNode, name: string): HTMLInputElement {
  return onlyOne(
    [...scope.querySelectorAll<HTMLInputElement>('input[type="text"]')].filter(
      (found) => found.labels?.[0] !== undefined && textOf(found.labels[0]) === name,
    ),
    `fields named "${name}"`,
  );
}

function deepest(scope: ParentNode, shows: (text: string) => boolean): Element[] {
  const found = [...scope.querySelectorAll("*")].filter((element) => shows(textOf(element)));
  return found.filter(
    (element) => !found.some((other) => other !== element && element.contains(other)),
  );
}

// The element showing exactly this text, such as the line a Stage says each step in, found by its
// prompt.
export function saying(scope: ParentNode, text: string): Element {
  return onlyOne(
    deepest(scope, (shown) => shown === text),
    `elements saying "${text}"`,
  );
}

export function announcement(scope: ParentNode): Element {
  return onlyOne([...scope.querySelectorAll("[aria-live]")], "live regions");
}

export function press(target: Element, key: "ArrowLeft" | "ArrowRight"): void {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

const counter = /^\d+ (?:of|de) \d+(?= |$)/;

// The step counter, "2 of 5" or "2 de 5", or "" while no step is counted.
export function counted(scope: ParentNode): string {
  const counters = deepest(scope, (shown) => counter.test(shown));
  if (counters.length > 1) throw new Error(`${String(counters.length)} step counters, not one`);
  return counters[0] === undefined ? "" : (counter.exec(textOf(counters[0]))?.[0] ?? "");
}
