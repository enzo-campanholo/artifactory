import { defineCollection } from "astro:content";
import { artifactsLoader } from "./artifacts-loader.ts";
import { artifactFrontmatter } from "./artifact-frontmatter.ts";

export const collections = {
  artifacts: defineCollection({
    loader: artifactsLoader(),
    schema: artifactFrontmatter,
  }),
};
