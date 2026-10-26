import { performance } from "node:perf_hooks";
import { parseArgs } from "node:util";
import { closingBlock, formatFailure, type Failure } from "../../src/check-failure.ts";
import { testsVerdictSince } from "./changes-since.ts";
import { beginCheck } from "./provenance.ts";
import type { Step } from "./step.ts";
import { artifactChecks } from "./steps/artifact-checks.ts";
import { artifactPages } from "./steps/artifact-pages.ts";
import { artifactTypes } from "./steps/artifact-types.ts";
import { astroCheck } from "./steps/astro-check.ts";
import { build } from "./steps/build.ts";
import { componentReferenceFreshness } from "./steps/component-reference.ts";
import { customBuildRuns } from "./steps/custom-build-runs.ts";
import { eslint } from "./steps/eslint.ts";
import { htmlValidation } from "./steps/html-validate.ts";
import { knip } from "./steps/knip.ts";
import { prettier } from "./steps/prettier.ts";
import { testPlacement } from "./steps/test-placement.ts";
import { restrictedBuildTypes, tsc } from "./steps/tsc.ts";
import { vitest } from "./steps/vitest.ts";

const root = process.cwd();
const options = parseArgs({
  options: { "last-passed": { type: "string" }, "artifacts-only": { type: "boolean" } },
}).values;
if (options["artifacts-only"] && options["last-passed"] !== undefined) {
  console.error("pnpm check: --artifacts-only cannot be combined with --last-passed");
  console.error("Usage: pnpm check [--last-passed <sha>] | pnpm check --artifacts-only");
  process.exit(2);
}

const provenance = beginCheck({
  artifactsOnly: options["artifacts-only"] ?? false,
  lastPassed: options["last-passed"] ?? null,
});

if (options["artifacts-only"]) {
  for (const step of [astroCheck, tsc, eslint, prettier, vitest]) {
    provenance.step({
      name: step.name,
      state: "skipped",
      elapsedMs: null,
      failureCount: 0,
      reason: "--artifacts-only",
    });
  }
}

// These read the types Astro generates once it has synced content. Without them every
// `astro:content` import becomes a spurious type error.
const stepsNeedingContentTypes = options["artifacts-only"]
  ? [artifactTypes, restrictedBuildTypes]
  : [astroCheck, artifactTypes, tsc, eslint];
const stepsNeedingBuiltOutput = [artifactPages, htmlValidation, customBuildRuns];

function qualifyScope(): void {
  if (!options["artifacts-only"]) return;
  console.log(
    "pnpm check: artifact scope (--artifacts-only): restricted artifact and catalog build TSC still runs; omitted: Astro template check, root and Worker TSC, ESLint, Prettier, Vitest. Full-scope checking is required before publication.",
  );
}

function report(name: string, failures: Failure[], elapsedMs: number): Failure[] {
  provenance.step({
    name,
    state: failures.length === 0 ? "passed" : "failed",
    elapsedMs,
    failureCount: failures.length,
    reason: null,
  });
  console.log(
    `pnpm check: ${name} ${failures.length === 0 ? "passed" : "failed"} (${(elapsedMs / 1000).toFixed(3)}s)`,
  );
  for (const failure of failures) console.log(formatFailure(failure));
  return failures;
}

// One step at a time: each runs a TypeScript program or a build, and the Vitest step runs whole
// fixture checks. Side by side they need more than the 7 GB a development machine may have.
async function runInTurn(steps: Step[]): Promise<Failure[]> {
  const failures: Failure[] = [];
  for (const step of steps) {
    const started = performance.now();
    const result = await step.run(root);
    failures.push(...report(step.name, result, performance.now() - started));
  }
  return failures;
}

function skip(steps: Step[], reason: string): Step[] {
  for (const step of steps)
    provenance.step({
      name: step.name,
      state: "skipped",
      elapsedMs: null,
      failureCount: 0,
      reason,
    });
  console.log(`pnpm check: skipped ${steps.map((step) => step.name).join(", ")}: ${reason}`);
  return [];
}

async function buildThenStepsNeedingIt(): Promise<Failure[]> {
  const started = performance.now();
  const { failures, contentSynced, builtOutput } = await build(root);
  report("astro build", failures, performance.now() - started);
  const steps = [
    ...(contentSynced
      ? stepsNeedingContentTypes
      : skip(stepsNeedingContentTypes, "the build failed before Astro synced content")),
    ...(builtOutput ? stepsNeedingBuiltOutput : skip(stepsNeedingBuiltOutput, "the build failed")),
  ];
  return [...failures, ...(await runInTurn(steps))];
}

// A commit that passed already ran these tests, and they can't give a different result unless a
// file they read has changed since.
async function vitestIfTestsAffected(): Promise<Step[]> {
  const lastPassed = options["last-passed"];
  if (lastPassed === undefined) return [vitest];
  const { affected, reason } = await testsVerdictSince(root, lastPassed);
  if (!affected) return skip([vitest], reason);
  console.log(`pnpm check: running Vitest: ${reason}`);
  return [vitest];
}

function byPosition(a: Failure, b: Failure): number {
  return (
    a.file.localeCompare(b.file) ||
    a.line - b.line ||
    a.column - b.column ||
    formatFailure(a).localeCompare(formatFailure(b))
  );
}

qualifyScope();
const independentSteps = [
  artifactChecks,
  componentReferenceFreshness,
  ...(options["artifacts-only"] ? [] : [prettier]),
  knip,
  ...(options["artifacts-only"] ? [] : await vitestIfTestsAffected()),
  testPlacement,
];
const failures = [...(await buildThenStepsNeedingIt()), ...(await runInTurn(independentSteps))];
const lines = [...new Set(failures.sort(byPosition).map(formatFailure))];

qualifyScope();
process.exitCode = lines.length === 0 ? 0 : 1;
provenance.finish(process.exitCode, lines);
console.log(["", ...closingBlock(lines)].join("\n"));
