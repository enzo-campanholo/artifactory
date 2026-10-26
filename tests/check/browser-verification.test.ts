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
          "---",
          `id: ${id}`,
          `title: ${slug}`,
          "subject: Artifactory",
          "lang: en",
          "published: 2026-10-25",
          "---",
          "",
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
        const result = await repo.run("pnpm", ["look", slug]);
        const output = join(repo.root, ".look", slug);
        const report = JSON.parse(await readFile(join(output, "results.json"), "utf8")) as {
          cases: {
            id: string;
            outcome: string;
            assertions: { name: string; expected: unknown; actual: unknown; passed: boolean }[];
            captures: string[];
          }[];
        };
        const evidence = process.env.ARTIFACTORY_BROWSER_EVIDENCE;
        if (evidence) {
          await cp(output, join(evidence, slug), { recursive: true });
          await writeFile(join(evidence, `${slug}.log`), result.output);
        }
        expect(result.exitCode, result.output).toBe(slug === "look-stuck" ? 1 : 0);
        expect(report.cases.map((test) => test.id)).toEqual(["look-393", "look-1920"]);
        for (const test of report.cases) {
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
