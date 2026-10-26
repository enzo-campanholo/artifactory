import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { heldSlugs, type Artifact } from "./artifacts.ts";

export const publicPathsFile = "dist-worker/public-paths.json";

export const accessAppDestinationLimit = 50;

// Each path is one destination of the public Access app. Every page links the `/_astro/` files
// and the favicon, so they open while anything is public. Workers static assets match `/slug`
// and `/slug/` as different paths, and `src/redirects.ts` writes both for a former slug.
export function publicPaths(artifacts: Artifact[]): string[] {
  const slugs = artifacts.filter(({ entry }) => entry?.public === true).flatMap(heldSlugs);
  if (slugs.length === 0) return [];
  return [
    "/_astro/*",
    "/favicon.svg",
    ...slugs.flatMap(({ slug }) => [`/${slug}`, `/${slug}/`]),
  ].sort();
}

export async function writePublicPaths(root: string, artifacts: Artifact[]): Promise<void> {
  const file = join(root, publicPathsFile);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(publicPaths(artifacts), null, 2)}\n`);
}
