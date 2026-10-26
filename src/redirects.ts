import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { BuiltArtifact } from "./built-output.ts";

export async function writeRedirects(outDir: string, artifacts: BuiltArtifact[]): Promise<void> {
  const rules = artifacts
    .flatMap(({ slug, formerSlugs }) => formerSlugs.map((formerSlug) => ({ formerSlug, slug })))
    .sort((a, b) => a.formerSlug.localeCompare(b.formerSlug))
    // Workers static assets match `/old` and `/old/` as different paths.
    .flatMap(({ formerSlug, slug }) => [
      `/${formerSlug} /${slug}/ 301\n`,
      `/${formerSlug}/ /${slug}/ 301\n`,
    ]);
  await writeFile(join(outDir, "_redirects"), rules.join(""));
}
