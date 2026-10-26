import { existsSync } from "node:fs";
import { chmod, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  checkTimeout,
  createFixtureRepo,
  headCommit,
  succeeds,
  type CheckRun,
  type FixtureRepo,
} from "./fixture-repo.ts";

describe("a repo with an artifact whose question breaks its component's rules, unformatted platform code, a misplaced test and a stale component reference", () => {
  let repo: FixtureRepo;
  let run: CheckRun;
  let lastPassed: string;

  const expectedFailures = [
    "artifacts/one-option/index.mdx:22:1 error build: SingleChoice: it has 1 option; give it at least two (artifact skill: Build failures)",
    "astro.config.ts:1:1 error prettier: is not formatted; run `pnpm format` (artifact skill: Platform changes)",
    "design-system/COMPONENTS.md:1:1 error component-reference: is out of date with the design system's source; run `pnpm components` (artifact skill: Platform changes)",
    "src/pages/404.astro:2:7 error TS2322: Type 'string' is not assignable to type 'number'. (artifact skill: Platform changes)",
    "src/stray.spec.ts:1:1 error knip/files: `src/stray.spec.ts` is unused (artifact skill: Platform changes)",
    "src/stray.spec.ts:1:1 error test-placement: Vitest runs only *.test.ts files in a seam folder: tests/check, tests/worker, tests/store, tests/scoring (artifact skill: Platform changes)",
  ];

  beforeAll(async () => {
    repo = await createFixtureRepo({
      "artifacts/one-option/index.mdx": [
        "---",
        "id: 0n3opt10",
        "title: One option",
        "subject: Biology",
        "lang: pt-BR",
        "published: 2026-10-15",
        "---",
        "",
        'import OpenQuestion from "@artifactory/design-system/open-question";',
        'import SingleChoice from "@artifactory/design-system/single-choice";',
        "",
        '<OpenQuestion id="por-que">',
        "",
        "Por quê?",
        "",
        "---",
        "",
        "Porque sim.",
        "",
        "</OpenQuestion>",
        "",
        '<SingleChoice id="uma-opcao" answer={1}>',
        "",
        "Qual?",
        "",
        "1. Só esta",
        "",
        "</SingleChoice>",
        "",
      ].join("\n"),
      "astro.config.ts": [
        'import mdx from "@astrojs/mdx";',
        'import { defineConfig } from "astro/config";',
        'import { builtOutput } from "./src/built-output.ts";',
        'import { richContent } from "./src/rich-content.ts";',
        'export default defineConfig({ output: "static", prerenderConflictBehavior: "error", integrations: [builtOutput(), richContent(), mdx(), { name: "fixture-types", hooks: { "astro:config:done": ({ injectTypes }) => { injectTypes({ filename: "fixture.d.ts", content: "declare namespace App { interface Locals { fixtureTitle: number; } }" }); } } }] });',
        "",
      ].join("\n"),
      "src/pages/404.astro": [
        "---",
        'const title: typeof Astro.locals.fixtureTitle = "Not found";',
        "---",
        "",
        "<!doctype html>",
        '<html lang="en">',
        "  <head>",
        '    <meta charset="utf-8" />',
        "    <title>Not found</title>",
        "  </head>",
        "  <body>",
        "    <h1>{title}</h1>",
        "  </body>",
        "</html>",
        "",
      ].join("\n"),
      "design-system/COMPONENTS.md":
        "# Components\n\nA reference generated before the components changed.\n",
      "src/stray.spec.ts":
        'import { expect, it } from "vitest";\n\nit("runs", () => {\n  expect(1).toBe(1);\n});\n',
    });
    lastPassed = await headCommit(repo);
    run = await repo.check(["--last-passed", lastPassed]);
  }, checkTimeout);

  afterAll(() => repo.remove());

  it("records full selection, actual failed/skipped steps and nonzero completion without current green evidence", async () => {
    const { status, report } = await evidence(repo);
    expect(status.check.applicability).toBe("unknown");
    expect(report).toMatchObject({
      schemaVersion: 1,
      checkout: repo.root,
      head: lastPassed,
      options: { artifactsOnly: false, lastPassed },
      scope: "last-passed",
      exitCode: 1,
      failureCount: 6,
    });
    expect(report.failures).toEqual(expectedFailures);
    expect(report.steps).toContainEqual({
      name: "artifact pages",
      state: "skipped",
      elapsedMs: null,
      failureCount: 0,
      reason: "the build failed",
    });
    expect(report.steps.some((step) => step.name === "Vitest" && step.state === "passed")).toBe(
      true,
    );
    expect(report.source.start).toBe(report.source.end);
    expect(report.source.drifted).toBe(false);
  });

  it("reports every failure in one run and exits non-zero", () => {
    expect(run.exitCode).toBe(1);
    expect(run.summary.slice(1)).toEqual(expectedFailures);
  });

  it("closes with a block that counts the failures and repeats every line", () => {
    expect(run.summary[0]).toBe("pnpm check: 6 failures");
    const beforeSummary = run.output.slice(0, run.output.lastIndexOf("pnpm check: 6 failures"));
    for (const failure of expectedFailures) expect(beforeSummary).toContain(failure);
    for (const step of ["astro build", "astro check", "Vitest"]) {
      expect(beforeSummary).toMatch(
        new RegExp(`^pnpm check: ${step} (passed|failed) \\(\\d+\\.\\d{3}s\\)$`, "m"),
      );
    }
  });

  it("skips only the checks that need the built output when the build fails", () => {
    expect(run.output).toContain(
      "pnpm check: skipped artifact pages, html-validate, custom build runs: the build failed",
    );
    expect(run.output).not.toMatch(
      /pnpm check: (artifact pages|html-validate|custom build runs) (passed|failed)/,
    );
    expect(run.output).toContain("pnpm check: astro check failed");
    expect(run.output).toContain("pnpm check: tsc passed");
    expect(run.output).toContain("pnpm check: ESLint passed");
  });

  it("checks Astro pages against integration-provided types after a component fails to build", () => {
    expect(run.summary).toContain(
      "src/pages/404.astro:2:7 error TS2322: Type 'string' is not assignable to type 'number'. (artifact skill: Platform changes)",
    );
  });

  it("runs Vitest when a platform file changed since the last commit that passed", () => {
    expect(run.output).toMatch(
      new RegExp(`^pnpm check: running Vitest: \\S+ changed since ${lastPassed}$`, "m"),
    );
    expect(run.output).toContain("pnpm check: Vitest passed");
    expect(run.output).not.toContain("skipped Vitest");
  });
});

