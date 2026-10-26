import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { artifactFrontmatter } from "../src/artifact-frontmatter.ts";
import {
  entriesOf,
  foldCaseAndAccents,
  newArtifactId,
  readArtifacts,
  slugRefusal,
} from "../src/artifacts.ts";
import { starterFiles } from "./starter-artifact.ts";

const root = process.cwd();
const usage = 'usage: pnpm new <slug> --subject "<Subject>" --lang <pt-BR|en> [--draft]';

await mkdir(join(root, "artifacts"), { recursive: true });
const repo = await readArtifacts(root);
const subjectsInUse = [
  ...new Set(entriesOf(repo.artifacts).flatMap(({ subject }) => subject ?? [])),
].sort(new Intl.Collator("en").compare);
const subjectsInUseLine =
  subjectsInUse.length === 0
    ? "No subjects are in use yet."
    : `Subjects already in use: ${subjectsInUse.join(", ")}`;

function fail(message: string): never {
  console.error(`pnpm new: ${message}`);
  console.error(subjectsInUseLine);
  process.exit(1);
}

function parsedArguments() {
  try {
    return parseArgs({
      allowPositionals: true,
      options: {
        subject: { type: "string" },
        lang: { type: "string" },
        draft: { type: "boolean", default: false },
      },
    });
  } catch (error) {
    return fail(`${error instanceof Error ? error.message : String(error)}; ${usage}`);
  }
}

const {
  positionals: [slug, ...extra],
  values,
} = parsedArguments();
if (slug === undefined || extra.length > 0) fail(usage);
const subject = artifactFrontmatter.shape.subject.safeParse(values.subject);
if (!subject.success) fail(`\`--subject\` is required; ${usage}`);
const lang = artifactFrontmatter.shape.lang.safeParse(values.lang);
if (!lang.success) fail(`\`--lang\` must be pt-BR or en; ${usage}`);

const refusal = slugRefusal(repo, slug);
if (refusal !== undefined) fail(refusal);

const sameSubject = subjectsInUse.find(
  (spelling) =>
    spelling !== subject.data && foldCaseAndAccents(spelling) === foldCaseAndAccents(subject.data),
);
if (sameSubject !== undefined) {
  fail(
    `the subject \`${subject.data}\` differs only in case or accents from \`${sameSubject}\`, which is in use; use that spelling`,
  );
}

const id = newArtifactId(repo);

// The published date is the owner's day, so a UTC cloud session late in a Brazilian evening
// must not stamp tomorrow. en-CA formats as YYYY-MM-DD.
const published = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
  new Date(),
);
const title = slug.charAt(0).toUpperCase() + slug.slice(1).replaceAll("-", " ");

const { body, besideEntry } = starterFiles(lang.data);
const entry = [
  "---",
  `id: ${JSON.stringify(id)}`,
  `title: ${JSON.stringify(title)}`,
  `subject: ${JSON.stringify(subject.data)}`,
  `lang: ${lang.data}`,
  `published: ${published}`,
  `draft: ${String(values.draft)}`,
  "---",
  "",
  body,
].join("\n");

const folder = join(root, "artifacts", slug);
await mkdir(folder);
await Promise.all([
  writeFile(join(folder, "index.mdx"), entry),
  ...Object.entries(besideEntry).map(([name, contents]) => writeFile(join(folder, name), contents)),
]);

console.log(
  `Created artifacts/${slug}/ (${["index.mdx", ...Object.keys(besideEntry)].join(", ")}) with ID ${id}, published ${published}${values.draft ? ", as a draft" : ""}.`,
);
console.log(subjectsInUseLine);
console.log("Use the `artifact` skill to write the artifact, then run `pnpm check`.");
