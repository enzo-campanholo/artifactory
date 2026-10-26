import {
  libraryQuestionsBlock,
  placedQuestionsInBlock,
} from "@artifactory/design-system/question-markers";
import type { BuiltSite } from "./built-output.ts";
import { stampPages } from "./stamp-pages.ts";

export async function stampLibraryQuestions(
  outDir: string,
  { pages, artifacts }: BuiltSite,
): Promise<void> {
  await stampPages(outDir, pages, libraryQuestionsBlock([]), ({ tags }) =>
    libraryQuestionsBlock(
      tags.flatMap((tag) =>
        artifacts
          .filter(
            ({ artifactId, questions }) =>
              artifactId === tag.get("data-artifact-id") && questions.length > 0,
          )
          .map(({ artifactId, page }) => ({
            artifactId,
            questions: placedQuestionsInBlock(page.html),
          })),
      ),
    ),
  );
}
