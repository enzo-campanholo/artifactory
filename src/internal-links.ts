import type { BuiltSite } from "./built-output.ts";
import type { Failure } from "./check-failure.ts";
import { decoded, locate } from "./source-locator.ts";

const site = "https://artifactory.invalid";
const linkAttributes = ["href", "src"];

export function linkFailures({ pages, files, artifacts }: BuiltSite): Failure[] {
  const ids = new Map(
    pages.map(({ file, tags }) => [file, new Set(tags.flatMap((tag) => tag.get("id") ?? []))]),
  );
  const formerSlugOwners = new Map(
    artifacts.flatMap((artifact) =>
      artifact.formerSlugs.map((formerSlug) => [formerSlug, artifact] as const),
    ),
  );
  const artifactOnPage = new Map(artifacts.map((artifact) => [artifact.page.file, artifact]));

  function problemWith(link: string, page: string): string | undefined {
    const url = new URL(link, `${site}/${page}`);
    if (url.origin !== site) return undefined;
    const path = decoded(url.pathname);
    const candidates = path.endsWith("/") ? [`${path}index.html`] : [path, `${path}/index.html`];
    const target = candidates
      .map((candidate) => candidate.slice(1))
      .find((file) => files.has(file));
    if (target === undefined) {
      const owner = formerSlugOwners.get(path.split("/")[1] ?? "");
      if (owner !== undefined) {
        const current = `${url.pathname.replace(/^\/[^/]*/, `/${owner.slug}`)}${url.hash}`;
        return `the link \`${link}\` uses a former slug of ${owner.entry}; link to \`${current}\``;
      }
      return `the link \`${link}\` leads to no ${path.endsWith("/") ? "page" : "page or file"}`;
    }
    const id = decoded(url.hash.slice(1));
    if (id === "" || !target.endsWith(".html") || ids.get(target)?.has(id) === true) {
      return undefined;
    }
    const where = target === page ? "this page" : url.pathname;
    return `the link \`${link}\` leads to no element with ID \`${id}\` on ${where}`;
  }

  return pages.flatMap((page) => {
    const occurrences = new Map<string, number>();
    return page.tags.flatMap((tag) =>
      linkAttributes.flatMap((name): Failure[] => {
        const link = tag.get(name);
        if (link === undefined) return [];
        const occurrence = occurrences.get(link) ?? 0;
        occurrences.set(link, occurrence + 1);
        const message = problemWith(link, page.file);
        if (message === undefined) return [];
        const artifact = artifactOnPage.get(page.file);
        if (artifact === undefined) {
          return [
            {
              file: `dist/${page.file}`,
              line: 1,
              column: 1,
              ruleId: "link",
              message,
              skillSection: "Platform changes",
            },
          ];
        }
        return [
          {
            file: artifact.entry,
            ...locate(artifact.source, { kind: "link", destination: link, occurrence }).position,
            ruleId: "link",
            message,
            skillSection: "Links",
          },
        ];
      }),
    );
  });
}
