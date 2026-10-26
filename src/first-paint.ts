import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { BuiltArtifact } from "./built-output.ts";
import type { Failure } from "./check-failure.ts";

// An artifact page's first frame shows the answers this device last showed, which its scripts read
// from the device. Astro writes each script where it's declared, in `<body>`, and Chrome paints the
// parsed page before running them, while `blocking="render"` holds the first paint only for a
// script in `<head>`. On a cold cache the first paint waits for the scripts' network.
const moduleScript = /<script type="module"[^>]*>[\s\S]*?<\/script>/g;
const anyModuleScript = /<script\b[^>]*\stype=["']?module\b/i;

type Held = { html: string } | { problem: string };

function held(html: string): Held {
  const headEnd = html.indexOf("</head>");
  if (headEnd === -1) return { problem: "no `</head>` to move the artifact page's scripts into" };
  const afterHead = html.slice(headEnd);
  const scripts = afterHead.match(moduleScript) ?? [];
  if (scripts.length === 0) return { problem: 'no `<script type="module">` after `</head>`' };
  const left = afterHead.replace(moduleScript, "");
  if (anyModuleScript.test(left)) {
    return { problem: "a module script after `</head>` that the move into `<head>` doesn't match" };
  }
  const blocking = scripts.map((script) =>
    script.replace('<script type="module"', '<script type="module" blocking="render"'),
  );
  return { html: html.slice(0, headEnd) + blocking.join("") + left };
}

function failure(file: string, problem: string): Failure {
  return {
    file,
    line: 1,
    column: 1,
    ruleId: "first-paint",
    message: `${problem}, so the artifact page would paint before showing the answers this device last showed`,
    skillSection: "Platform changes",
  };
}

function holdAll(artifacts: BuiltArtifact[]) {
  const pages: { file: string; html: string }[] = [];
  const failures: Failure[] = [];
  for (const { page } of artifacts) {
    const holding = held(page.html);
    if ("problem" in holding) failures.push(failure(`dist/${page.file}`, holding.problem));
    else pages.push({ file: page.file, html: holding.html });
  }
  return { pages, failures };
}

export function firstPaintFailures(artifacts: BuiltArtifact[]): Failure[] {
  return holdAll(artifacts).failures;
}

// Checked again as the scripts move, so no artifact page is written painting before them, whatever
// ran before this.
export async function holdFirstPaintForScripts(
  outDir: string,
  artifacts: BuiltArtifact[],
): Promise<Failure[]> {
  const { pages, failures } = holdAll(artifacts);
  if (failures.length > 0) return failures;
  await Promise.all(pages.map(({ file, html }) => writeFile(join(outDir, file), html)));
  return [];
}
