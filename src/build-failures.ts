import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { AstroIntegrationLogger } from "astro";
import { buildIdFile } from "./build-id.ts";
import { formatFailure, type Failure, type Report } from "./check-failure.ts";

// The artifacts loader runs in another module graph than the integrations, so failures meet in a
// file. It isn't under node_modules/.cache, which fixture repos share, or under .astro/, which is
// Astro's.
const failuresFile = ".build/failures.json";

export const contentTypesFile = ".astro/content.d.ts";

export interface BuildFailures {
  report: Report;
  stopIfAny: (what: string) => void;
  whenClean: (write: () => Promise<void>) => Promise<void>;
}

export interface BuildResult {
  failures: Failure[];
  contentSynced: boolean;
  builtOutput: boolean;
}

export function buildFailures(
  root: string,
  logger: Pick<AstroIntegrationLogger, "error">,
): BuildFailures {
  const file = join(root, failuresFile);
  return {
    report: (failure) => {
      writeFailures(file, [...readFailures(file), failure]);
      logger.error(formatFailure(failure));
    },
    stopIfAny: (what) => {
      const count = readFailures(file).length;
      if (count > 0) {
        throw new Error(`${String(count)} ${count === 1 ? "failure" : "failures"} ${what}`);
      }
    },
    whenClean: async (write) => {
      if (readFailures(file).length === 0) await write();
    },
  };
}

export function startBuild(root: string): void {
  rmSync(join(root, failuresFile), { force: true });
}

export function readBuildResult(root: string): BuildResult {
  return {
    failures: readFailures(join(root, failuresFile)),
    contentSynced: existsSync(join(root, contentTypesFile)),
    builtOutput: existsSync(join(root, buildIdFile)),
  };
}

// Synchronous, so two failures reported at once can't each overwrite the other.
function readFailures(file: string): Failure[] {
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Failure[]) : [];
}

function writeFailures(file: string, failures: Failure[]): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(failures, null, 2)}\n`);
}
