// @vitest-environment happy-dom
import "@artifactory/design-system/open-question-element";
import type { MemoryTransport } from "@artifactory/design-system/state";
import { afterEach, expect, test, vi } from "vitest";
import { isDisabled } from "./minimal-question.ts";
import { checked, openPage, savedAttempts, seededTransport } from "./seeded-page.ts";

function mountOpenQuestion(restored = "") {
  const template = document.createElement("template");
  template.innerHTML = `
    <artifact-open-question id="q-tides" class="question" data-question-id="tides" inert="">
      <form>
        <fieldset aria-labelledby="q-tides--prompt">
          <div class="question-prompt" id="q-tides--prompt"><p>Why are there two high tides a day?</p></div>
          <label class="open-question-answer"><span data-lang="en">Your answer</span><textarea rows="4" required></textarea></label>
        </fieldset>
        <details class="question-model-answer">
          <summary><span data-lang="en">Show the model answer</span></summary>
          <div class="question-model-answer-text"><p>The Moon pulls the near side of the Earth and leaves the far side behind.</p></div>
          <fieldset class="question-own-mark">
            <button type="submit" class="question-button" name="mark" value="right"><span data-lang="en">I got it right</span></button>
            <button type="submit" class="question-button" name="mark" value="wrong"><span data-lang="en">I got it wrong</span></button>
          </fieldset>
        </details>
        <p class="question-status" role="status"></p>
        <div class="question-recovery" hidden></div>
      </form>
    </artifact-open-question>`;
  const restoredInto = template.content.querySelector("textarea");
  if (restoredInto !== null) restoredInto.value = restored;
  document.body.replaceChildren(template.content);
  const question = document.querySelector<HTMLElement>("artifact-open-question");
  const textarea = document.querySelector("textarea");
  const modelAnswer = document.querySelector("details");
  const reveal = document.querySelector("summary");
  const right = document.querySelector<HTMLButtonElement>("button[value=right]");
  const wrong = document.querySelector<HTMLButtonElement>("button[value=wrong]");
  if (
    question === null ||
    textarea === null ||
    modelAnswer === null ||
    reveal === null ||
    right === null ||
    wrong === null
  ) {
    throw new Error("not mounted");
  }
  return { question, textarea, modelAnswer, reveal, right, wrong };
}

async function loadedOpenQuestion(transport: MemoryTransport) {
  const store = openPage(transport, [{ id: "tides", kind: "open-question" }]);
  const mounted = mountOpenQuestion();
  await checked(store);
  return { ...mounted, store };
}

afterEach(() => {
  document.body.innerHTML = "";
});

test("revealing the model answer saves nothing and leaves the question open", async () => {
  const transport = seededTransport();
  const { question, textarea, modelAnswer, reveal } = await loadedOpenQuestion(transport);
  textarea.value = "Gravity from the Moon.";

  reveal.click();

  expect(modelAnswer.open).toBe(true);
  expect(isDisabled(textarea)).toBe(false);
  expect(question.dataset.mark).toBeUndefined();
  expect(await savedAttempts(transport)).toEqual([]);
});

test("an answer the browser restores before the question shows can reveal the model answer", () => {
  openPage(seededTransport(), [{ id: "tides", kind: "open-question" }]);

  const { reveal } = mountOpenQuestion("Gravity from the Moon.");

  expect(reveal.getAttribute("aria-disabled")).toBe("false");
});

test("an answer the browser restores once the page shows again can reveal the model answer", async () => {
  const { textarea, reveal } = await loadedOpenQuestion(seededTransport());
  textarea.value = "Gravity from the Moon.";

  window.dispatchEvent(new Event("pageshow"));

  expect(reveal.getAttribute("aria-disabled")).toBe("false");
});

test("marking saves the answer once with the owner's own mark, then locks the question", async () => {
  const transport = seededTransport();
  const { question, textarea, reveal, right, wrong } = await loadedOpenQuestion(transport);
  textarea.value = "Gravity from the Moon.";
  reveal.click();

  wrong.click();

  expect(isDisabled(textarea)).toBe(true);
  expect(isDisabled(right)).toBe(true);
  expect(question.dataset.mark).toBe("wrong");
  expect(question.dataset.status).toBe("saving");
  await vi.waitFor(() => {
    expect(question.dataset.status).toBe("saved");
  });

  right.click();

  expect(question.dataset.mark).toBe("wrong");
  const [attempt] = await savedAttempts(transport);
  expect(attempt?.answers).toMatchObject([
    { questionId: "tides", response: "Gravity from the Moon.", mark: "wrong" },
  ]);
});

test("marking with no answer written saves nothing", async () => {
  const transport = seededTransport();
  const { question, textarea, reveal, right } = await loadedOpenQuestion(transport);
  textarea.value = "  ";
  reveal.click();

  right.click();

  expect(isDisabled(textarea)).toBe(false);
  expect(question.dataset.mark).toBeUndefined();
  expect(await savedAttempts(transport)).toEqual([]);
});

test("a marked answer shows locked with the owner's mark once the answers load", async () => {
  const transport = seededTransport([
    {
      id: "first-attempt",
      startedAt: "2026-10-01T10:00:00.000Z",
      answers: [
        {
          questionId: "tides",
          response: "The Moon's pull is uneven across the Earth.",
          mark: "right",
          answeredAt: "2026-10-01T10:00:00.000Z",
        },
      ],
    },
  ]);

  const { question, textarea } = await loadedOpenQuestion(transport);

  expect(textarea.value).toBe("The Moon's pull is uneven across the Earth.");
  expect(isDisabled(textarea)).toBe(true);
  expect(question.dataset.mark).toBe("right");
  expect(question.dataset.status).toBe("saved");
});

test("starting over empties a marked answer and hides the model answer again", async () => {
  const transport = seededTransport();
  const { question, textarea, modelAnswer, reveal, right, store } =
    await loadedOpenQuestion(transport);
  textarea.value = "Gravity from the Moon.";
  reveal.click();
  right.click();
  await vi.waitFor(() => {
    expect(question.dataset.status).toBe("saved");
  });

  store.answers.startOver();

  expect(textarea.value).toBe("");
  expect(isDisabled(textarea)).toBe(false);
  expect(modelAnswer.open).toBe(false);
  expect(question.dataset.mark).toBeUndefined();
});
