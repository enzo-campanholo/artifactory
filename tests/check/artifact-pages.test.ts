import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  checkTimeout,
  createFixtureRepo,
  type CheckRun,
  type FixtureRepo,
} from "./fixture-repo.ts";

describe("an artifact folder whose entry isn't index.mdx", () => {
  let repo: FixtureRepo;
  let run: CheckRun;

  beforeAll(async () => {
    repo = await createFixtureRepo({
      "artifacts/ciclo-de-krebs/index.md": [
        "---",
        "id: k7rebs01",
        "title: Ciclo de Krebs",
        "subject: Bioquímica",
        "lang: pt-BR",
        "published: 2026-10-15",
        "---",
        "",
        "Texto.",
        "",
      ].join("\n"),
    });
    run = await repo.check(["--artifacts-only"]);
  }, checkTimeout);

  afterAll(() => repo.remove());

  it("fails the misnamed entry and the missing page, and turns the build's warnings into failures", () => {
    expect(run.exitCode).toBe(1);
    expect(run.summary).toEqual([
      "pnpm check: 4 failures",
      "artifacts/ciclo-de-krebs/index.md:1:1 error artifact-file: `index.md` isn't a diagram, figure, image or custom build (artifact skill: Artifact files)",
      "artifacts/ciclo-de-krebs/index.mdx:1:1 error artifact-page: no page was built at /ciclo-de-krebs/; an artifact's entry must be artifacts/ciclo-de-krebs/index.mdx (artifact skill: Artifact files)",
      'astro.config.ts:1:1 error build-warning/artifacts: No files found matching "*/index.mdx" in directory "artifacts" (artifact skill: Build failures)',
      'astro.config.ts:1:1 error build-warning/content: The collection "artifacts" does not exist or is empty. Please check your content config file for errors. (artifact skill: Build failures)',
    ]);
  });
});
