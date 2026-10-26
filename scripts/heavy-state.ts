import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";

export interface ProcessIdentity {
  pid: number;
  startTime: string | null;
}

export interface Holder {
  processes: ProcessIdentity[];
  command: string;
  checkout: string;
  since: string;
}

export interface Job {
  id: string;
  argv: string[];
  checkout: string;
  state: "queued" | "running" | "completed" | "interrupted_or_unknown";
  queuedAt: string;
  startedAt: string | null;
  endedAt: string | null;
  exitCode: number | null;
  signal: string | null;
  checkReportPath: string | null;
  logPath: string | null;
  processes: ProcessIdentity[];
}

export function git(args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 32 * 1024 * 1024,
  }).trimEnd();
}

export function checkoutState() {
  const checkout = realpathSync(process.cwd());
  if (realpathSync(git(["rev-parse", "--show-toplevel"])) !== checkout) {
    throw new Error("run scripts/heavy from the worktree root");
  }
  const commonGit = realpathSync(git(["rev-parse", "--path-format=absolute", "--git-common-dir"]));
  const directory = join(git(["rev-parse", "--absolute-git-dir"]), "artifactory-heavy");
  return {
    checkout,
    directory,
    slot: join(
      "/tmp",
      `artifactory-heavy-command-${createHash("sha256").update(commonGit).digest("hex").slice(0, 16)}.json`,
    ),
  };
}

export function startTimeOf(pid: number): string | null {
  try {
    const stat = readFileSync(`/proc/${String(pid)}/stat`, "utf8");
    const [state, ...fields] = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
    return state === "Z" ? null : (fields[18] ?? null);
  } catch {
    return null;
  }
}

export function isRunning({ pid, startTime }: ProcessIdentity): boolean {
  if (startTime !== null) return startTimeOf(pid) === startTime;
  if (process.platform === "linux") return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function identities(value: unknown): value is ProcessIdentity[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item: unknown) =>
        object(item) &&
        Number.isSafeInteger(item.pid) &&
        Number(item.pid) > 0 &&
        (typeof item.startTime === "string" || item.startTime === null),
    )
  );
}

export function readQueue(slot: string) {
  try {
    const holder = readJson(slot);
    if (
      !object(holder) ||
      !identities(holder.processes) ||
      typeof holder.command !== "string" ||
      typeof holder.checkout !== "string" ||
      typeof holder.since !== "string"
    ) {
      return { state: "unavailable" as const, holder: null };
    }
    const processes = holder.processes.map((identity) => ({
      ...identity,
      alive: isRunning(identity),
    }));
    return {
      state: processes.some(({ alive }) => alive) ? ("running" as const) : ("stale" as const),
      holder: {
        command: holder.command,
        checkout: holder.checkout,
        since: holder.since,
        processes,
      },
    };
  } catch (error) {
    return {
      state:
        (error as NodeJS.ErrnoException).code === "ENOENT"
          ? ("idle" as const)
          : ("unavailable" as const),
      holder: null,
    };
  }
}

export function atomicJson(path: string, value: unknown): void {
  const draft = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(draft, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
    renameSync(draft, path);
  } finally {
    rmSync(draft, { force: true });
  }
}

export function evidenceFiles(directory: string): string[] {
  try {
    return readdirSync(directory)
      .filter((file) => file.endsWith(".json"))
      .map((file) => join(directory, file));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export function readJobs(directory: string, checkout: string): Job[] {
  let files: string[];
  try {
    files = evidenceFiles(join(directory, "jobs"));
  } catch {
    files = [join(directory, "jobs", "unavailable.json")];
  }
  return files
    .map((file) => {
      try {
        const job = readJson(file);
        if (
          !object(job) ||
          typeof job.id !== "string" ||
          !Array.isArray(job.argv) ||
          !job.argv.every((arg: unknown) => typeof arg === "string") ||
          job.checkout !== checkout ||
          !["queued", "running", "completed", "interrupted_or_unknown"].includes(
            String(job.state),
          ) ||
          typeof job.queuedAt !== "string" ||
          ![job.startedAt, job.endedAt, job.signal, job.checkReportPath, job.logPath].every(
            (value) => value === null || typeof value === "string",
          ) ||
          !(job.exitCode === null || Number.isInteger(job.exitCode)) ||
          !identities(job.processes)
        )
          throw new Error("invalid job metadata");
        const result = job as unknown as Job;
        if (result.state !== "completed" && !result.processes.some(isRunning))
          return { ...result, state: "interrupted_or_unknown" as const };
        return result;
      } catch {
        return {
          id: basename(file, ".json"),
          argv: [],
          checkout,
          state: "interrupted_or_unknown" as const,
          queuedAt: "",
          startedAt: null,
          endedAt: null,
          exitCode: null,
          signal: null,
          checkReportPath: null,
          logPath: null,
          processes: [],
        };
      }
    })
    .sort((a, b) => b.queuedAt.localeCompare(a.queuedAt));
}

export function persistJob(directory: string, job: Job): string | null {
  try {
    mkdirSync(join(directory, "jobs"), { recursive: true });
    atomicJson(join(directory, "jobs", `${job.id}.json`), job);
    const terminal = readJobs(directory, job.checkout).filter(
      (record) => record.state === "completed" || record.state === "interrupted_or_unknown",
    );
    for (const old of terminal.slice(20)) {
      if (!/^[\w-]+$/.test(old.id)) continue;
      rmSync(join(directory, "jobs", `${old.id}.json`), { force: true });
      rmSync(join(directory, "checks", `${old.id}.json`), { force: true });
    }
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}
