import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { BuiltPage } from "./built-output.ts";
import { stampPages } from "./stamp-pages.ts";

export const buildIdFile = "dist-worker/build-id.json";

const unstampedBuildId = /(?<=<html\b[^>]*\sdata-build-id=)""/;

export async function stampBuildId(
  root: string,
  outDir: string,
  pages: BuiltPage[],
): Promise<void> {
  const buildId = crypto.randomUUID();
  await stampPages(outDir, pages, unstampedBuildId, () => `"${buildId}"`);
  await mkdir(dirname(join(root, buildIdFile)), { recursive: true });
  await writeFile(join(root, buildIdFile), `${JSON.stringify(buildId)}\n`);
}
