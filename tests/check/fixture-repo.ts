import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { pathsUnreadByTests } from "../../scripts/check/seams.ts";
import { closingBlockIn } from "../../src/check-failure.ts";

const run = promisify(execFile);
const repoRoot = join(import.meta.dirname, "../..");
export const checkTimeout = 300_000;
const leftOut = ["tests/", ...pathsUnreadByTests];

export interface CommandRun {
  exitCode: number;
  stdout: string;
  output: string;
}

export interface CheckRun {
  exitCode: number;
  output: string;
  summary: string[];
}

export interface FixtureRepo {
  root: string;
  run(command: string, args: string[]): Promise<CommandRun>;
  check(args?: string[]): Promise<CheckRun>;
  remove(): Promise<void>;
}

export async function createFixtureRepo(
  files: Record<string, string | Uint8Array>,
): Promise<FixtureRepo> {
  const root = await mkdtemp(join(tmpdir(), "artifactory-check-"));
  const { stdout } = await run("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: repoRoot,
  });
  const platformFiles = stdout
    .split("\n")
    .filter((file) => file !== "" && !leftOut.some((prefix) => file.startsWith(prefix)));
  await Promise.all(platformFiles.map((file) => cp(join(repoRoot, file), join(root, file))));
  await commitPlatform(root);
  await linkDependencies(root);
  await Promise.all(
    Object.entries(files).map(async ([file, contents]) => {
      await mkdir(dirname(join(root, file)), { recursive: true });
      await writeFile(join(root, file), contents);
    }),
  );
  return {
    root,
    run: (command, args) => runIn(root, command, args),
    check: (args = []) => checkIn(root, args),
    remove: () => rm(root, { recursive: true, force: true }),
  };
}

// A build writes these for the repo it builds, so each fixture repo starts without them.
const perRepoState = new Set([".astro", ".vite", ".vite-temp"]);
// Fixture repos share one node_modules/.cache, apart from the repo's own, whose tsc build info
// describes a different program and would be thrown out each time. Whatever a tool caches there
// carries over, so it must be keyed by what it reads: D2's entries by each diagram's source, tsc's
// build info checked against the files it reads, and jiti's by path and content.
const fixtureCache = join(repoRoot, "node_modules/.cache/fixture-repos");

async function linkDependencies(root: string): Promise<void> {
  await mkdir(join(root, "node_modules/@artifactory"), { recursive: true });
  await mkdir(fixtureCache, { recursive: true });
  await symlink("../../design-system", join(root, "node_modules/@artifactory/design-system"));
  await symlink(
    join(repoRoot, "design-system/node_modules"),
    join(root, "design-system/node_modules"),
  );
  await symlink(fixtureCache, join(root, "node_modules/.cache"));
  const entries = await readdir(join(repoRoot, "node_modules"));
  await Promise.all(
    entries
      .filter((entry) => entry !== "@artifactory" && entry !== ".cache" && !perRepoState.has(entry))
      .map((entry) =>
        symlink(join(repoRoot, "node_modules", entry), join(root, "node_modules", entry)),
      ),
  );
}

function runIn(root: string, command: string, args: string[]): Promise<CommandRun> {
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      {
        cwd: root,
        maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, pnpm_config_verify_deps_before_run: "false" },
      },
      (error, stdout, stderr) => {
        resolve({
          exitCode: typeof error?.code === "number" ? error.code : 0,
          stdout,
          output: stdout + stderr,
        });
      },
    );
  });
}

export async function succeeds(command: Promise<CommandRun>): Promise<void> {
  const run = await command;
  if (run.exitCode !== 0) throw new Error(run.output);
}

function commit(root: string, message: string): Promise<void> {
  return succeeds(
    runIn(root, "git", [
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@localhost",
      "commit",
      "--quiet",
      "--message",
      message,
    ]),
  );
}

// The repo's .gitignore matches node_modules folders, but here design-system/node_modules is a
// symlink, which would show as a change.
async function commitPlatform(root: string): Promise<void> {
  await succeeds(runIn(root, "git", ["init", "--quiet"]));
  await writeFile(join(root, ".git/info/exclude"), "design-system/node_modules\n");
  await succeeds(runIn(root, "git", ["add", "--all"]));
  await commit(root, "Add the platform");
}

export async function commitArtifacts(repo: FixtureRepo): Promise<void> {
  await succeeds(repo.run("git", ["add", "artifacts"]));
  await commit(repo.root, "Add the artifacts");
}

export async function headCommit(repo: FixtureRepo): Promise<string> {
  const { stdout } = await repo.run("git", ["rev-parse", "HEAD"]);
  return stdout.trim();
}

async function checkIn(root: string, args: string[]): Promise<CheckRun> {
  const { exitCode, stdout, output } = await runIn(root, "pnpm", ["check", ...args]);
  return { exitCode, output, summary: closingBlockIn(stdout) };
}
