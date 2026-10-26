import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  artifactSource,
  entriesOf,
  entryFile,
  readArtifacts,
  slugRefusal,
} from "../src/artifacts.ts";

const root = process.cwd();

function fail(message: string): never {
  console.error(`pnpm rename: ${message}`);
  process.exit(1);
}

const [oldSlug, newSlug, ...extra] = process.argv.slice(2);
if (oldSlug === undefined || newSlug === undefined || extra.length > 0) {
  fail("usage: pnpm rename <old-slug> <new-slug>");
}

const repo = await readArtifacts(root);
const renamed = repo.artifacts.find(({ slug }) => slug === oldSlug);
if (renamed?.entry === undefined) {
  fail(`there's no artifact at ${entryFile(oldSlug)}`);
}
const refusal = slugRefusal(repo, newSlug, { renaming: renamed });
if (refusal !== undefined) fail(refusal);

const formerSlugs = [
  ...renamed.entry.formerSlugs.filter((slug) => slug !== oldSlug && slug !== newSlug),
  oldSlug,
];

await promisify(execFile)("git", ["mv", `artifacts/${oldSlug}`, `artifacts/${newSlug}`], {
  cwd: root,
}).catch((error: unknown) => {
  fail(`git mv failed: ${error instanceof Error ? error.message : String(error)}`);
});

const rewritten: string[] = [];
for (const entry of entriesOf(repo.artifacts)) {
  const file = entry === renamed.entry ? entryFile(newSlug) : entry.file;
  const { text } = entry.source;
  const linksRewritten = withLinksRewritten(text, oldSlug, newSlug);
  if (linksRewritten !== text) rewritten.push(file);
  const source =
    entry === renamed.entry ? withFormerSlugs(linksRewritten, formerSlugs) : linksRewritten;
  if (source !== text) await writeFile(join(root, file), source);
}

console.log(`Moved artifacts/${oldSlug}/ to artifacts/${newSlug}/.`);
console.log(`Former slugs of ${newSlug}: ${formerSlugs.join(", ")}.`);
console.log(
  rewritten.length === 0
    ? "No links needed rewriting."
    : `Rewrote links to /${oldSlug}/ in ${rewritten.join(", ")}.`,
);
console.log("Run `pnpm check` next.");

// A link destination in Markdown, in a reference definition or in an `href`, that leads to the
// old slug from the site root or through `../`.
function withLinksRewritten(source: string, from: string, to: string): string {
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const destinationStart = String.raw`(?:\]\(\s*<?|^ {0,3}\[[^\]\n]+\]:\s*<?|\bhref=\{?["'])`;
  const link = new RegExp(
    String.raw`(${destinationStart}(?:\/|(?:\.\.\/)+))${escaped}(?=[/#?)>"'\s]|$)`,
    "gm",
  );
  return source.replace(link, `$1${to}`);
}

function withFormerSlugs(text: string, slugs: string[]): string {
  const lines = text.split("\n");
  const { first, count } = artifactSource(text).fieldLines("formerSlugs");
  lines.splice(first - 1, count, "formerSlugs:", ...slugs.map((slug) => `  - ${slug}`));
  return lines.join("\n");
}
