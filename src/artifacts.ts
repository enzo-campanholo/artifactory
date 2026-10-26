import { randomInt } from "node:crypto";
import { existsSync, type Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { extractFrontmatter, parseFrontmatter } from "astro/markdown";
import { artifactFrontmatter } from "./artifact-frontmatter.ts";
import { positionAt } from "./check-failure.ts";

export const kebabCase = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// `cdn-cgi` is where Cloudflare serves its own pages, such as Access sign-in.
const platformRoutes = ["404", "api", "catalog", "cdn-cgi", "drafts"];

export function foldCaseAndAccents(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export interface RepoArtifacts {
  artifacts: Artifact[];
  looseFiles: string[];
}

export interface Artifact {
  slug: string;
  entry: Entry | undefined;
  besideEntry: string[];
}

type IdentityField = "id" | "formerSlugs";

// The collection schema reports a field that breaks it, so a field that fails it reads as absent
// here, and only `invalidIdentityFields` says it is there.
export interface Entry {
  file: string;
  source: ArtifactSource;
  id: string | undefined;
  formerSlugs: string[];
  subject: string | undefined;
  public: boolean;
  invalidIdentityFields: IdentityField[];
}

interface LineSpan {
  first: number;
  count: number;
}

export interface ArtifactSource {
  text: string;
  bodyStart: number;
  // A field that isn't there spans no lines, starting at the line it would be written on.
  fieldLines(field: string): LineSpan;
  lineOfField(field: string): number;
  lineOfListItem(field: string, item: string): number;
}

export function entryFile(slug: string): string {
  return `artifacts/${slug}/index.mdx`;
}

// Git keeps no empty folder, so with no artifacts there is no `artifacts/` either.
export async function artifactsFolderItems(root: string): Promise<Dirent[]> {
  const folder = join(root, "artifacts");
  return existsSync(folder) ? await readdir(folder, { withFileTypes: true }) : [];
}

export async function readArtifacts(root: string): Promise<RepoArtifacts> {
  const items = await artifactsFolderItems(root);
  const artifacts = await Promise.all(
    items.filter((item) => item.isDirectory()).map(({ name }) => readArtifact(root, name)),
  );
  return {
    artifacts: artifacts.sort((a, b) => (entryFile(a.slug) < entryFile(b.slug) ? -1 : 1)),
    looseFiles: items.filter((item) => !item.isDirectory()).map(({ name }) => name),
  };
}

async function readArtifact(root: string, slug: string): Promise<Artifact> {
  const items = await readdir(join(root, "artifacts", slug), { withFileTypes: true });
  const hasEntry = items.some((item) => item.name === "index.mdx" && !item.isDirectory());
  return {
    slug,
    entry: hasEntry ? await readEntry(root, slug) : undefined,
    besideEntry: items
      .filter(({ name }) => name !== "index.mdx")
      .map((item) => (item.isDirectory() ? `${item.name}/` : item.name)),
  };
}

export function entriesOf(artifacts: Artifact[]): Entry[] {
  return artifacts.flatMap(({ entry }) => (entry === undefined ? [] : [entry]));
}

export async function readEntry(root: string, slug: string): Promise<Entry> {
  const file = entryFile(slug);
  const text = await readFile(join(root, file), "utf8");
  const frontmatter = frontmatterOf(text);
  const id = artifactFrontmatter.shape.id.safeParse(frontmatter.id);
  const formerSlugs = artifactFrontmatter.shape.formerSlugs.safeParse(frontmatter.formerSlugs);
  const subject = artifactFrontmatter.shape.subject.safeParse(frontmatter.subject);
  const isPublic = artifactFrontmatter.shape.public.safeParse(frontmatter.public);
  const isDraft = artifactFrontmatter.shape.draft.safeParse(frontmatter.draft);
  return {
    file,
    source: artifactSource(text),
    id: id.success ? id.data : undefined,
    formerSlugs: formerSlugs.success ? (formerSlugs.data ?? []) : [],
    subject: subject.success ? subject.data : undefined,
    // A draft is never public: the schema refuses one marked public, and it opens nothing.
    public: isPublic.success && isPublic.data && !(isDraft.success && isDraft.data),
    invalidIdentityFields: [
      ...(id.success ? [] : ["id" as const]),
      ...(formerSlugs.success ? [] : ["formerSlugs" as const]),
    ],
  };
}

// Frontmatter that isn't valid YAML fails the build, which reports it at the entry.
function frontmatterOf(text: string): Record<string, unknown> {
  try {
    return parseFrontmatter(text).frontmatter;
  } catch {
    return {};
  }
}

// The frontmatter is found the way Astro finds it, so these positions agree with what the
// collection schema was given.
export function artifactSource(text: string): ArtifactSource {
  const rawFrontmatter = extractFrontmatter(text);
  const fenced = rawFrontmatter === undefined ? "" : `---${rawFrontmatter}---`;
  const start = fenced === "" ? 0 : text.indexOf(fenced);
  const bodyStart = fenced === "" ? 0 : start + fenced.length;
  const lines = text.split("\n");
  const firstFieldLine = fenced === "" ? 1 : positionAt(text, start).line + 1;
  const closingLine = fenced === "" ? 1 : positionAt(text, bodyStart).line;
  const lineText = (line: number) => lines[line - 1] ?? "";

  function fieldLines(field: string): LineSpan {
    let first = firstFieldLine;
    while (first < closingLine && !lineText(first).startsWith(`${field}:`)) first += 1;
    if (first === closingLine) return { first: closingLine, count: 0 };
    let count = 1;
    while (first + count < closingLine && /^[\s-]/.test(lineText(first + count))) count += 1;
    return { first, count };
  }

  function lineOfField(field: string): number {
    const { first, count } = fieldLines(field);
    return count === 0 ? 1 : first;
  }

  function lineOfListItem(field: string, item: string): number {
    const { first, count } = fieldLines(field);
    for (let line = first + 1; line < first + count; line += 1) {
      if (/^\s*-\s*["']?(.*?)["']?\s*$/.exec(lineText(line))?.[1] === item) return line;
    }
    return lineOfField(field);
  }

  return { text, bodyStart, fieldLines, lineOfField, lineOfListItem };
}

type SlugClaim =
  | { holder: "invalid name" | "platform route" | "loose file" }
  | { holder: "slug" | "former slug"; artifact: Artifact };

export interface HeldSlug {
  artifact: Artifact;
  slug: string;
  former: boolean;
}

export function heldSlugs(artifact: Artifact): HeldSlug[] {
  const formerSlugs = artifact.entry?.formerSlugs ?? [];
  return [
    { artifact, slug: artifact.slug, former: false },
    ...[...new Set(formerSlugs)].map((slug) => ({ artifact, slug, former: true })),
  ];
}

// An artifact being renamed may take back one of its own former slugs.
function slugClaims(
  { artifacts, looseFiles }: RepoArtifacts,
  slug: string,
  { renaming }: { renaming?: Artifact } = {},
): SlugClaim[] {
  return [
    ...(kebabCase.test(slug) ? [] : [{ holder: "invalid name" as const }]),
    ...(platformRoutes.includes(slug) ? [{ holder: "platform route" as const }] : []),
    ...(looseFiles.includes(slug) ? [{ holder: "loose file" as const }] : []),
    ...artifacts
      .flatMap(heldSlugs)
      .filter((held) => held.slug === slug && !(held.former && held.artifact === renaming))
      .map(({ artifact, former }) => ({
        holder: former ? ("former slug" as const) : ("slug" as const),
        artifact,
      })),
  ];
}

// `pnpm new` and `pnpm rename` refuse while an identity field fails the schema, since the slugs
// and artifact IDs in use aren't known until it's fixed.
export function slugRefusal(
  repo: RepoArtifacts,
  slug: string,
  options: { renaming?: Artifact } = {},
): string | undefined {
  const [fixFirst] = entriesOf(repo.artifacts).flatMap(({ file, invalidIdentityFields }) =>
    invalidIdentityFields.map((field) => `fix \`${field}\` in ${file} first`),
  );
  if (fixFirst !== undefined) return fixFirst;
  const [claim] = slugClaims(repo, slug, options);
  if (claim === undefined) return undefined;
  switch (claim.holder) {
    case "invalid name":
    case "platform route":
      return `\`${slug}\` ${rulesBroken[claim.holder]}`;
    case "loose file":
      return `artifacts/${slug} already exists`;
    case "slug":
      return `artifacts/${slug}/ already exists`;
    case "former slug":
      return `\`${slug}\` is ${holderOf(claim)}`;
  }
}

// A loose file fails as a file that isn't an artifact folder, so it isn't a clash here.
export function heldSlugProblems(repo: RepoArtifacts, held: HeldSlug): string[] {
  const slugPhrase = `the ${held.former ? "former slug" : "slug"} \`${held.slug}\``;
  const claims = slugClaims(repo, held.slug);
  const clashes = claims.flatMap((claim) =>
    "artifact" in claim && !isHeld(claim, held) ? [holderOf(claim, held.artifact)] : [],
  );
  return [
    ...claims.flatMap(({ holder }) =>
      holder === "invalid name" || holder === "platform route"
        ? [`${slugPhrase} ${rulesBroken[holder]}`]
        : [],
    ),
    ...(clashes.length === 0 ? [] : [`${slugPhrase} is also ${clashes.join(" and ")}`]),
  ];
}

type ArtifactClaim = Extract<SlugClaim, { artifact: Artifact }>;

const rulesBroken = {
  "invalid name": "isn't lowercase ASCII kebab-case",
  "platform route": "is a platform route",
} as const;

function isHeld(claim: ArtifactClaim, { artifact, former }: HeldSlug): boolean {
  return claim.artifact === artifact && (claim.holder === "former slug") === former;
}

function holderOf(claim: ArtifactClaim, speaker?: Artifact): string {
  const former = claim.holder === "former slug";
  if (claim.artifact === speaker) {
    return former ? "a former slug of this artifact" : "this artifact's slug";
  }
  return `${former ? "a former slug of" : "the slug of"} ${entryFile(claim.artifact.slug)}`;
}

const idCharacters = "abcdefghijklmnopqrstuvwxyz0123456789";

export function newArtifactId({ artifacts }: RepoArtifacts): string {
  const taken = new Set(entriesOf(artifacts).map(({ id }) => id));
  let id: string;
  do {
    id = Array.from({ length: 8 }, () => idCharacters[randomInt(idCharacters.length)]).join("");
  } while (taken.has(id));
  return id;
}
