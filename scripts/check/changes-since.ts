import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathsUnreadByTests } from "./seams.ts";

export interface TestsVerdict {
  affected: boolean;
  reason: string;
}

const run = promisify(execFile);

async function gitFiles(root: string, args: string[]): Promise<string[]> {
  const { stdout } = await run("git", args, { cwd: root });
  return stdout.split("\0").filter((file) => file !== "");
}

function filesChangedSince(root: string, commit: string): Promise<string[]> {
  return Promise.all([
    gitFiles(root, ["diff", "--name-only", "--no-renames", "-z", "--end-of-options", commit, "--"]),
    gitFiles(root, ["ls-files", "--others", "--exclude-standard", "-z"]),
  ]).then((lists) => lists.flat());
}

function lastLine(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.trim().split("\n").at(-1) ?? message;
}

const unreadPaths = new Intl.ListFormat("en-GB", { type: "disjunction" }).format(
  pathsUnreadByTests,
);

export async function testsVerdictSince(root: string, commit: string): Promise<TestsVerdict> {
  let changed: string[];
  try {
    changed = await filesChangedSince(root, commit);
  } catch (error) {
    return { affected: true, reason: `can't compare with ${commit}: ${lastLine(error)}` };
  }
  if (changed.length === 0) return { affected: false, reason: `nothing changed since ${commit}` };
  const firstReadFile = changed.find(
    (file) => !pathsUnreadByTests.some((path) => file.startsWith(path)),
  );
  return firstReadFile === undefined
    ? {
        affected: false,
        reason: `every file changed since ${commit} is under ${unreadPaths}, which no test reads`,
      }
    : { affected: true, reason: `${firstReadFile} changed since ${commit}` };
}
