import { existsSync } from "node:fs";
import { join } from "node:path";
import { artifactsFolderItems } from "../../../src/artifacts.ts";
import type { Step } from "../step.ts";

export const artifactPages: Step = {
  name: "artifact pages",
  async run(root) {
    const folders = await artifactsFolderItems(root);
    return folders
      .filter((folder) => folder.isDirectory())
      .map((folder) => folder.name)
      .filter((slug) => !existsSync(join(root, "dist", slug, "index.html")))
      .map((slug) => ({
        file: `artifacts/${slug}/index.mdx`,
        line: 1,
        column: 1,
        ruleId: "artifact-page",
        message: `no page was built at /${slug}/; an artifact's entry must be artifacts/${slug}/index.mdx`,
        skillSection: "Artifact files",
      }));
  },
};
