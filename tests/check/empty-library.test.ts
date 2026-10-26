import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  checkTimeout,
  createFixtureRepo,
  type CheckRun,
  type FixtureRepo,
} from "./fixture-repo.ts";

describe("a repo with no artifacts", () => {
  let repo: FixtureRepo;
  let run: CheckRun;

  beforeAll(async () => {
    repo = await createFixtureRepo({});
    run = await repo.check(["--artifacts-only"]);
  }, checkTimeout);

  afterAll(() => repo.remove());

  it("passes, since an empty Library is valid", () => {
    expect(run.summary).toEqual(["pnpm check: 0 failures"]);
    expect(run.exitCode).toBe(0);
  });

  it("opens nothing, not even the shared assets, since nothing is public", async () => {
    const publicPaths = JSON.parse(
      await readFile(join(repo.root, "dist-worker/public-paths.json"), "utf8"),
    ) as unknown;
    expect(publicPaths).toEqual([]);
  });
});
