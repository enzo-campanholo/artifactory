import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { Loader } from "astro/loaders";
import { glob } from "astro/loaders";
import { artifactFrontmatter } from "./artifact-frontmatter.ts";
import { artifactSource } from "./artifacts.ts";
import { buildFailures } from "./build-failures.ts";
import type { Failure } from "./check-failure.ts";

export function artifactsLoader(): Loader {
  const artifactEntries = glob({
    pattern: "*/index.mdx",
    base: "./artifacts",
    generateId: ({ entry }) => slugOfEntry(entry),
  });
  let firstLoad = true;
  return {
    name: "artifacts",
    // Astro stops at the first entry that fails the schema. Collecting every entry's failures
    // before failing lets `pnpm check` report them all in one run. Reloads in `astro dev`
    // happen after the first load and fail the usual way.
    async load(context) {
      const root = fileURLToPath(context.config.root);
      const { report, stopIfAny } = buildFailures(root, context.logger);
      await artifactEntries.load({
        ...context,
        async parseData(entry) {
          try {
            return await context.parseData(entry);
          } catch (error) {
            const entryFailures = await frontmatterFailures(root, entry.filePath ?? "", entry.data);
            if (!firstLoad || entryFailures.length === 0) throw error;
            for (const failure of entryFailures) report(failure);
            return entry.data;
          }
        },
      });
      if (firstLoad) stopIfAny("in the artifacts' frontmatter");
      firstLoad = false;
    },
  };
}

// Astro calls this the entry ID. For artifacts it is the slug, the folder name; the artifact ID
// is the `id` field in the frontmatter.
function slugOfEntry(entry: string): string {
  return entry.slice(0, entry.indexOf("/"));
}

async function frontmatterFailures(
  root: string,
  filePath: string,
  data: Record<string, unknown>,
): Promise<Failure[]> {
  const result = artifactFrontmatter.safeParse(data);
  if (result.success) return [];
  const source = artifactSource(await readFile(filePath, "utf8"));
  const file = relative(root, filePath);
  return result.error.issues.flatMap((issue) => {
    const fields = issue.code === "unrecognized_keys" ? issue.keys : [String(issue.path[0])];
    return fields.map((field) => ({
      file,
      line: source.lineOfField(field),
      column: 1,
      ruleId: "frontmatter",
      message: messageFor(issue.code, field, data, issue.message),
      skillSection: "Frontmatter",
    }));
  });
}

function messageFor(
  code: string,
  field: string,
  data: Record<string, unknown>,
  message: string,
): string {
  if (code === "unrecognized_keys") return `\`${field}\` is not an artifact frontmatter field`;
  if (!(field in data)) return `\`${field}\` is missing`;
  return `\`${field}\` ${message}`;
}
