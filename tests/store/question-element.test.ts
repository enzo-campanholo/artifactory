// @vitest-environment happy-dom
import type { MemoryTransport } from "@artifactory/design-system/state";
import type { SavedAttempt } from "@artifactory/design-system/saved-state";
import { afterEach, expect, test, vi } from "vitest";
import { isDisabled, mountMinimalQuestion } from "./minimal-question.ts";
import {
  artifactId,
  checked,
  earlierAttempt,
  heldCheck,
  neverChecked,
  nextChange,
  openPage,
  returnToTab,
  savedAttempts,
  seededTransport,
} from "./seeded-page.ts";

async function loadedQuestion(transport: MemoryTransport = seededTransport()) {
  const store = openPage(transport);
  const mounted = mountMinimalQuestion();
  await checked(store);
  return { ...mounted, store };
}

const capitalRight = {
  id: "first-attempt",
  startedAt: "2026-10-01T10:00:00.000Z",
  answers: [
    { questionId: "capital", response: 2, mark: "right", answeredAt: "2026-10-01T10:00:00.000Z" },
  ],
} satisfies SavedAttempt;

afterEach(() => {
  document.body.innerHTML = "";
});

test("a question shows the answers this device last showed as soon as the page's store starts, without announcing them", () => {
  openPage(neverChecked, undefined, [capitalRight]);
  const { question, input, status } = mountMinimalQuestion();

  expect(question.inert).toBe(false);
  expect(input.value).toBe("2");
  expect(isDisabled(input)).toBe(true);
  expect(status.textContent).toBe("Right");
  expect(status.getAttribute("aria-live")).toBe("off");
});

test("a question with no answer on the device is open as soon as the page's store starts", () => {
  openPage(neverChecked);
  const { question, input } = mountMinimalQuestion();

  expect(question.inert).toBe(false);
  expect(isDisabled(input)).toBe(false);
  expect(question.dataset.status).toBeUndefined();
});

test("a question carries its number as its name, once, on the element going to it focuses", async () => {
  const { question } = await loadedQuestion();

  expect(question.getAttribute("aria-label")).toBe("Question 1");
  expect(question.querySelector("fieldset")?.hasAttribute("aria-label")).toBe(false);
});

test("answering locks the question and shows the mark at once, saving until confirmed", async () => {
  const { question, input, button, status } = await loadedQuestion();

  input.value = "2";
  button.focus();
  button.click();

  expect(isDisabled(input)).toBe(true);
  expect(document.activeElement).toBe(status);
  expect(question.dataset.mark).toBe("right");
  expect(question.dataset.status).toBe("saving");
  await vi.waitFor(() => {
    expect(question.dataset.status).toBe("saved");
  });
  expect(question.dataset.mark).toBe("right");
});

test("a locked answer stays as first given", async () => {
  const transport = seededTransport();
  const { question, input, button } = await loadedQuestion(transport);
  input.value = "2";
  button.click();

  input.value = "1";
  button.click();

  expect(question.dataset.mark).toBe("right");
  await vi.waitFor(() => {
    expect(question.dataset.status).toBe("saved");
  });
  const [attempt] = await savedAttempts(transport);
  expect(attempt?.answers.map(({ response }) => response)).toEqual([2]);
});

test("a wrong answer is marked wrong", async () => {
  const { question, input, button } = await loadedQuestion();

  input.value = "1";
  button.click();

  expect(question.dataset.mark).toBe("wrong");
});

test("submitting without a response saves nothing and leaves the question open", async () => {
  const transport = seededTransport();
  const { question, input, button } = await loadedQuestion(transport);

  button.click();

  expect(isDisabled(input)).toBe(false);
  expect(question.dataset.mark).toBeUndefined();
  expect(await savedAttempts(transport)).toEqual([]);
});

test("a saved answer shows locked with its mark once the answers load", async () => {
  const transport = seededTransport([
    {
      id: "first-attempt",
      startedAt: "2026-10-01T10:00:00.000Z",
      answers: [
        {
          questionId: "capital",
          response: 2,
          mark: "right",
          answeredAt: "2026-10-01T10:00:00.000Z",
        },
      ],
    },
  ]);

  const { question, input } = await loadedQuestion(transport);

  expect(input.value).toBe("2");
  expect(isDisabled(input)).toBe(true);
  expect(question.dataset.mark).toBe("right");
  expect(question.dataset.status).toBe("saved");
});

