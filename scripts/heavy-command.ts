import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { linkSync, rmSync, writeFileSync } from "node:fs";
import { constants } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { checkEvidence, gitHead } from "./check/provenance.ts";
import {
  atomicJson,
  checkoutState,
  git,
  isRunning,
  persistJob,
  readJobs,
  readQueue,
  startTimeOf,
  type Holder,
  type Job,
} from "./heavy-state.ts";

const argv = process.argv.slice(2);
const [command, ...args] = argv;
if (
  command === undefined ||
  command === "" ||
  (command.startsWith("--") &&
    (command !== "--status" || args.length > 1 || (args.length === 1 && args[0] !== "--json")))
) {
  console.error("Usage: scripts/heavy <command> [arguments] | scripts/heavy --status [--json]");
  process.exit(2);
}
let state;
try {
  state = checkoutState();
} catch (error) {
  console.error(`scripts/heavy: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
}
const { slot, checkout, directory } = state;
if (command === "--status") {
  try {
    const jobs = readJobs(directory, checkout);
    const status = {
      schemaVersion: 1,
      checkout,
      git: {
        branch: git(["branch", "--show-current"]) || null,
        head: gitHead(),
        dirtyPaths: git(["status", "--porcelain=v1", "--no-renames", "-z", "--untracked-files=all"])
          .split("\0")
          .filter(Boolean)
          .map((line) => line.slice(3))
          .sort(),
      },
      queue: readQueue(slot),
      jobs: jobs.map((job) => ({
        id: job.id,
        argv: job.argv,
        checkout: job.checkout,
        state: job.state,
        queuedAt: job.queuedAt,
        startedAt: job.startedAt,
        endedAt: job.endedAt,
        exitCode: job.exitCode,
        signal: job.signal,
        checkReportPath: job.checkReportPath,
        logPath: job.logPath,
      })),
      check: checkEvidence(directory, checkout, jobs),
    };
    if (args[0] === "--json") console.log(JSON.stringify(status, null, 2));
    else {
      console.log(
        `${checkout} (${status.git.branch ?? "detached/unborn"}, ${status.git.head ?? "no HEAD"})`,
      );
      console.log(
        `Git: ${String(status.git.dirtyPaths.length)} dirty paths; queue: ${status.queue.state}`,
      );
      if (status.queue.holder !== null)
        console.log(
          `${status.queue.holder.command} in ${status.queue.holder.checkout} since ${status.queue.holder.since} (PID ${
            status.queue.holder.processes
              .filter(({ alive }) => alive)
              .map(({ pid }) => String(pid))
              .join(", ") || "none alive"
          })`,
        );
      for (const job of status.jobs)
        console.log(
          `${job.id}: ${job.state}${job.exitCode === null ? "" : ` exit ${String(job.exitCode)}`}${job.signal === null ? "" : ` ${job.signal}`} — ${job.argv.join(" ")}`,
        );
      console.log(
        `Check: ${status.check.applicability}; ${status.check.reportPath ?? "no local report"}`,
      );
    }
  } catch (error) {
    console.error(
      `scripts/heavy: status unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
  process.exit();
}
let inherited: string[];
try {
  const value: unknown = JSON.parse(process.env.ARTIFACTORY_HEAVY_QUEUES ?? "[]");
  if (!Array.isArray(value) || !value.every((item: unknown) => typeof item === "string"))
    throw new Error("invalid queue ancestry");
  inherited = value;
} catch {
  console.error(
    "scripts/heavy: invalid inherited queue identity; run a separate top-level heavy job.",
  );
  process.exit(2);
}
if (inherited.includes(slot)) {
  console.error(
    "scripts/heavy: cannot acquire the same common-Git queue inside its own heavy job. Use the unwrapped inner executable within the existing job, or separate top-level jobs.",
  );
  process.exit(2);
}
const me: Holder = {
  processes: [{ pid: process.pid, startTime: startTimeOf(process.pid) }],
  command: argv.join(" "),
  checkout,
  since: new Date().toISOString(),
};
const id = randomUUID();
const job: Job = {
  id,
  argv,
  checkout,
  state: "queued",
  queuedAt: me.since,
  startedAt: null,
  endedAt: null,
  exitCode: null,
  signal: null,
  checkReportPath:
    command.endsWith("node") &&
    args[0] !== undefined &&
    resolve(args[0]) === join(checkout, "scripts/check/main.ts")
      ? join(directory, "checks", `${id}.json`)
      : null,
  logPath: null,
  processes: me.processes,
};
recordJob();

function recordJob(): void {
  const error = persistJob(directory, job);
  // A check's child already printed its closing block; metadata errors must leave it last.
  if (error !== null && (job.checkReportPath === null || job.state !== "completed"))
    console.error(`scripts/heavy: job evidence unavailable: ${error}`);
}

const draft = `${slot}.${String(process.pid)}`;

// Linking a finished file makes the slot appear whole, so no one reads it half-written.
function take(): boolean {
  writeFileSync(draft, JSON.stringify(me));
  try {
    linkSync(draft, slot);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw error;
  } finally {
    rmSync(draft);
  }
}

let waited = false;
while (!take()) {
  const holder = readQueue(slot).holder;
  const running = holder?.processes.filter(isRunning) ?? [];
  // A slot only ever appears whole, so one that can't be read is as stale as one whose holder ended.
  if (holder === null || running.length === 0) {
    rmSync(slot, { force: true });
    continue;
  }
  if (!waited) {
    const since = new Date(holder.since).toLocaleTimeString();
    const pids = running.map(({ pid }) => String(pid)).join(", ");
    console.error(
      `Waiting to run ${me.command}: ${holder.command} has been running since ${since} in ${holder.checkout} (PID ${pids}). This command hasn't started; it starts once that one ends.`,
    );
    waited = true;
  }
  await sleep(2000);
}
process.on("exit", () => {
  if (readQueue(slot).holder?.processes[0]?.pid === process.pid) rmSync(slot, { force: true });
});
if (waited) console.error(`Starting ${me.command}.`);
job.state = "running";
job.startedAt = new Date().toISOString();
recordJob();

// Where agents share a small memory slice, systemd-oomd kills a whole agent scope, the jobs it
// started included, once that slice is under memory pressure. So the command runs in a scope
// of its own under the heavy slice, outside the agents' slice, with a memory limit of its own: a
// job that outgrows it dies alone (exit 137). `--scope` runs the command in this process's child,
// so its PID is the one the slot records. Where no user manager can start a scope, as on CI, the
// command runs here.
const heavySlice = ["--user", "--scope", "--quiet", "--collect", "--slice=artifactory-heavy.slice"];
function userScopes(): boolean {
  try {
    execFileSync("systemd-run", [...heavySlice, "true"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// The user's memory is capped too, and agents share it with this command. Put the command first
// in line for the kernel's out-of-memory killer, so a job is killed rather than an agent. Its
// processes inherit this before they start. Only Linux has the file; elsewhere nothing changes.
try {
  writeFileSync("/proc/self/oom_score_adj", "1000");
} catch {
  // Not Linux, or a sandbox that hides /proc.
}

const env = {
  ...process.env,
  ARTIFACTORY_HEAVY_QUEUES: JSON.stringify([...inherited, slot]),
  ARTIFACTORY_HEAVY_JOB_ID: id,
};
const child = userScopes()
  ? spawn("systemd-run", [...heavySlice, "-p", "MemoryMax=3G", "--", command, ...args], {
      stdio: "inherit",
      env,
    })
  : spawn(command, args, { stdio: "inherit", env });
if (child.pid !== undefined) {
  me.processes.push({ pid: child.pid, startTime: startTimeOf(child.pid) });
  atomicJson(slot, me);
  recordJob();
}
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", (error) => {
  console.error(`${command} didn't start: ${error.message}`);
  complete(1, null);
});
child.on("exit", (code, signal) => {
  complete(code, signal);
});

function complete(code: number | null, signal: NodeJS.Signals | null): void {
  job.state = "completed";
  job.endedAt = new Date().toISOString();
  job.exitCode = code;
  job.signal = signal;
  recordJob();
  process.exitCode = code ?? 128 + (signal === null ? 0 : constants.signals[signal]);
}
