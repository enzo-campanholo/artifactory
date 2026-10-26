import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { isRunnableTest, seamFolders } from "../seams.ts";
import { platformFailure, type Step } from "../step.ts";

const notWalked = new Set(["node_modules", "dist", ".astro", ".git", ".wrangler", ".claude"]);
const looksLikeTest = /\.(test|spec)\.[cm]?[jt]sx?$/;

export const testPlacement: Step = {
  name: "test placement",
  async run(root) {
    const files = await filesUnder(root);
    return files
      .filter((file) => looksLikeTest.test(file) && !isRunnableTest(file))
      .map((file) =>
        platformFailure(
          file,
          "test-placement",
          `Vitest runs only *.test.ts files in a seam folder: ${seamFolders.join(", ")}`,
        ),
      );
  },
};

async function filesUnder(root: string, folder = ""): Promise<string[]> {
  const entries = await readdir(join(root, folder), { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(folder, entry.name);
      if (!entry.isDirectory()) return [path];
      return notWalked.has(entry.name) ? [] : filesUnder(root, path);
    }),
  );
  return nested.flat();
}
