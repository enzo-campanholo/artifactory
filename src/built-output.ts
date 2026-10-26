import { readdir, readFile, rm } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { readArtifacts, readEntry, type ArtifactSource } from "./artifacts.ts";
import { buildFailures, startBuild } from "./build-failures.ts";
import { buildIdFile, stampBuildId } from "./build-id.ts";
import { firstPaintFailures, holdFirstPaintForScripts } from "./first-paint.ts";
import { linkFailures } from "./internal-links.ts";
import { stampLibraryQuestions } from "./library-questions.ts";
import { questionsInBlock } from "@artifactory/design-system/question-markers";
import type { Question } from "@artifactory/design-system/scoring";
import { manifestFile, questionIdFailures, writeQuestionManifest } from "./question-manifest.ts";
import { publicPathsFile, writePublicPaths } from "./public-paths.ts";
import { writeRedirects } from "./redirects.ts";
import { statementFailures } from "./statement-failures.ts";

export interface BuiltPage {
  file: string;
  html: string;
  tags: Map<string, string>[];
}

export interface BuiltArtifact {
  slug: string;
  entry: string;
  source: ArtifactSource;
  formerSlugs: string[];
  page: BuiltPage;
  artifactId: string;
  contentHash: string;
  questions: Question[];
}

export interface BuiltSite {
  pages: BuiltPage[];
  files: Set<string>;
  artifacts: BuiltArtifact[];
}

// The built site is checked when it's generated, before any integration's `astro:build:done` can
// stop the build, so every failure is reported whatever order the integrations run in.
export function builtOutput(): AstroIntegration {
  let root = "";
  return {
    name: "built-output",
    hooks: {
      "astro:config:setup": async ({ config, command }) => {
        root = fileURLToPath(config.root);
        startBuild(root);
        // `astro dev` and `astro check` run this hook too, and replace nothing the Worker reads.
        if (command === "build") {
          await rm(join(root, manifestFile), { force: true });
          await rm(join(root, publicPathsFile), { force: true });
          await rm(join(root, buildIdFile), { force: true });
        }
      },
      "astro:build:generated": async ({ dir, logger }) => {
        const { report } = buildFailures(root, logger);
        const site = await readBuiltSite(root, fileURLToPath(dir));
        for (const failure of site.artifacts.flatMap(questionIdFailures)) report(failure);
        for (const failure of site.artifacts.flatMap(statementFailures)) report(failure);
        for (const failure of linkFailures(site)) report(failure);
        for (const failure of firstPaintFailures(site.artifacts)) report(failure);
      },
      // The build ID is stamped last, so the Worker never sees one without its question manifest.
      "astro:build:done": async ({ dir, logger }) => {
        const { report, whenClean, stopIfAny } = buildFailures(root, logger);
        const outDir = fileURLToPath(dir);
        await whenClean(async () => {
          const site = await readBuiltSite(root, outDir);
          const { pages, artifacts } = site;
          const failures = await holdFirstPaintForScripts(outDir, artifacts);
          for (const failure of failures) report(failure);
          if (failures.length > 0) return;
          await writeQuestionManifest(root, artifacts);
          await writePublicPaths(root, (await readArtifacts(root)).artifacts);
          await writeRedirects(outDir, artifacts);
          await stampLibraryQuestions(outDir, site);
          await stampBuildId(root, outDir, pages);
        });
        stopIfAny("in the build");
      },
    },
  };
}

async function readBuiltSite(root: string, outDir: string): Promise<BuiltSite> {
  const files = (await readdir(outDir, { recursive: true, withFileTypes: true }))
    .filter((item) => item.isFile())
    .map((item) => relative(outDir, join(item.parentPath, item.name)))
    .sort();
  const pages = await Promise.all(
    files
      .filter((file) => file.endsWith(".html"))
      .map(async (file) => {
        const html = await readFile(join(outDir, file), "utf8");
        return { file, html, tags: tagsIn(html) };
      }),
  );
  const artifacts = await Promise.all(pages.map((page) => artifactsOnPage(root, page)));
  return { pages, files: new Set(files), artifacts: artifacts.flat() };
}

async function artifactsOnPage(root: string, page: BuiltPage): Promise<BuiltArtifact[]> {
  const documentElement = page.tags.find((tag) => tag.has("data-artifact-id"));
  const artifactId = documentElement?.get("data-artifact-id");
  const contentHash = documentElement?.get("data-content-hash");
  if (artifactId === undefined || contentHash === undefined) return [];
  const slug = dirname(page.file);
  const { file: entry, source, formerSlugs } = await readEntry(root, slug);
  return [
    {
      slug,
      entry,
      source,
      formerSlugs,
      page,
      artifactId,
      contentHash,
      questions: questionsInBlock(page.html),
    },
  ];
}

// Astro writes attribute values in double quotes and escapes only `&` and `"` in them, so a `>`
// can sit inside one.
const startTag = /<[a-z][\w-]*(?:\s+[\w-]+(?:="[^"]*")?)*\s*\/?>/g;

function tagsIn(html: string): Map<string, string>[] {
  return [...html.matchAll(startTag)].map(([tag]) => attributes(tag));
}

function attributes(tag: string): Map<string, string> {
  return new Map(
    [...tag.matchAll(/\s([\w-]+)="([^"]*)"/g)].map(([, name = "", value = ""]) => [
      name,
      value.replaceAll("&quot;", '"').replaceAll("&amp;", "&"),
    ]),
  );
}
