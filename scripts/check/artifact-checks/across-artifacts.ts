import {
  entriesOf,
  entryFile,
  foldCaseAndAccents,
  heldSlugProblems,
  heldSlugs,
  type Entry,
  type HeldSlug,
  type RepoArtifacts,
} from "../../../src/artifacts.ts";
import type { Failure } from "../../../src/check-failure.ts";
import { accessAppDestinationLimit, publicPaths } from "../../../src/public-paths.ts";

export function acrossArtifacts(repo: RepoArtifacts): Failure[] {
  const entries = entriesOf(repo.artifacts);
  return [
    ...artifactIdFailures(entries),
    ...slugFailures(repo),
    ...subjectFailures(entries),
    ...publicFailures(repo),
  ];
}

function groupBy<Item>(items: Item[], keyOf: (item: Item) => string | undefined) {
  const groups = new Map<string, Item[]>();
  for (const item of items) {
    const key = keyOf(item);
    if (key !== undefined) groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

function others<Item>(items: Item[], item: Item): Item[] {
  return items.filter((other) => other !== item);
}

function artifactIdFailures(entries: Entry[]): Failure[] {
  const byId = groupBy(entries, ({ id }) => id);
  return [...byId].flatMap(([id, sharers]) =>
    sharers.length < 2
      ? []
      : sharers.map((entry) => ({
          file: entry.file,
          line: entry.source.lineOfField("id"),
          column: 1,
          ruleId: "artifact-id",
          message: `the artifact ID \`${id}\` is also used by ${others(sharers, entry)
            .map(({ file }) => file)
            .join(", ")}`,
          skillSection: "Frontmatter" as const,
        })),
  );
}

function lineOf({ artifact: { entry }, slug, former }: HeldSlug): number {
  return former && entry !== undefined ? entry.source.lineOfListItem("formerSlugs", slug) : 1;
}

function slugFailures(repo: RepoArtifacts): Failure[] {
  return repo.artifacts.flatMap(heldSlugs).flatMap((held) =>
    heldSlugProblems(repo, held).map((message) => ({
      file: entryFile(held.artifact.slug),
      line: lineOf(held),
      column: 1,
      ruleId: "slug",
      message,
      skillSection: "Slugs" as const,
    })),
  );
}

function subjectFailures(entries: Entry[]): Failure[] {
  const bySpelling = groupBy(entries, ({ subject }) => subject);
  const spellingsOfOneSubject = groupBy([...bySpelling], ([spelling]) =>
    foldCaseAndAccents(spelling),
  );
  const spellingAndArtifacts = ([spelling, sharers]: [string, Entry[]]) =>
    `\`${spelling}\` (${sharers.map(({ file }) => file).join(", ")})`;
  return [...spellingsOfOneSubject.values()].flatMap((spellings) =>
    spellings.length < 2
      ? []
      : spellings.flatMap((spelling) =>
          spelling[1].slice(0, 1).map((firstEntry) => ({
            file: firstEntry.file,
            line: firstEntry.source.lineOfField("subject"),
            column: 1,
            ruleId: "subject",
            message: `the subject ${spellingAndArtifacts(spelling)} differs only in case or accents from ${others(
              spellings,
              spelling,
            )
              .map(spellingAndArtifacts)
              .join(" and ")}`,
            skillSection: "Frontmatter" as const,
          })),
        ),
  );
}

function publicFailures(repo: RepoArtifacts): Failure[] {
  const destinations = publicPaths(repo.artifacts).length;
  if (destinations <= accessAppDestinationLimit) return [];
  return entriesOf(repo.artifacts)
    .filter((entry) => entry.public)
    .map((entry) => ({
      file: entry.file,
      line: entry.source.lineOfField("public"),
      column: 1,
      ruleId: "public",
      message: `public artifacts need ${String(destinations)} Access destinations, and one Access app holds ${String(accessAppDestinationLimit)}; ask the owner which to make private`,
      skillSection: "Frontmatter" as const,
    }));
}
