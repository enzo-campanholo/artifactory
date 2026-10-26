// @vitest-environment happy-dom
import { neverChecked, openPage } from "./seeded-page.ts";
import { expect, test } from "vitest";
import { mountMinimalQuestion } from "./minimal-question.ts";

test("a question that connects before the page's store starts stays inert until the store starts", () => {
  const { question } = mountMinimalQuestion();
  expect(question.inert).toBe(true);

  openPage(neverChecked);

  expect(question.inert).toBe(false);
});
