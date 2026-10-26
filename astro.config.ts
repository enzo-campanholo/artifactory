import { catalog } from "@artifactory/design-system/catalog";
import { stageBuilds } from "@artifactory/design-system/stage-builds";
import mdx from "@astrojs/mdx";
import { defineConfig } from "astro/config";
import { builtOutput } from "./src/built-output.ts";
import { richContent } from "./src/rich-content.ts";

export default defineConfig({
  output: "static",
  prerenderConflictBehavior: "error",
  integrations: [builtOutput(), richContent(), mdx(), catalog(), stageBuilds()],
});
