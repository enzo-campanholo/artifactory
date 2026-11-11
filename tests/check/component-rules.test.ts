import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  checkTimeout,
  createFixtureRepo,
  type CheckRun,
  type FixtureRepo,
} from "./fixture-repo.ts";

function artifact(id: string, title: string, body: string[]): string {
  return [
    "---",
    `id: ${id}`,
    `title: ${title}`,
    "subject: Computação",
    "lang: pt-BR",
    "published: 2026-10-15",
    "---",
    "",
    ...body,
    "",
  ].join("\n");
}

function code(fence: string, ...lines: string[]): string[] {
  return [fence, ...lines, "```", ""];
}

const twoBoards = "a\nsteps: {\n  b: {\n    b\n  }\n}\n";

// Every component rule is broken once here, so one build reports them all.
const files = {
  "artifacts/passos/index.mdx": artifact("pa55os01", "Passos", [
    'import Stepper from "@artifactory/design-system/stepper";',
    'import diagrama from "./passos.d2?steps";',
    'import figura from "./passos.svg?raw";',
    'import cores from "./cores.svg?raw";',
    'import fora from "./fora.svg?raw";',
    "",
    "### Detalhes",
    "",
    "Veja [a pilha](/nada/).",
    "",
    '<Stepper lines={["1", "2"]} captions={["Empilha.", "Soma."]}>',
    "",
    ...code("```text", "push 2", "add"),
    "</Stepper>",
    "",
    '<Stepper diagram={diagrama} figure={figura} alt="Os passos." />',
    "",
    '<Stepper diagram={diagrama} alt="Os passos.">',
    "",
    ...code("```text", "push 2"),
    "</Stepper>",
    "",
    '<Stepper figure={cores} alt="Um vértice da cor 1." />',
    "",
    '<Stepper figure={fora} alt="Um ponto que sai." />',
    "",
    '<Stepper lines={["1"]}>',
    "",
    ...code("```text", "push 2"),
    "</Stepper>",
    "",
    '<Stepper lines={["1", "2"]} captions={["Empilha."]}>',
    "",
    ...code("```text", "push 2", "add"),
    "</Stepper>",
    "",
    '<Stepper lines={["0", "4"]}>',
    "",
    ...code("```text start=0", "push 2", "push 3", "add", "print"),
    "</Stepper>",
    "",
    "<Stepper>",
    "",
    ...code("```text", "push 2"),
    "</Stepper>",
    "",
    '<Stepper lines={["1", "1"]}>',
    "",
    ...code("```text", "push 2"),
    ...code("```text", "push 3"),
    "</Stepper>",
    "",
    '<Stepper lines={["1", "2"]}>',
    "",
    "Empilha e soma.",
    "",
    "</Stepper>",
    "",
    '<Stepper lines={["1", "2"]}>',
    "",
    ...code("```text {1}", "push 2", "add"),
    "</Stepper>",
  ]),
  "artifacts/passos/passos.d2": twoBoards,
  "artifacts/passos/passos.svg":
    '<svg viewBox="0 0 10 10"><circle r="4" data-step="1" /><rect width="4" height="4" data-step="2" /></svg>\n',
  "artifacts/passos/cores.svg":
    '<svg viewBox="0 0 60 60"><g><circle cx="30" cy="30" r="22" class="fill-swatch-1" /><text x="30" y="30" data-swatch="1">1</text></g><circle r="4" data-step="2" /></svg>\n',
  "artifacts/passos/fora.svg":
    '<svg viewBox="0 0 10 10"><circle r="4" data-step="1" /><rect width="4" height="4" data-step="2-x" /></svg>\n',
  "artifacts/renomeado/index.mdx": artifact("r3n0m3ad", "Renomeado", [
    'import Passos from "@artifactory/design-system/stepper";',
    "",
    '<Passos lines={["1", "2"]}>',
    "",
    ...code("```text", "push 2", "add"),
    "</Passos>",
    "",
    "<Passos>",
    "",
    ...code("```text", "push 2"),
    "</Passos>",
  ]),
  "artifacts/aninhado/index.mdx": artifact("an1nhad0", "Aninhado", [
    'import Stepper from "@artifactory/design-system/stepper";',
    'import figura from "./figura.svg?raw";',
    "",
    '<Stepper figure={figura} alt="Os passos.">',
    "",
    '<Stepper lines={["1", "2"]}>',
    "",
    ...code("```text", "push 2", "add"),
    "</Stepper>",
    "",
    "</Stepper>",
  ]),
  "artifacts/aninhado/figura.svg":
    '<svg viewBox="0 0 10 10"><circle r="4" data-step="1" /><rect width="4" height="4" data-step="2" /></svg>\n',
  "artifacts/valido/index.mdx": artifact("val1d001", "Válido", [
    'import Stepper from "@artifactory/design-system/stepper";',
    "",
    "### Detalhes",
    "",
    '<Stepper lines={["1", "2"]}>',
    "",
    ...code("```text", "push 2", "add"),
    "</Stepper>",
  ]),
  "src/pages/pagina-de-passos.astro": [
    "---",
    'import Stepper from "@artifactory/design-system/stepper";',
    "---",
    "",
    "<!doctype html>",
    '<html lang="en">',
    "  <head>",
    '    <meta charset="utf-8" />',
    "    <title>Passos</title>",
    "  </head>",
    "  <body>",
    "    <Stepper><p>Empilha e soma.</p></Stepper>",
    "  </body>",
    "</html>",
    "",
  ].join("\n"),
};

