import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  checkTimeout,
  createFixtureRepo,
  type CheckRun,
  type FixtureRepo,
} from "./fixture-repo.ts";

describe.each([
  { scope: "full", args: [], fullScope: true },
  { scope: "artifacts only", args: ["--artifacts-only"], fullScope: false },
])("an artifact whose frontmatter breaks the schema ($scope)", ({ args, fullScope }) => {
  let repo: FixtureRepo;
  let run: CheckRun;

  beforeAll(async () => {
    repo = await createFixtureRepo({
      "artifacts/bad-fields/index.mdx": [
        "---",
        "id: ABC",
        "title: Bad fields",
        "subject: Biology",
        "lang: fr",
        "published: 2026-10-15",
        "draft: maybe",
        'public: "yes"',
        "---",
        "",
        "Text.",
        "",
      ].join("\n"),
      "artifacts/math-title/index.mdx": [
        "---",
        'id: "mathttl1"',
        'title: "A derivada de $x^n$ e `Math.pow`"',
        "subject: Cálculo",
        "lang: pt-BR",
        "published: 2026-10-15",
        "---",
        "",
        "Texto.",
        "",
      ].join("\n"),
      "artifacts/price-title/index.mdx": [
        "---",
        'id: "pricettl"',
        'title: "Juros sobre R$ 10"',
        "subject: Cálculo",
        "lang: pt-BR",
        "published: 2026-10-15",
        "---",
        "",
        "Texto.",
        "",
      ].join("\n"),
      "artifacts/public-draft/index.mdx": [
        "---",
        'id: "pubdraft"',
        "title: A public draft",
        "subject: Biology",
        "lang: fr",
        "published: 2026-10-15",
        "draft: true",
        "public: true",
        "formerSlugs:",
        ...Array.from({ length: 24 }, (_, index) => `  - rascunho-${String(index + 1)}`),
        "---",
        "",
        "Text.",
        "",
      ].join("\n"),
      "artifacts/missing-fields/index.mdx": [
        "---",
        "subject: Biology",
        "lang: en",
        "layout: ./Custom.astro",
        "---",
        "",
        "Text.",
        "",
      ].join("\n"),
    });
    run = await repo.check(args);
  }, checkTimeout);

  afterAll(() => repo.remove());

  it("fails with one line per broken field, at the field's line", () => {
    expect(run.exitCode).toBe(1);
    expect(run.summary).toEqual([
      "pnpm check: 11 failures",
      "artifacts/bad-fields/index.mdx:2:1 error frontmatter: `id` must be 8 characters from a-z and 0-9 (artifact skill: Frontmatter)",
      'artifacts/bad-fields/index.mdx:5:1 error frontmatter: `lang` must be "pt-BR" or "en" (artifact skill: Frontmatter)',
      "artifacts/bad-fields/index.mdx:7:1 error frontmatter: `draft` must be true or false (artifact skill: Frontmatter)",
      "artifacts/bad-fields/index.mdx:8:1 error frontmatter: `public` must be true or false (artifact skill: Frontmatter)",
      "artifacts/math-title/index.mdx:3:1 error frontmatter: `title` is plain text: write math in Unicode or words, and code without backticks (artifact skill: Frontmatter)",
      "artifacts/missing-fields/index.mdx:1:1 error frontmatter: `id` is missing (artifact skill: Frontmatter)",
      "artifacts/missing-fields/index.mdx:1:1 error frontmatter: `published` is missing (artifact skill: Frontmatter)",
      "artifacts/missing-fields/index.mdx:1:1 error frontmatter: `title` is missing (artifact skill: Frontmatter)",
      "artifacts/missing-fields/index.mdx:4:1 error frontmatter: `layout` is not an artifact frontmatter field (artifact skill: Frontmatter)",
      'artifacts/public-draft/index.mdx:5:1 error frontmatter: `lang` must be "pt-BR" or "en" (artifact skill: Frontmatter)',
      "artifacts/public-draft/index.mdx:8:1 error frontmatter: `public` can't be true on a draft: publish it first, or remove `public` (artifact skill: Frontmatter)",
    ]);
  });

  it("counts no Access destinations for a draft marked public", () => {
    expect(run.summary.filter((line) => line.includes(" error public: "))).toEqual([]);
  });

  it("takes a title as plain text, so math or code fails and a lone $ passes", () => {
    expect(run.summary.filter((line) => line.includes("-title/"))).toEqual([
      "artifacts/math-title/index.mdx:3:1 error frontmatter: `title` is plain text: write math in Unicode or words, and code without backticks (artifact skill: Frontmatter)",
    ]);
  });

  if (fullScope) {
    it("skips the type checks, which need the content Astro could not sync", () => {
      expect(run.output).toContain(
        "pnpm check: skipped astro check, artifact types, tsc, ESLint: the build failed before Astro synced content",
      );
      expect(run.output).not.toMatch(/pnpm check: (astro check|tsc|ESLint) (passed|failed)/);
    });

    it("refuses artifact scope with last-passed before running any checks", async () => {
      const conflict = await repo.check(["--artifacts-only", "--last-passed", "HEAD"]);
      expect(conflict.exitCode).toBe(2);
      expect(conflict.output).toContain(
        "pnpm check: --artifacts-only cannot be combined with --last-passed",
      );
      expect(conflict.output).toContain(
        "Usage: pnpm check [--last-passed <sha>] | pnpm check --artifacts-only",
      );
      expect(conflict.summary).toEqual([]);
      expect(conflict.output).not.toContain("pnpm check: astro build");
      expect(conflict.output).not.toContain("pnpm check: running Vitest:");
      expect(conflict.output).not.toContain("pnpm check: skipped Vitest:");
    });
  } else {
    it("skips the selected type checks before content sync and still runs independent artifact checks", () => {
      expect(run.output).toContain(
        "pnpm check: skipped artifact types, restricted build tsc: the build failed before Astro synced content",
      );
      expect(run.output).not.toMatch(
        /pnpm check: (artifact types|restricted build tsc) (passed|failed)/,
      );
      expect(run.output).toContain("pnpm check: artifact checks passed");
      expect(run.output).toContain("pnpm check: knip passed");
      expect(run.output).toContain("pnpm check: test placement passed");
    });
  }
});