describe("an artifact whose numeric question's key can't work", () => {
  let repo: FixtureRepo;
  let run: CheckRun;

  beforeAll(async () => {
    repo = await createFixtureRepo({
      "artifacts/queda-livre/index.mdx": [
        "---",
        "id: qu3d4l1v",
        "title: Queda livre",
        "subject: Física",
        "lang: pt-BR",
        "published: 2026-10-15",
        "---",
        "",
        'import NumericQuestion from "@artifactory/design-system/numeric-question";',
        "",
        "Uma pedra cai a partir do repouso.",
        "",
        '<NumericQuestion id="gravidade" answer="9,81" unit="m/s²">',
        "",
        "Qual é a aceleração da pedra?",
        "",
        "</NumericQuestion>",
        "",
      ].join("\n"),
    });
    run = await repo.check(["--artifacts-only"]);
  }, checkTimeout);

  afterAll(() => repo.remove());

  it("fails the build at the question with the key's problem", () => {
    expect(run.exitCode).toBe(1);
    expect(run.summary).toEqual([
      "pnpm check: 1 failure",
      'artifacts/queda-livre/index.mdx:13:1 error build: NumericQuestion: `answer` is "9,81"; write its decimals after `.`, not `,` (artifact skill: Build failures)',
    ]);
  });
});

