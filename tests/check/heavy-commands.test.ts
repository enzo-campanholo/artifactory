import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createFixtureRepo, succeeds, type FixtureRepo } from "./fixture-repo.ts";

// Run as a heavy command, this writes the PIDs of its turn and of itself to `started`, then runs
// until `release` exists, or for 20 seconds when a failed test never releases it.
const holdUntilReleased = `
  require("node:fs").writeFileSync("started.draft", process.ppid + " " + process.pid);
  require("node:fs").renameSync("started.draft", "started");
  setInterval(() => { if (require("node:fs").existsSync("release")) process.exit(Number(require("node:fs").readFileSync("release", "utf8")) || 0); }, 50);
  setTimeout(() => process.exit(1), 20_000);
`;

// Whether this machine's user manager can start a scope, as on a systemd desktop; CI's runner can't.
const userScopes = (() => {
  try {
    execFileSync("systemd-run", ["--user", "--scope", "--quiet", "true"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

interface Holding {
  turn: number;
  work: number;
  finished: Promise<unknown>;
}

describe("heavy commands in one repo", () => {
  let repo: FixtureRepo;

  beforeAll(async () => {
    repo = await createFixtureRepo({});
  }, 60_000);

  afterAll(() => repo.remove());

  function runHeavy(script: string, env: string[] = []) {
    return repo.run("env", [...env, "node", "scripts/heavy-command.ts", "node", "-e", script]);
  }

  async function startHolding(): Promise<Holding> {
    const finished = runHeavy(holdUntilReleased);
    while (!existsSync(join(repo.root, "started"))) await sleep(50);
    const [turn = 0, work = 0] = (await readFile(join(repo.root, "started"), "utf8"))
      .split(" ")
      .map(Number);
    // process.kill(0) would kill this test's own process group.
    expect(turn).toBeGreaterThan(0);
    expect(work).toBeGreaterThan(0);
    return { turn, work, finished };
  }

  async function release(holding: Holding, code = 0): Promise<void> {
    await writeFile(join(repo.root, "release"), String(code));
    await holding.finished;
    await rm(join(repo.root, "started"));
    await rm(join(repo.root, "release"));
  }

  it("runs a second command, even from a shell with its own temp folder, only once the first ends, saying what it waits for, and keeps its exit code", async () => {
    const first = await startHolding();
    const second = runHeavy(`require("node:fs").writeFileSync("second", ""); process.exit(3);`, [
      `TMPDIR=${repo.root}`,
    ]);
    await sleep(5000);
    expect(existsSync(join(repo.root, "second"))).toBe(false);

    const held = await status(repo);
    expect(held.schemaVersion).toBe(1);
    expect(held.checkout).toBe(repo.root);
    expect(held.queue.state).toBe("running");
    expect(held.queue.holder?.checkout).toBe(repo.root);
    expect(held.queue.holder?.processes.map(({ pid, alive }) => ({ pid, alive }))).toEqual([
      { pid: first.turn, alive: true },
      { pid: first.work, alive: true },
    ]);
    for (const identity of held.queue.holder?.processes ?? [])
      expect(identity.startTime).toMatch(/^\d+$/);
    expect(held.jobs.map((job) => job.state).sort()).toEqual(["queued", "running"]);
    expect(existsSync(join(repo.root, "second"))).toBe(false);
    await release(first, 7);
    const run = await second;
    expect(existsSync(join(repo.root, "second"))).toBe(true);
    expect(run.exitCode).toBe(3);
    const completed = await status(repo);
    expect(completed.queue).toEqual({ state: "idle", holder: null });
    expect(completed.jobs.slice(0, 2).map((job) => [job.state, job.exitCode])).toEqual([
      ["completed", 3],
      ["completed", 7],
    ]);
    expect(run.output).toContain(
      `in ${repo.root} (PID ${String(first.turn)}, ${String(first.work)}).`,
    );
    expect(run.output).toContain("This command hasn't started; it starts once that one ends.");
  }, 30_000);

  it("waits while the work of a command killed on its own goes on, and not once that work ends", async () => {
    const killed = await startHolding();
    process.kill(killed.turn, "SIGKILL");
    const next = runHeavy(`require("node:fs").writeFileSync("next", "");`);
    await sleep(3000);
    expect(existsSync(join(repo.root, "next"))).toBe(false);

    const surviving = await status(repo);
    expect(surviving.queue.holder?.processes.map(({ alive }) => alive)).toEqual([false, true]);
    expect(surviving.jobs.some((job) => job.state === "running")).toBe(true);
    process.kill(killed.work, "SIGKILL");
    const run = await next;
    expect(run.exitCode).toBe(0);
    expect(existsSync(join(repo.root, "next"))).toBe(true);
    await release(killed);
    const vanished = await status(repo);
    expect(
      vanished.jobs.some((job) => job.state === "interrupted_or_unknown" && job.exitCode === null),
    ).toBe(true);
  }, 30_000);

  it("rejects nesting in this checkout and linked worktrees, while independent fixture queues remain legal", async () => {
    const linked = `${repo.root}-linked`;
    const independent = await createFixtureRepo({});
    try {
      await succeeds(repo.run("git", ["worktree", "add", "--quiet", "--detach", linked]));
      for (const cwd of [repo.root, linked]) {
        const nested = await runHeavy(`
          const result = require("node:child_process").spawnSync(process.execPath,
            ["scripts/heavy-command.ts", process.execPath, "-e", "require('node:fs').writeFileSync('nested-payload', '')"],
            { cwd: ${JSON.stringify(cwd)}, encoding: "utf8" });
          process.stdout.write(result.stderr);
          process.exit(result.status);
        `);
        expect(nested.exitCode).toBe(2);
        expect(nested.output).toContain("same common-Git queue");
        expect(existsSync(join(cwd, "nested-payload"))).toBe(false);
      }
      const allowed = await runHeavy(`
        const result = require("node:child_process").spawnSync(process.execPath,
          ["scripts/heavy-command.ts", process.execPath, "-e", "process.exit(6)"],
          { cwd: ${JSON.stringify(independent.root)}, encoding: "utf8" });
        process.stdout.write(result.stderr);
        process.exit(result.status);
      `);
      expect(allowed.exitCode).toBe(6);
      const malformed = await runHeavy("process.exit(0)", ["ARTIFACTORY_HEAVY_QUEUES=bad-json"]);
      expect(malformed.exitCode).toBe(2);
      expect(malformed.output).toContain("invalid inherited queue identity");

      const first = await startHolding();
      try {
        const linkedStatus = await repo.run("env", [
          "-C",
          linked,
          "node",
          "scripts/heavy-command.ts",
          "--status",
          "--json",
        ]);
        expect(linkedStatus.exitCode).toBe(0);
        const observed = JSON.parse(linkedStatus.stdout) as Status;
        expect(observed.checkout).toBe(linked);
        expect(observed.queue.holder?.checkout).toBe(repo.root);
        expect(observed.jobs).toEqual([]);
        expect(observed.check.applicability).toBe("none");
      } finally {
        await release(first);
      }
    } finally {
      await repo.run("git", ["worktree", "remove", "--force", linked]);
      await independent.remove();
    }
  }, 60_000);

  it("reports absent, corrupt and PID-reused evidence conservatively without repairing it", async () => {
    const fresh = await createFixtureRepo({});
    try {
      const empty = await status(fresh);
      expect(empty.jobs).toEqual([]);
      expect(empty.check.applicability).toBe("none");
      const gitDirectory = (
        await fresh.run("git", ["rev-parse", "--absolute-git-dir"])
      ).stdout.trim();
      const slot = join(
        "/tmp",
        `artifactory-heavy-command-${createHash("sha256").update(gitDirectory).digest("hex").slice(0, 16)}.json`,
      );
      const directory = join(gitDirectory, "artifactory-heavy");
      try {
        await writeFile(slot, "broken");
        await mkdir(join(directory, "jobs"), { recursive: true });
        await writeFile(join(directory, "jobs", "broken.json"), "broken");
        const corrupt = await status(fresh);
        expect(corrupt.queue).toEqual({ state: "unavailable", holder: null });
        expect(corrupt.jobs[0]?.state).toBe("interrupted_or_unknown");
        expect(corrupt.check.applicability).toBe("unknown");
        expect(await readFile(slot, "utf8")).toBe("broken");
        await writeFile(
          slot,
          JSON.stringify({
            command: "vanished",
            checkout: fresh.root,
            since: "2026-10-25T00:00:00Z",
            processes: [{ pid: process.pid, startTime: "impossible-old-start" }],
          }),
        );
        const stale = await status(fresh);
        expect(stale.queue.state).toBe("stale");
        expect(stale.queue.holder?.processes[0]?.alive).toBe(false);
        expect(existsSync(slot)).toBe(true);
      } finally {
        await rm(slot, { force: true });
      }
      for (const args of [[], ["--status", "--repair"], ["--json"]]) {
        const invalid = await fresh.run("scripts/heavy", args);
        expect(invalid.exitCode).toBe(2);
        expect(invalid.output).toContain("Usage:");
      }
      const notRoot = await fresh.run("env", [
        "-C",
        join(fresh.root, "scripts"),
        "../scripts/heavy",
        "--status",
      ]);
      expect(notRoot.exitCode).toBe(2);
      expect(notRoot.output).toContain("worktree root");
    } finally {
      await fresh.remove();
    }
  }, 60_000);

  it("preserves signal exits and retains only twenty terminal jobs", async () => {
    for (let index = 0; index < 21; index++) {
      const run = await runHeavy(
        index === 20 ? 'process.kill(process.pid, "SIGTERM")' : "process.exit(0)",
      );
      expect(run.exitCode).toBe(index === 20 ? 143 : 0);
    }
    const observed = await status(repo);
    expect(observed.jobs).toHaveLength(20);
    expect(observed.jobs[0]).toMatchObject({
      state: "completed",
      exitCode: null,
      signal: "SIGTERM",
      logPath: null,
    });
  }, 60_000);

  it.runIf(userScopes)(
    "runs its command in a scope of its own under the heavy slice, away from the agent that started it",
    async () => {
      const run = await runHeavy(
        `process.stdout.write("cgroup " + require("node:fs").readFileSync("/proc/self/cgroup", "utf8"));`,
      );
      expect(run.exitCode).toBe(0);
      expect(run.output).toMatch(/cgroup 0::\/\S*\/artifactory-heavy\.slice\/\S+\.scope\n/);
    },
    30_000,
  );

  it.runIf(process.platform === "linux")(
    "runs its command first in line for the out-of-memory killer, so an agent outlives it",
    async () => {
      const run = await runHeavy(
        `process.stdout.write("oom " + require("node:fs").readFileSync("/proc/self/oom_score_adj", "utf8"));`,
      );
      expect(run.exitCode).toBe(0);
      expect(run.output).toContain("oom 1000");
    },
    30_000,
  );
});

interface Status {
  schemaVersion: number;
  checkout: string;
  queue: {
    state: string;
    holder: {
      checkout: string;
      processes: { pid: number; startTime: string | null; alive: boolean }[];
    } | null;
  };
  jobs: { state: string; exitCode: number | null }[];
  check: { applicability: string };
}

async function status(repo: FixtureRepo): Promise<Status> {
  const run = await repo.run("node", ["scripts/heavy-command.ts", "--status", "--json"]);
  expect(run.exitCode).toBe(0);
  return JSON.parse(run.stdout) as Status;
}
