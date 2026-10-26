import { createHash, randomUUID } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, readlinkSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  atomicJson,
  checkoutState,
  evidenceFiles,
  git,
  object,
  readJson,
  type Job,
} from "../heavy-state.ts";

interface StepResult {
  name: string;
  state: "passed" | "failed" | "skipped";
  elapsedMs: number | null;
  failureCount: number;
  reason: string | null;
}

interface CheckReport {
  schemaVersion: 1;
  runId: string;
  checkout: string;
  head: string | null;
  options: { artifactsOnly: boolean; lastPassed: string | null };
  scope: "full" | "artifacts-only" | "last-passed";
  startedAt: string;
  endedAt: string | null;
  steps: StepResult[];
  exitCode: number | null;
  failureCount: number | null;
  failures: string[];
  source: { start: string | null; end: string | null; drifted: boolean | null; limit: string };
}

function fingerprint(): string | null {
  try {
    const files = [
      ...new Set(
        git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
          .split("\0")
          .filter(Boolean),
      ),
    ].sort();
    const hash = createHash("sha256");
    for (const file of files) {
      hash.update(JSON.stringify(file) + "\0");
      let stat;
      try {
        stat = lstatSync(file);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        hash.update("missing\0");
        continue;
      }
      hash.update(`${String(stat.mode)}\0`);
      if (stat.isSymbolicLink()) hash.update(readlinkSync(file));
      else if (stat.isFile()) hash.update(readFileSync(file));
      else return null;
      hash.update("\0");
    }
    return hash.digest("hex");
  } catch {
    return null;
  }
}

export function gitHead(): string | null {
  try {
    return git(["rev-parse", "--verify", "HEAD"]);
  } catch {
    return null;
  }
}

export function beginCheck(options: { artifactsOnly: boolean; lastPassed: string | null }) {
  const { checkout, directory } = checkoutState();
  const runId = process.env.ARTIFACTORY_HEAVY_JOB_ID ?? randomUUID();
  const path = join(directory, "checks", `${runId}.json`);
  const report: CheckReport = {
    schemaVersion: 1,
    runId,
    checkout,
    head: gitHead(),
    options,
    scope: options.artifactsOnly
      ? "artifacts-only"
      : options.lastPassed === null
        ? "full"
        : "last-passed",
    startedAt: new Date().toISOString(),
    endedAt: null,
    steps: [],
    exitCode: null,
    failureCount: null,
    failures: [],
    source: {
      start: fingerprint(),
      end: null,
      drifted: null,
      limit:
        "Endpoint fingerprints do not provide snapshot isolation; do not edit during verification.",
    },
  };
  let available = true;
  function save(): void {
    try {
      mkdirSync(join(directory, "checks"), { recursive: true });
      atomicJson(path, report);
    } catch (error) {
      available = false;
      // A failed sidecar update must leave incomplete evidence, never an earlier completed report.
      try {
        rmSync(path, { force: true });
      } catch {
        /* The queue job still identifies this attempt. */
      }
      console.error(
        `pnpm check: provenance unavailable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  save();
  return {
    step(result: StepResult): void {
      report.steps.push(result);
    },
    finish(exitCode: number, failures: string[]): void {
      report.endedAt = new Date().toISOString();
      report.exitCode = exitCode;
      report.failureCount = failures.length;
      report.failures = failures;
      report.source.end = fingerprint();
      report.source.drifted =
        report.source.start === null || report.source.end === null
          ? null
          : report.source.start !== report.source.end;
      if (available) save();
    },
  };
}

export function checkEvidence(directory: string, checkout: string, jobs: Job[]) {
  let files: string[];
  try {
    files = evidenceFiles(join(directory, "checks"));
  } catch {
    return { reportPath: null, applicability: "unknown" as const };
  }
  const candidates = new Map<string, string>();
  let unavailable = jobs.some((job) => job.queuedAt === "");
  for (const file of files) {
    try {
      const report = readJson(file);
      if (!object(report) || typeof report.startedAt !== "string")
        throw new Error("invalid report");
      candidates.set(file, report.startedAt);
    } catch {
      unavailable = true;
    }
  }
  for (const job of jobs)
    if (job.checkReportPath !== null)
      candidates.set(job.checkReportPath, job.startedAt ?? job.queuedAt);
  const latest = [...candidates].sort((a, b) => b[1].localeCompare(a[1]))[0]?.[0] ?? null;
  const unknown = { reportPath: latest, applicability: "unknown" as const };
  if (unavailable) return unknown;
  if (latest === null) return { reportPath: null, applicability: "none" as const };
  const job = jobs.find((candidate) => candidate.checkReportPath === latest);
  if (job !== undefined && (job.state !== "completed" || job.exitCode !== 0 || job.signal !== null))
    return unknown;
  try {
    const report = readJson(latest);
    if (
      !object(report) ||
      report.schemaVersion !== 1 ||
      report.checkout !== checkout ||
      !object(report.source) ||
      !object(report.options) ||
      !Array.isArray(report.steps) ||
      report.steps.length === 0 ||
      report.exitCode !== 0 ||
      report.failureCount !== 0 ||
      typeof report.endedAt !== "string" ||
      typeof report.source.start !== "string" ||
      typeof report.source.end !== "string" ||
      report.source.drifted !== false ||
      report.scope !== "full" ||
      report.options.artifactsOnly !== false ||
      report.options.lastPassed !== null ||
      !report.steps.every((step: unknown) => object(step) && step.state === "passed")
    )
      return unknown;
    const current = fingerprint();
    if (current === null) return unknown;
    return {
      reportPath: latest,
      applicability:
        report.source.start === report.source.end &&
        current === report.source.end &&
        gitHead() === report.head
          ? ("current" as const)
          : ("stale" as const),
    };
  } catch {
    return unknown;
  }
}