describe("an artifact whose MDX won't compile", () => {
  let repo: FixtureRepo;
  let run: CheckRun;

  beforeAll(async () => {
    repo = await createFixtureRepo({
      "artifacts/unclosed-tag/index.mdx": [
        "---",
        "id: unc10sed",
        "title: Unclosed tag",
        "subject: Biology",
        "lang: pt-BR",
        "published: 2026-10-15",
        "---",
        "",
        "Texto.",
        "<div>",
        "",
      ].join("\n"),
      "artifacts/unclosed-tag/passos.build.ts": [
        'import { defineBuild } from "@artifactory/design-system/stage-build";',
        "",
        "export default defineBuild({ steps: () => [{ say: 'Começa.' }] });",
        "",
      ].join("\n"),
    });
    run = await repo.check(["--artifacts-only"]);
  }, checkTimeout);

  afterAll(() => repo.remove());

  it("reports the syntax error at its line in the artifact's source, and nothing about the build beside it", () => {
    expect(run.exitCode).toBe(1);
    expect(run.summary).toEqual([
      "pnpm check: 1 failure",
      "artifacts/unclosed-tag/index.mdx:10:1 error build: 10:1: Expected a closing tag for `<div>` (10:1) (mdx-jsx:unexpected-character) (artifact skill: Build failures)",
    ]);
  });
});

interface CheckEvidence {
  schemaVersion: number;
  scope: string;
  exitCode: number | null;
  source: { start: string | null; end: string | null; drifted: boolean | null; limit: string };
  failures: string[];
  steps: { name: string; state: string; reason: string | null }[];
}

interface LocalStatus {
  git: { dirtyPaths: string[] };
  jobs: { id: string; state: string; exitCode: number | null; checkReportPath: string | null }[];
  check: { reportPath: string | null; applicability: string };
}

async function statusOf(repo: FixtureRepo): Promise<LocalStatus> {
  const result = await repo.run("node", ["scripts/heavy-command.ts", "--status", "--json"]);
  expect(result.exitCode).toBe(0);
  return JSON.parse(result.stdout) as LocalStatus;
}

async function evidence(repo: FixtureRepo) {
  const status = await statusOf(repo);
  expect(status.check.reportPath).not.toBeNull();
  const report = JSON.parse(await readFile(status.check.reportPath ?? "", "utf8")) as CheckEvidence;
  return { status, report };
}

