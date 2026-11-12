import { componentsOnPage } from "@artifactory/design-system/component-rules";
import type { BuiltArtifact, BuiltPage, BuiltSite } from "./built-output.ts";
import type { Failure } from "./check-failure.ts";
import { locate } from "./source-locator.ts";

function failure(
  place: Pick<Failure, "file" | "line" | "column" | "skillSection">,
  message: string,
): Failure {
  return { ...place, ruleId: "component-rule", message };
}

// A broken component renders only its marker, so the rest of its artifact's page is left unchecked:
// what's missing would fail checks that pass once the component is fixed.
export function componentRuleFailures(site: BuiltSite): {
  failures: Failure[];
  checked: BuiltArtifact[];
} {
  const artifactPages = new Set(site.artifacts.map(({ page }) => page.file));
  const failures = site.pages
    .filter(({ file }) => !artifactPages.has(file))
    .flatMap(unplacedFailures);
  const checked: BuiltArtifact[] = [];
  for (const artifact of site.artifacts) {
    const placed = placedFailures(artifact);
    failures.push(...placed);
    if (placed.length === 0) checked.push(artifact);
  }
  return { failures, checked };
}

function placedFailures({ entry, source, page }: BuiltArtifact): Failure[] {
  const instances = componentsOnPage(page.html);
  const seen = new Map<string, number>();
  return instances.flatMap(({ module, brokenRule }) => {
    const occurrence = seen.get(module) ?? 0;
    seen.set(module, occurrence + 1);
    if (brokenRule === undefined) return [];
    const onPage = instances.filter((instance) => instance.module === module).length;
    const { position } = locate(source, { kind: "component-instance", module, occurrence, onPage });
    return [failure({ file: entry, ...position, skillSection: "Components" }, brokenRule)];
  });
}

// A page that isn't an artifact's, such as the catalog's, has no entry to place a component at,
// and only a platform change puts a component there.
function unplacedFailures({ file, html }: BuiltPage): Failure[] {
  const route = `/${file.replace(/(^|\/)index\.html$/, "$1")}`;
  return componentsOnPage(html).flatMap(({ brokenRule }) =>
    brokenRule === undefined
      ? []
      : [
          failure(
            { file: "astro.config.ts", line: 1, column: 1, skillSection: "Platform changes" },
            `${brokenRule}; on ${route}, which isn't an artifact's page`,
          ),
        ],
  );
}

// The checks that read the built pages after the build leave the same pages unchecked.
export function hasBrokenComponent(html: string): boolean {
  return componentsOnPage(html).some(({ brokenRule }) => brokenRule !== undefined);
}
