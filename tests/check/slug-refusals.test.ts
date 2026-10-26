import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  checkTimeout,
  commitArtifacts,
  createFixtureRepo,
  type CommandRun,
  type FixtureRepo,
} from "./fixture-repo.ts";

function artifact(id: string, title: string, ...rest: string[]): string {
  return [
    "---",
    `id: ${id}`,
    `title: ${title}`,
    "subject: Cálculo",
    "lang: pt-BR",
    "published: 2026-10-15",
    ...rest,
    "---",
    "",
    "Texto.",
    "",
  ].join("\n");
}

describe("pnpm new and pnpm rename asked for a slug that is taken", () => {
  let repo: FixtureRepo;
  let refusals: Record<string, CommandRun>;
  let invalidFormerSlugs: Record<string, CommandRun>;
  let invalidId: Record<string, CommandRun>;

  const newArtifact = (slug: string) =>
    repo.run("pnpm", ["new", slug, "--subject", "Cálculo", "--lang", "pt-BR"]);
  const rename = (slug: string) => repo.run("pnpm", ["rename", "limites", slug]);
  const addEntry = async (slug: string, contents: string) => {
    await mkdir(join(repo.root, "artifacts", slug));
    await writeFile(join(repo.root, "artifacts", slug, "index.mdx"), contents);
  };

  beforeAll(async () => {
    repo = await createFixtureRepo({
      "artifacts/derivada/index.mdx": artifact(
        "d3r1vad4",
        "Derivada",
        "formerSlugs:",
        "  - derivadas",
      ),
      "artifacts/limites/index.mdx": artifact("l1m1t3s0", "Limites"),
      "artifacts/notas": "Notas soltas.\n",
    });
    await commitArtifacts(repo);
    refusals = {
      newPlatformRoute: await newArtifact("catalog"),
      newFormerSlug: await newArtifact("derivadas"),
      newLooseFile: await newArtifact("notas"),
      renamePlatformRoute: await rename("drafts"),
      renameFormerSlug: await rename("derivadas"),
      renameLooseFile: await rename("notas"),
    };
    await addEntry("quebrado", artifact("qu3br4d0", "Quebrado", "formerSlugs: derivadas"));
    invalidFormerSlugs = { new: await newArtifact("integrais"), rename: await rename("integrais") };
    await addEntry("copiado", artifact("Copiado1", "Copiado"));
    invalidId = { new: await newArtifact("integrais"), rename: await rename("integrais") };
  }, checkTimeout);

  afterAll(() => repo.remove());

  it("refuses a platform route", () => {
    expect(refusals.newPlatformRoute?.exitCode).toBe(1);
    expect(refusals.newPlatformRoute?.output).toContain("pnpm new: `catalog` is a platform route");
    expect(refusals.renamePlatformRoute?.exitCode).toBe(1);
    expect(refusals.renamePlatformRoute?.output).toContain(
      "pnpm rename: `drafts` is a platform route",
    );
  });

  it("refuses another artifact's former slug", () => {
    expect(refusals.newFormerSlug?.exitCode).toBe(1);
    expect(refusals.newFormerSlug?.output).toContain(
      "pnpm new: `derivadas` is a former slug of artifacts/derivada/index.mdx",
    );
    expect(refusals.renameFormerSlug?.exitCode).toBe(1);
    expect(refusals.renameFormerSlug?.output).toContain(
      "pnpm rename: `derivadas` is a former slug of artifacts/derivada/index.mdx",
    );
  });

  it("refuses the name of a loose file in artifacts/", () => {
    expect(refusals.newLooseFile?.exitCode).toBe(1);
    expect(refusals.newLooseFile?.output).toContain("pnpm new: artifacts/notas already exists");
    expect(refusals.renameLooseFile?.exitCode).toBe(1);
    expect(refusals.renameLooseFile?.output).toContain(
      "pnpm rename: artifacts/notas already exists",
    );
  });

  it("refuses any slug while another artifact's former slugs or artifact ID fail the schema", () => {
    expect(invalidFormerSlugs.new?.exitCode).toBe(1);
    expect(invalidFormerSlugs.new?.output).toContain(
      "pnpm new: fix `formerSlugs` in artifacts/quebrado/index.mdx first",
    );
    expect(invalidFormerSlugs.rename?.exitCode).toBe(1);
    expect(invalidFormerSlugs.rename?.output).toContain(
      "pnpm rename: fix `formerSlugs` in artifacts/quebrado/index.mdx first",
    );
    expect(invalidId.new?.exitCode).toBe(1);
    expect(invalidId.new?.output).toContain(
      "pnpm new: fix `id` in artifacts/copiado/index.mdx first",
    );
    expect(invalidId.rename?.exitCode).toBe(1);
    expect(invalidId.rename?.output).toContain(
      "pnpm rename: fix `id` in artifacts/copiado/index.mdx first",
    );
  });

  it("leaves the artifacts as they were after every refusal", async () => {
    const { stdout } = await repo.run("git", ["status", "--porcelain", "--untracked-files=all"]);
    expect(stdout.split("\n")).toEqual([
      "?? artifacts/copiado/index.mdx",
      "?? artifacts/quebrado/index.mdx",
      "",
    ]);
  });
});