describe("check evidence for a working tree", () => {
  let repo: FixtureRepo;
  let full: CheckRun;
  let baseline: CheckEvidence;
  let reportPath: string;
  let admin: string;

  beforeAll(async () => {
    repo = await createFixtureRepo({ ".scratch/input.txt": "first\n" });
    admin = (await repo.run("git", ["rev-parse", "--absolute-git-dir"])).stdout.trim();
    full = await repo.check();
    const observed = await evidence(repo);
    baseline = observed.report;
    reportPath = observed.status.check.reportPath ?? "";
  }, checkTimeout);

  afterAll(() => repo.remove());

  it("attaches full success to actual tracked and nonignored working content without staging it", async () => {
    expect(full.exitCode).toBe(0);
    expect(full.summary).toEqual(["pnpm check: 0 failures"]);
    expect(baseline).toMatchObject({
      schemaVersion: 1,
      scope: "full",
      exitCode: 0,
      failureCount: 0,
      options: { artifactsOnly: false, lastPassed: null },
    });
    expect(baseline.source.start).toMatch(/^[a-f0-9]{64}$/);
    expect(baseline.source.end).toBe(baseline.source.start);
    expect(baseline.source.drifted).toBe(false);
    expect(baseline.source.limit).toContain("do not edit during verification");
    expect((await statusOf(repo)).check.applicability).toBe("current");
    expect((await repo.run("git", ["diff", "--cached", "--name-only"])).stdout).toBe("");

    const input = join(repo.root, ".scratch/input.txt");
    const tracked = join(repo.root, "README.md");
    const original = await readFile(tracked, "utf8");
    for (const content of ["second\n", "third\n"]) {
      await writeFile(input, content);
      expect((await statusOf(repo)).check.applicability).toBe("stale");
    }
    await rm(input);
    expect((await statusOf(repo)).check.applicability).toBe("stale");
    await writeFile(input, "first\n");
    for (const content of [original + "\nFirst edit.\n", original + "\nSecond edit.\n"]) {
      await writeFile(tracked, content);
      const dirty = await statusOf(repo);
      expect(dirty.git.dirtyPaths).toContain("README.md");
      expect(dirty.check.applicability).toBe("stale");
    }
    await writeFile(tracked, original);
    await chmod(tracked, 0o755);
    expect((await statusOf(repo)).check.applicability).toBe("stale");
    await chmod(tracked, 0o644);
    await rename(tracked, join(repo.root, "README-renamed.md"));
    expect((await statusOf(repo)).check.applicability).toBe("stale");
    await rename(join(repo.root, "README-renamed.md"), tracked);
    for (const generated of [".look", ".astro", ".build", "dist", "sources"]) {
      await mkdir(join(repo.root, generated), { recursive: true });
      await writeFile(join(repo.root, generated, "private.txt"), "ignored content");
    }
    expect((await statusOf(repo)).check.applicability).toBe("current");
  });

  it(
    "records the comparison, actual skipped tests and changes during a last-passed run without replacing command success",
    async () => {
      const lastPassed = await headCommit(repo);
      const run = repo.check(["--last-passed", lastPassed]);
      const checks = join(admin, "artifactory-heavy/checks");
      let newReport: string | undefined;
      for (let attempt = 0; attempt < 200 && newReport === undefined; attempt++) {
        newReport = (await readdir(checks)).find(
          (name) => join(checks, name) !== reportPath && name.endsWith(".json"),
        );
        if (newReport === undefined) await sleep(50);
      }
      expect(newReport).toBeDefined();
      await writeFile(join(repo.root, ".scratch/input.txt"), "changed during verification\n");
      const scoped = await run;
      expect(scoped.exitCode).toBe(0);
      expect(scoped.output).toContain("pnpm check: skipped Vitest:");
      const observed = await evidence(repo);
      expect(observed.report).toMatchObject({
        scope: "last-passed",
        options: { artifactsOnly: false, lastPassed },
        exitCode: 0,
        failureCount: 0,
      });
      expect(observed.report.source.start).not.toBe(observed.report.source.end);
      expect(observed.report.source.drifted).toBe(true);
      expect(observed.status.check.applicability).not.toBe("current");
      await writeFile(join(repo.root, ".scratch/input.txt"), "first\n");
      expect((await statusOf(repo)).check.applicability).not.toBe("current");
    },
    checkTimeout,
  );

  it.each(["checks", "jobs"])(
    "keeps artifact-only success qualified and the combined gate footer final when %s evidence fails",
    async (directory) => {
      const scoped = await repo.check(["--artifacts-only"]);
      expect(scoped.exitCode).toBe(0);
      expect(scoped.output).toContain("Full-scope checking is required before publication.");
      const observed = await evidence(repo);
      expect(observed.report).toMatchObject({
        scope: "artifacts-only",
        options: { artifactsOnly: true, lastPassed: null },
        exitCode: 0,
        failureCount: 0,
      });
      expect(observed.report.source.drifted).toBe(false);
      expect(observed.status.check.applicability).toBe("unknown");

      const checks = join(admin, "artifactory-heavy/checks");
      const target = join(admin, "artifactory-heavy", directory);
      const backup = `${target}-saved`;
      const previous = new Set(await readdir(checks));
      const run = repo.run("bash", [
        "-c",
        directory === "checks" ? "pnpm check --artifacts-only 2>&1" : "pnpm check 2>&1",
      ]);
      let replaced = false;
      try {
        let runningReport: string | undefined;
        for (let attempt = 0; attempt < 200 && runningReport === undefined; attempt++) {
          runningReport = (await readdir(checks)).find(
            (name) => !previous.has(name) && name.endsWith(".json"),
          );
          if (runningReport === undefined) await sleep(50);
        }
        expect(runningReport).toBeDefined();
        const initial = JSON.parse(
          await readFile(join(checks, runningReport ?? ""), "utf8"),
        ) as CheckEvidence;
        expect(initial.exitCode).toBeNull();
        await rename(target, backup);
        replaced = true;
        await writeFile(target, "not a directory");
        const withoutSidecar = await run;
        expect(withoutSidecar.exitCode).toBe(0);
        if (directory === "checks") {
          expect(withoutSidecar.output).toContain("pnpm check: provenance unavailable:");
        } else {
          const report = JSON.parse(
            await readFile(join(checks, runningReport ?? ""), "utf8"),
          ) as CheckEvidence;
          expect(report).toMatchObject({ scope: "full", exitCode: 0, failureCount: 0 });
          expect(report.steps.every((step) => step.state === "passed")).toBe(true);
          expect(withoutSidecar.output).not.toContain("pnpm check: provenance unavailable:");
        }
        expect(withoutSidecar.output.trimEnd().endsWith("\npnpm check: 0 failures")).toBe(true);
        expect((await statusOf(repo)).check.applicability).toBe("unknown");
      } finally {
        await run;
        if (replaced) {
          await rm(target);
          await rename(backup, target);
        }
      }
      expect((await statusOf(repo)).check.applicability).toBe("unknown");
    },
    checkTimeout,
  );

  it(
    "keeps terminal metadata diagnostics and the payload exit code for ordinary heavy jobs",
    async () => {
      const jobs = join(admin, "artifactory-heavy/jobs");
      const backup = `${jobs}-saved`;
      const run = repo.run("node", [
        "scripts/heavy-command.ts",
        "bash",
        "-c",
        'mv "$1" "$2" && printf blocked > "$1" && exit 7',
        "fixture",
        jobs,
        backup,
      ]);
      try {
        const failedMetadata = await run;
        expect(failedMetadata.exitCode).toBe(7);
        expect(failedMetadata.output).toContain("scripts/heavy: job evidence unavailable:");
        expect((await statusOf(repo)).check.applicability).toBe("unknown");
      } finally {
        await run;
        if (existsSync(backup)) {
          await rm(jobs);
          await rename(backup, jobs);
        }
      }
    },
    checkTimeout,
  );

  it(
    "keeps the latest incomplete, corrupt or missing attempt unknown instead of exposing an older success",
    async () => {
      const run = repo.run("node", [
        "scripts/heavy-command.ts",
        "node",
        "scripts/check/main.ts",
        "--artifacts-only",
      ]);
      let running: LocalStatus | undefined;
      for (let attempt = 0; attempt < 200; attempt++) {
        const observed = await statusOf(repo);
        const newest = observed.jobs[0];
        if (
          newest?.state === "running" &&
          newest.checkReportPath !== null &&
          existsSync(newest.checkReportPath)
        ) {
          const report = JSON.parse(
            await readFile(newest.checkReportPath, "utf8"),
          ) as CheckEvidence;
          if (report.exitCode === null) {
            running = observed;
            break;
          }
        }
        await sleep(25);
      }
      expect(running).toBeDefined();
      expect(running?.check.applicability).toBe("unknown");
      const latest = running?.check.reportPath ?? "";
      const pids = await repo.run("pgrep", [
        "-f",
        "(^|/)node scripts/check/main.ts --artifacts-only$",
      ]);
      for (const pid of pids.stdout
        .trim()
        .split("\n")
        .map(Number)
        .filter((pid) => pid > 0)) {
        const cwd = await repo.run("readlink", [`/proc/${String(pid)}/cwd`]);
        if (cwd.stdout.trim() === repo.root) process.kill(pid, "SIGTERM");
      }
      const interrupted = await run;
      expect(interrupted.exitCode).toBe(143);
      const incomplete = JSON.parse(await readFile(latest, "utf8")) as CheckEvidence;
      expect(incomplete.exitCode).toBeNull();
      expect((await statusOf(repo)).check.applicability).toBe("unknown");
      await writeFile(latest, "corrupt");
      expect((await statusOf(repo)).check.applicability).toBe("unknown");
      await rm(latest);
      expect((await statusOf(repo)).check.applicability).toBe("unknown");
      await succeeds(repo.run("git", ["diff", "--exit-code", "--cached"]));
    },
    checkTimeout,
  );
});
