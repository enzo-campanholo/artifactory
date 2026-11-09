// @vitest-environment happy-dom
import "@artifactory/design-system/single-choice-element";
import type { SavedAttempt } from "@artifactory/design-system/saved-state";
import type { MemoryTransport } from "@artifactory/design-system/state";
import { afterEach, expect, test, vi } from "vitest";
import {
  artifactId,
  capital,
  checked,
  nextChange,
  openPage,
  returnToTab,
  savedAttempts,
  seededTransport,
} from "./seeded-page.ts";

function mountSingleChoice() {
  const template = document.createElement("template");
  template.innerHTML = `
    <artifact-single-choice id="q-capital" class="question" data-question-id="capital" data-question-kind="single-choice" data-question-key="2" inert="">
      <form>
        <p class="question-status" role="status" tabindex="-1"></p>
        <fieldset aria-describedby="q-capital--prompt">
          <div class="question-prompt" id="q-capital--prompt"><p>Which city is the capital of Brazil?</p></div>
          <ol class="single-choice-options">
            <li><label><input type="radio" name="q-capital" value="1" required><span>Rio de Janeiro</span></label></li>
            <li><label><input type="radio" name="q-capital" value="2" required><span>Brasília</span></label></li>
          </ol>
          <div class="question-actions">
            <button type="submit" class="question-check" aria-disabled="true">Check</button>
          </div>
        </fieldset>
        <div class="question-explanation" hidden>
          <p>Brasília has been the capital since 1960; Rio de Janeiro was the one before it.</p>
        </div>
        <div class="question-recovery" hidden></div>
      </form>
    </artifact-single-choice>`;
  document.body.replaceChildren(template.content);
  const question = document.querySelector<HTMLElement>("artifact-single-choice");
  const explanation = document.querySelector<HTMLElement>(".question-explanation");
  const check = document.querySelector("button");
  const status = document.querySelector(".question-status");
  if (question === null || explanation === null || check === null || status === null) {
    throw new Error("not mounted");
  }
  const choose = (option: 1 | 2) => {
    const radio = question.querySelector<HTMLInputElement>(`input[value="${String(option)}"]`);
    if (radio === null) throw new Error(`no option ${String(option)}`);
    radio.checked = true;
    radio.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const rightOptionTicked = () => question.querySelector("li[data-right-answer]") !== null;
  return { question, explanation, check, status, choose, rightOptionTicked };
}

async function loadedSingleChoice(transport: MemoryTransport, startFrom: SavedAttempt[] = []) {
  const store = openPage(transport, [capital], startFrom);
  const mounted = mountSingleChoice();
  await checked(store);
  return { ...mounted, store };
}

function attemptWith(response: number, mark: "right" | "wrong"): SavedAttempt {
  return {
    id: "first-attempt",
    startedAt: "2026-10-01T10:00:00.000Z",
    answers: [{ questionId: "capital", response, mark, answeredAt: "2026-10-01T10:00:00.000Z" }],
  };
}

afterEach(() => {
  document.body.innerHTML = "";
});

test("the explanation stays hidden until the answer saves, then shows with focus left on the status", async () => {
  const { explanation, check, status, choose, question } =
    await loadedSingleChoice(seededTransport());
  expect(explanation.hidden).toBe(true);
  choose(2);

  check.focus();
  check.click();

  expect(question.dataset.status).toBe("saving");
  expect(explanation.hidden).toBe(true);
  await vi.waitFor(() => {
    expect(question.dataset.status).toBe("saved");
  });
  expect(explanation.hidden).toBe(false);
  expect(document.activeElement).toBe(status);
});

test("a wrong answer shows the explanation once saved, with the right option ticked", async () => {
  const { explanation, check, choose, question, rightOptionTicked } =
    await loadedSingleChoice(seededTransport());
  choose(1);

  check.click();

  expect(rightOptionTicked()).toBe(false);
  expect(explanation.hidden).toBe(true);
  await vi.waitFor(() => {
    expect(question.dataset.status).toBe("saved");
  });
  expect(question.dataset.mark).toBe("wrong");
  expect(rightOptionTicked()).toBe(true);
  expect(explanation.hidden).toBe(false);
});

test("a locked answer this device last showed shows the explanation as soon as the store starts", () => {
  openPage(
    {
      load: () => new Promise<never>(() => undefined),
      save: () => new Promise<never>(() => undefined),
    },
    [capital],
    [attemptWith(1, "wrong")],
  );

  const { explanation } = mountSingleChoice();

  expect(explanation.hidden).toBe(false);
});

test("an answer loaded from the server shows the explanation", async () => {
  const { explanation, question } = await loadedSingleChoice(
    seededTransport([attemptWith(2, "right")]),
  );

  expect(question.dataset.status).toBe("saved");
  expect(explanation.hidden).toBe(false);
});

test("an answer given first on another device shows the explanation", async () => {
  const transport = seededTransport();
  const { explanation, check, choose, status } = await loadedSingleChoice(transport);
  transport.forced.add("answered elsewhere");
  choose(2);

  check.click();

  await vi.waitFor(() => {
    expect(status.textContent).toBe("Right · Already answered on another device");
  });
  expect(explanation.hidden).toBe(false);
});

test("an answer that didn't save keeps the explanation hidden until 'Try saving again' saves it", async () => {
  const transport = seededTransport();
  const { explanation, check, choose, question, rightOptionTicked } =
    await loadedSingleChoice(transport);
  transport.forced.add("save fails");
  choose(1);
  check.click();
  await vi.waitFor(() => {
    expect(question.dataset.status).toBe("not-saved");
  });
  expect(explanation.hidden).toBe(true);
  expect(rightOptionTicked()).toBe(false);
  transport.forced.delete("save fails");

  question.querySelector<HTMLButtonElement>(".question-recovery button")?.click();

  await vi.waitFor(() => {
    expect(question.dataset.status).toBe("saved");
  });
  expect(explanation.hidden).toBe(false);
});

test("an answer lost to a sign-out keeps the explanation hidden", async () => {
  const transport = seededTransport();
  const { explanation, check, choose, status } = await loadedSingleChoice(transport);
  transport.forced.add("signed out");
  choose(2);

  check.click();

  await vi.waitFor(() => {
    expect(status.textContent).toBe("Not saved · Signed out");
  });
  expect(explanation.hidden).toBe(true);
});

test("Start over hides the explanation again, and Undo brings it back", async () => {
  const { explanation, store } = await loadedSingleChoice(
    seededTransport([attemptWith(1, "wrong")]),
  );

  store.answers.startOver();

  expect(explanation.hidden).toBe(true);
  store.answers.undoStartOver();
  expect(explanation.hidden).toBe(false);
});

test("a switch to another device's attempt that hasn't answered the question hides the explanation", async () => {
  const transport = seededTransport([attemptWith(2, "right")]);
  const { explanation, store } = await loadedSingleChoice(transport, [attemptWith(2, "right")]);
  await transport.save(artifactId, "second-attempt", {
    questionId: "river",
    response: 1,
    mark: "right",
  });

  const refreshed = nextChange(store);
  returnToTab();
  await refreshed;

  expect(store.answers.notices.attemptSwitched).toBe(true);
  expect(explanation.hidden).toBe(true);
});

test("the saved answer is only the option chosen and its mark, explanation or not", async () => {
  const transport = seededTransport();
  const { check, choose, question } = await loadedSingleChoice(transport);
  choose(2);

  check.click();
  await vi.waitFor(() => {
    expect(question.dataset.status).toBe("saved");
  });

  const [attempt] = await savedAttempts(transport);
  expect(attempt?.answers).toEqual([
    { questionId: "capital", response: 2, mark: "right", answeredAt: expect.any(String) },
  ]);
});
