import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { QuestionManifest } from "@artifactory/design-system/saved-state";
import type { BuiltArtifact } from "./built-output.ts";
import type { Failure } from "./check-failure.ts";
import { checkedIds } from "./id-failures.ts";

export const manifestFile = "dist-worker/question-manifest.json";

export async function writeQuestionManifest(
  root: string,
  artifacts: BuiltArtifact[],
): Promise<void> {
  const manifest: QuestionManifest = Object.fromEntries(
    artifacts.map(({ artifactId, contentHash, questions }) => [
      artifactId,
      { contentHash, questions },
    ]),
  );
  const manifestPath = join(root, manifestFile);
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

export function questionIdFailures({ entry, source, questions }: BuiltArtifact): Failure[] {
  return checkedIds(source, "question", questions).flatMap(({ position, problem }) =>
    problem === undefined
      ? []
      : [
          {
            file: entry,
            ...position,
            ruleId: "question-id",
            message: problem,
            skillSection: "Components",
          },
        ],
  );
}
