import {
  claims,
  isClaim,
  proofsOnPage,
  statementsOnPage,
  unresolvedCitationsOnPage,
  type StatementOnPage,
} from "@artifactory/design-system/statements";
import type { BuiltArtifact } from "./built-output.ts";
import type { Failure } from "./check-failure.ts";
import { checkedIds } from "./id-failures.ts";
import { locate } from "./source-locator.ts";

function solutionProblem({ id, kind, solution }: StatementOnPage): string | undefined {
  if (kind === "example") {
    return solution === "shown"
      ? undefined
      : `the example \`${id}\` has no solution: write the problem, then \`---\` between blank lines, then the solution`;
  }
  if (solution === undefined) return undefined;
  if (solution === "empty") {
    return `the \`${kind}\` \`${id}\` has a \`---\` with nothing after it, but only an example has a solution: remove the \`---\``;
  }
  const after = isClaim(kind) ? `a \`<Proof of="${id}">\` or a paragraph` : "a paragraph";
  return `the \`${kind}\` \`${id}\` has a \`---\`, but only an example has a solution: give it \`kind="example"\`, or move what follows \`---\` after the statement, as ${after}`;
}

const claimKinds = new Intl.ListFormat("en-GB", { type: "disjunction" }).format(claims);

export function statementFailures({ entry, source, page }: BuiltArtifact): Failure[] {
  const failure = (
    position: { line: number; column: number },
    ruleId: string,
    message: string,
  ): Failure => ({ file: entry, ...position, ruleId, message, skillSection: "Components" });

  const statements = checkedIds(source, "statement", statementsOnPage(page.html)).flatMap(
    ({ item, position, problem }) => {
      if (problem !== undefined) return [failure(position, "statement-id", problem)];
      const unnumbered = item.numbered
        ? undefined
        : `the statement \`${item.id}\` has no section number: write it after the first \`##\` heading, at the top level, not inside a list, a question or another component`;
      const unsolved = solutionProblem(item);
      return [
        ...(unnumbered === undefined ? [] : [failure(position, "statement-section", unnumbered)]),
        ...(unsolved === undefined ? [] : [failure(position, "statement-solution", unsolved)]),
      ];
    },
  );

  const cited = new Map<string, number>();
  const citations = unresolvedCitationsOnPage(page.html).map((to) => {
    const occurrence = cited.get(to) ?? 0;
    cited.set(to, occurrence + 1);
    return failure(
      locate(source, { kind: "citation", to, occurrence }).position,
      "citation-target",
      `the citation \`${to}\` names no statement in this artifact; give \`to\` a statement's ID`,
    );
  });

  const proved = new Map<string, number>();
  const proofs = proofsOnPage(page.html).flatMap(({ of, proves }) => {
    const occurrence = proved.get(of) ?? 0;
    proved.set(of, occurrence + 1);
    if (proves !== undefined && isClaim(proves)) return [];
    const named =
      proves === undefined
        ? "names no statement in this artifact"
        : `names a statement of kind \`${proves}\``;
    return [
      failure(
        locate(source, { kind: "proof", of, occurrence }).position,
        "proof-target",
        `the proof of \`${of}\` ${named}; give \`of\` the ID of the ${claimKinds} it proves`,
      ),
    ];
  });

  return [...statements, ...citations, ...proofs];
}