test("a failed save stays locked as 'Not saved' without its mark, and 'Try saving again' saves it", async () => {
  const transport = seededTransport();
  const { question, input, button, status, recovery } = await loadedQuestion(transport);
  transport.forced.add("save fails");
  input.value = "2";
  button.click();

  await vi.waitFor(() => {
    expect(status.textContent).toBe("Not saved");
  });
  expect(recovery.hidden).toBe(false);
  expect(recovery.textContent).toBe("Try saving again");
  expect(isDisabled(input)).toBe(true);
  expect(question.dataset.status).toBe("not-saved");
  transport.forced.delete("save fails");
  const retry = recovery.querySelector("button");
  retry?.focus();
  retry?.click();

  expect(document.activeElement).toBe(status);
  await vi.waitFor(() => {
    expect(status.textContent).toBe("Right");
  });
  expect(recovery.hidden).toBe(true);
  expect(await savedAttempts(transport)).toMatchObject([
    { answers: [{ questionId: "capital", response: 2, mark: "right" }] },
  ]);
});

test("an answer replaced by one given on another device says so", async () => {
  const transport = seededTransport();
  const { question, input, button, status } = await loadedQuestion(transport);
  transport.forced.add("answered elsewhere");
  input.value = "2";
  button.click();

  await vi.waitFor(() => {
    expect(status.textContent).toBe("Right · Already answered on another device");
  });
  expect(question.dataset.status).toBe("answered-elsewhere");
});

test("an answer lost to a sign-out shows as not saved, without its mark", async () => {
  const transport = seededTransport();
  const { input, button, status } = await loadedQuestion(transport);
  transport.forced.add("signed out");
  input.value = "1";
  button.click();

  await vi.waitFor(() => {
    expect(status.textContent).toBe("Not saved · Signed out");
  });
  expect(isDisabled(input)).toBe(true);
});

test.each(["load fails", "signed out"] as const)(
  "a question stays as the page started when the first load comes back %s",
  async (outcome) => {
    const transport = seededTransport([capitalRight]);
    transport.forced.add(outcome);
    const store = openPage(transport, undefined, [capitalRight]);
    const { question, input, status } = mountMinimalQuestion();
    await vi.waitFor(() => {
      expect(store.answers.notices.loadFailed || store.answers.notices.signedOut).toBe(true);
    });

    expect(question.inert).toBe(false);
    expect(input.value).toBe("2");
    expect(status.textContent).toBe("Right");
    expect(question.dataset.status).toBe("saved");
  },
);

test("a saved answer the first load finds shows locked with its mark, without announcing it", async () => {
  const { held, release } = heldCheck(seededTransport([capitalRight]));
  const store = openPage(held);
  const { input, status } = mountMinimalQuestion();
  expect(isDisabled(input)).toBe(false);

  release();
  await checked(store);

  expect(status.textContent).toBe("Right");
  expect(status.getAttribute("aria-live")).toBe("off");
  expect(input.value).toBe("2");
  expect(isDisabled(input)).toBe(true);
});

test("a refresh keeps what you're typing in a question nobody has answered", async () => {
  const transport = seededTransport([earlierAttempt]);
  const { input, store } = await loadedQuestion(transport);
  input.value = "1";
  await transport.save(artifactId, "first-attempt", {
    questionId: "bridge",
    response: 4,
    mark: "right",
  });

  const refreshed = nextChange(store);
  returnToTab();
  await refreshed;

  expect(input.value).toBe("1");
  expect(isDisabled(input)).toBe(false);
});

test("a refresh replaces what you're typing in a question answered on another device, with a notice", async () => {
  const transport = seededTransport([earlierAttempt]);
  const { input, status } = await loadedQuestion(transport);
  input.value = "1";
  await transport.save(artifactId, "first-attempt", {
    questionId: "capital",
    response: 2,
    mark: "right",
  });

  returnToTab();

  await vi.waitFor(() => {
    expect(status.textContent).toBe("Right · Already answered on another device");
  });
  expect(input.value).toBe("2");
  expect(isDisabled(input)).toBe(true);
});

test("switching to a newer attempt reopens a question it hasn't answered", async () => {
  const transport = seededTransport([
    {
      ...earlierAttempt,
      answers: [
        {
          questionId: "capital",
          response: 1,
          mark: "wrong",
          answeredAt: "2020-10-01T10:00:00.000Z",
        },
      ],
    },
  ]);
  const { question, input, status } = await loadedQuestion(transport);
  expect(isDisabled(input)).toBe(true);
  await transport.save(artifactId, "second-attempt", {
    questionId: "river",
    response: 3,
    mark: "wrong",
  });

  returnToTab();

  await vi.waitFor(() => {
    expect(isDisabled(input)).toBe(false);
  });
  expect(input.value).toBe("");
  expect(question.dataset.mark).toBeUndefined();
  expect(question.dataset.status).toBeUndefined();
  expect(status.textContent).toBe("");
});