describe("a repo whose components break their rules", () => {
  let repo: FixtureRepo;
  let run: CheckRun;

  beforeAll(async () => {
    repo = await createFixtureRepo(files);
    run = await repo.check(["--artifacts-only"]);
  }, checkTimeout);

  afterAll(() => repo.remove());

  const failure = (place: string, message: string) =>
    `${place} error component-rule: ${message} (artifact skill: Components)`;

  it("reports each broken Stepper at its own tag, by the name the entry imports it as", () => {
    expect(
      run.summary.filter(
        (line) => line.startsWith("artifacts/passos/") || line.startsWith("artifacts/renomeado/"),
      ),
    ).toEqual([
      failure(
        "artifacts/passos/index.mdx:28:1",
        "Stepper: give it one of `diagram`, `figure` or `lines`, or none of them and one fenced code block per step",
      ),
      failure(
        "artifacts/passos/index.mdx:30:1",
        "Stepper: a `diagram` Stepper holds nothing inside it: give it the `diagram` alone, or none of `diagram`, `figure` or `lines` and one fenced code block per step",
      ),
      failure(
        "artifacts/passos/index.mdx:38:1",
        "Stepper: swatches are only for a Figure or a Stage, so a figure Stepper draws none: draw the colouring as a Figure, or step through it in a Stage",
      ),
      failure(
        "artifacts/passos/index.mdx:40:1",
        'Stepper: data-step "2-x" must list numbers from 1 to 2, such as "2", "2-4", "2-" or "1-2, 5"',
      ),
      failure("artifacts/passos/index.mdx:42:1", "Stepper: it has 1 step; give it at least two"),
      failure(
        "artifacts/passos/index.mdx:50:1",
        "Stepper: it has 2 steps but 1 captions; give one caption per step",
      ),
      failure(
        "artifacts/passos/index.mdx:59:1",
        'Stepper: lines "4" must list numbers from 0 to 3, such as "1", "1-3", "1-" or "0-1, 4"',
      ),
      failure(
        "artifacts/passos/index.mdx:70:1",
        "Stepper: it has 1 code block and none of `diagram`, `figure` or `lines`: give it one fenced code block per step, at least two, or `lines` to step through one block",
      ),
      failure(
        "artifacts/passos/index.mdx:78:1",
        "Stepper: `lines` steps through one code block, but it has 2: keep one block, or take `lines` off to show one code block per step",
      ),
      failure(
        "artifacts/passos/index.mdx:90:1",
        "Stepper: put exactly one fenced code block inside `<Stepper lines>`",
      ),
      failure(
        "artifacts/passos/index.mdx:96:1",
        "Stepper: its code block marks lines with `{…}`, but a one-block Stepper marks them itself, step by step, with `lines`: take `{…}` off the fence",
      ),
      failure(
        "artifacts/renomeado/index.mdx:20:1",
        "Stepper: it has 1 code block and none of `diagram`, `figure` or `lines`: give it one fenced code block per step, at least two, or `lines` to step through one block",
      ),
    ]);
  });

  it("falls back to the entry's start when a component inside a broken one leaves the counts apart", () => {
    expect(run.summary.filter((line) => line.startsWith("artifacts/aninhado/"))).toEqual([
      failure(
        "artifacts/aninhado/index.mdx:1:1",
        "Stepper: a `figure` Stepper holds nothing inside it: give it the `figure` alone, or none of `diagram`, `figure` or `lines` and one fenced code block per step",
      ),
    ]);
  });

  it("fails a broken component on a page that isn't an artifact's at the config, naming the page", () => {
    expect(run.summary.filter((line) => line.startsWith("astro.config.ts"))).toEqual([
      failure(
        "astro.config.ts:1:1",
        "Stepper: it has 0 code blocks and none of `diagram`, `figure` or `lines`: give it one fenced code block per step, at least two, or `lines` to step through one block; on /pagina-de-passos/, which isn't an artifact's page",
      ),
    ]);
  });

  it("checks the built pages of every artifact without a broken component, and only those", () => {
    expect(run.summary.filter((line) => !line.includes(" error component-rule: "))).toEqual([
      "pnpm check: 15 failures",
      "artifacts/valido/index.mdx:11:5 error html-validate/heading-level: Heading level can only increase by one, expected <h2> but got <h3> (artifact skill: HTML)",
    ]);
  });

  it("fails the build at the end, leaving no question manifest, public paths manifest or build ID", () => {
    expect(run.exitCode).toBe(1);
    for (const file of ["question-manifest.json", "public-paths.json", "build-id.json"]) {
      expect(existsSync(join(repo.root, "dist-worker", file))).toBe(false);
    }
  });
});
