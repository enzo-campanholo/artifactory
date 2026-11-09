// @vitest-environment happy-dom
import "@artifactory/design-system/artifact-attempt";
import "@artifactory/design-system/matching-element";
import type { SavedAttempt } from "@artifactory/design-system/saved-state";
import type { Question } from "@artifactory/design-system/scoring";
import type { MemoryTransport, Transport } from "@artifactory/design-system/state";
import { afterEach, expect, test, vi } from "vitest";
import { isDisabled } from "./minimal-question.ts";
import {
  capital,
  checked,
  neverChecked,
  openPage,
  savedAttempts,
  seededTransport,
} from "./seeded-page.ts";

const options = ["Code", "Data", "Stack", "Heap"];
const items = [
  { id: "global-variable", text: "A global variable", key: 2 },
  { id: "local-variable", text: "A local variable", key: 3 },
  { id: "new-object", text: "An object made with new", key: 4 },
] as const;
type ItemId = (typeof items)[number]["id"];

const itemQuestions: Question[] = items.map(({ id, key }) => ({ id, kind: "single-choice", key }));

function mountMatching() {
  const optionId = (index: number) => `q-global-variable--option-${String(index + 1)}`;
  const row = ({ id, text, key }: (typeof items)[number]) => `
    <div id="q-${id}" data-question-id="${id}" data-question-kind="single-choice" data-question-key="${String(key)}" class="matching-item" role="group" aria-describedby="q-${id}--item">
      <fieldset>
        <span class="matching-item-text" id="q-${id}--item">${text}</span>
        <span class="matching-choices">
          ${options
            .map(
              (_, index) =>
                `<label><input type="radio" name="q-${id}" value="${String(index + 1)}" aria-labelledby="${optionId(index)}" required><span aria-hidden="true">${"abcd"[index] ?? ""}</span></label>`,
            )
            .join("")}
        </span>
        <span class="matching-item-mark" role="status"></span>
      </fieldset>
    </div>`;
  const template = document.createElement("template");
  template.innerHTML = `
    <artifact-matching class="question matching" role="group" inert="">
      <form>
        <div class="question-header">
          <p class="question-status" role="status" tabindex="-1"></p>
        </div>
        <fieldset>
          <div class="question-prompt"><p>Where in memory does each item live?</p></div>
          <ol class="matching-options">
            ${options.map((option, index) => `<li><span id="${optionId(index)}">${option}</span></li>`).join("")}
          </ol>
          <div class="matching-items">${items.map(row).join("")}</div>
          <div class="question-actions">
            <button type="submit" class="question-check" aria-disabled="true">Check</button>
          </div>
        </fieldset>
        <div class="question-explanation" hidden>
          <p>Locals live in the call's frame, on the stack; new allocates on the heap, and globals sit in the data area.</p>
        </div>
        <div class="question-recovery" hidden></div>
      </form>
    </artifact-matching>`;
  document.body.replaceChildren(template.content);
  const part = (selector: string) => {
    const found = document.querySelector<HTMLElement>(selector);
    if (found === null) throw new Error(`no ${selector}`);
    return found;
  };
  const box = part("artifact-matching");
  const rowOf = (id: ItemId) => part(`#q-${id}`);
  const choose = (id: ItemId, option: number) => {
    const radio = part(`#q-${id} input[value="${String(option)}"]`);
    if (!(radio instanceof HTMLInputElement)) throw new Error(`no option ${String(option)}`);
    radio.checked = true;
    radio.dispatchEvent(new Event("input", { bubbles: true }));
  };
  return {
    box,
    rowOf,
    choose,
    check: part(".question-check"),
    status: part(".question-status"),
    explanation: part(".question-explanation"),
    recovery: part(".question-recovery"),
    markOf: (id: ItemId) => part(`#q-${id} .matching-item-mark`),
    radiosOf: (id: ItemId) => [...rowOf(id).querySelectorAll("input")],
  };
}

async function loadedMatching(transport: Transport, startFrom: SavedAttempt[] = []) {
  const store = openPage(transport, [capital, ...itemQuestions], startFrom);
  const mounted = mountMatching();
  await checked(store);
  return { ...mounted, store };
}

afterEach(() => {
  document.body.innerHTML = "";
  history.replaceState(null, "", "/");
});

test("Check is enabled only once every unanswered item has a choice, and pressing it before saves nothing", async () => {
  const transport = seededTransport();
  const { check, choose, rowOf, radiosOf } = await loadedMatching(transport);

  choose("global-variable", 2);
  choose("local-variable", 1);
  expect(check.getAttribute("aria-disabled")).toBe("true");
  check.click();

  expect(rowOf("global-variable").dataset.status).toBeUndefined();
  expect(radiosOf("global-variable").some(isDisabled)).toBe(false);
  expect(await savedAttempts(transport)).toEqual([]);
  choose("new-object", 4);
  expect(check.getAttribute("aria-disabled")).toBe("false");
});

const rightLetterOf = (row: HTMLElement) =>
  row.querySelector("label[data-right-answer] input")?.getAttribute("value");

test("Check saves every item together, and each locks with its own mark while the header says only that the set is answered", async () => {
  const transport = seededTransport();
  const { box, check, choose, rowOf, radiosOf, status } = await loadedMatching(transport);
  choose("global-variable", 2);
  choose("local-variable", 4);
  choose("new-object", 4);
  check.focus();

  check.click();

  for (const { id } of items) {
    expect(rowOf(id).dataset.status).toBe("saving");
    expect(radiosOf(id).every(isDisabled)).toBe(true);
  }
  expect(box.dataset.status).toBe("saving");
  expect(status.textContent).toBe("Saving");
  expect(document.activeElement).toBe(status);
  await vi.waitFor(() => {
    expect(box.dataset.status).toBe("saved");
  });
  expect(items.map(({ id }) => rowOf(id).dataset.mark)).toEqual(["right", "wrong", "right"]);
  expect(items.map(({ id }) => rightLetterOf(rowOf(id)))).toEqual([undefined, "3", undefined]);
  expect(status.textContent).toBe("Answered");
  expect(box.dataset.mark).toBeUndefined();
  expect(box.textContent).not.toMatch(/\d\s*(of|de)\s*\d/);
  expect(await savedAttempts(transport)).toMatchObject([
    {
      answers: [
        { questionId: "global-variable", response: 2, mark: "right" },
        { questionId: "local-variable", response: 4, mark: "wrong" },
        { questionId: "new-object", response: 4, mark: "right" },
      ],
    },
  ]);
});

test("each row's mark is announced with its item's number, and the right letter of a wrong one", async () => {
  const { check, choose, rowOf, markOf } = await loadedMatching(seededTransport());
  choose("global-variable", 2);
  choose("local-variable", 4);
  choose("new-object", 4);

  check.click();

  await vi.waitFor(() => {
    expect(rowOf("new-object").dataset.status).toBe("saved");
  });
  expect(items.map(({ id }) => rowOf(id).getAttribute("aria-label"))).toEqual([
    "Question 2",
    "Question 3",
    "Question 4",
  ]);
  expect(items.map(({ id }) => markOf(id).textContent)).toEqual([
    "Question 2: Right",
    "Question 3: Wrong · Right answer: c)",
    "Question 4: Right",
  ]);
  expect(markOf("global-variable").hasAttribute("aria-live")).toBe(false);
});

const answeredAt = "2026-10-01T10:00:00.000Z";

function attemptWith(answers: [ItemId, number, "right" | "wrong"][]): SavedAttempt {
  return {
    id: "first-attempt",
    startedAt: answeredAt,
    answers: answers.map(([questionId, response, mark]) => ({
      questionId,
      response,
      mark,
      answeredAt,
    })),
  };
}

const everyItemAnswered = attemptWith([
  ["global-variable", 2, "right"],
  ["local-variable", 4, "wrong"],
  ["new-object", 4, "right"],
]);

test("answers this device last showed show locked with their marks as soon as the store starts, without being announced", () => {
  openPage(neverChecked, [capital, ...itemQuestions], [everyItemAnswered]);

  const { box, rowOf, radiosOf, status, markOf } = mountMatching();

  expect(box.inert).toBe(false);
  expect(items.map(({ id }) => rowOf(id).dataset.mark)).toEqual(["right", "wrong", "right"]);
  expect(radiosOf("local-variable").find(({ checked: chosen }) => chosen)?.value).toBe("4");
  expect(rightLetterOf(rowOf("local-variable"))).toBe("3");
  expect(status.textContent).toBe("Answered");
  expect(status.getAttribute("aria-live")).toBe("off");
  for (const { id } of items) expect(markOf(id).getAttribute("aria-live")).toBe("off");
});

test("an item added to a set an attempt already answered opens alone, and Check saves just it", async () => {
  const answeredBefore = attemptWith([
    ["global-variable", 2, "right"],
    ["local-variable", 4, "wrong"],
  ]);
  const transport = seededTransport([answeredBefore]);
  const { box, check, choose, rowOf, radiosOf, status } = await loadedMatching(transport);

  expect(rowOf("new-object").dataset.status).toBeUndefined();
  expect(radiosOf("new-object").some(isDisabled)).toBe(false);
  expect(radiosOf("global-variable").every(isDisabled)).toBe(true);
  expect(rowOf("local-variable").dataset.mark).toBe("wrong");
  expect(box.dataset.status).toBeUndefined();
  expect(status.textContent).toBe("");
  expect(check.getAttribute("aria-disabled")).toBe("true");
  choose("new-object", 1);
  expect(check.getAttribute("aria-disabled")).toBe("false");

  check.click();

  await vi.waitFor(() => {
    expect(box.dataset.status).toBe("saved");
  });
  const [attempt] = await savedAttempts(transport);
  expect(attempt?.answers.map(({ questionId, response }) => [questionId, response])).toEqual([
    ["global-variable", 2],
    ["local-variable", 4],
    ["new-object", 1],
  ]);
});

test("Start over reopens every item", async () => {
  const { box, store, rowOf, radiosOf, status, markOf, check } = await loadedMatching(
    seededTransport([everyItemAnswered]),
  );

  store.answers.startOver();

  for (const { id } of items) {
    expect(rowOf(id).dataset.status).toBeUndefined();
    expect(radiosOf(id).some(isDisabled)).toBe(false);
    expect(radiosOf(id).some(({ checked: chosen }) => chosen)).toBe(false);
    expect(markOf(id).textContent).toBe("");
    expect(rightLetterOf(rowOf(id))).toBeUndefined();
  }
  expect(box.dataset.status).toBeUndefined();
  expect(status.textContent).toBe("");
  expect(check.getAttribute("aria-disabled")).toBe("true");
});

// Saves of the global variable never come back and saves of the local one fail; the rest save.
function splitTransport(memory: MemoryTransport) {
  const sent: string[] = [];
  const transport: Transport = {
    load: (id) => memory.load(id),
    save: (id, attemptId, given) => {
      sent.push(given.questionId);
      if (given.questionId === "global-variable") return new Promise<never>(() => undefined);
      if (given.questionId === "local-variable") return Promise.resolve({ outcome: "failed" });
      return memory.save(id, attemptId, given);
    },
  };
  return { transport, sent };
}

test("the header shows its most urgent item's state, and 'Try saving again' retries only the unsaved items", async () => {
  const { transport, sent } = splitTransport(seededTransport());
  const { box, check, choose, rowOf, status, recovery } = await loadedMatching(transport);
  choose("global-variable", 2);
  choose("local-variable", 3);
  choose("new-object", 4);

  check.click();

  await vi.waitFor(() => {
    expect(rowOf("local-variable").dataset.status).toBe("not-saved");
  });
  await vi.waitFor(() => {
    expect(rowOf("new-object").dataset.status).toBe("saved");
  });
  expect(rowOf("global-variable").dataset.status).toBe("saving");
  expect(box.dataset.status).toBe("not-saved");
  expect(status.textContent).toBe("Not saved");
  expect(recovery.hidden).toBe(false);
  expect(recovery.textContent).toBe("Try saving again");
  expect(sent.sort()).toEqual(["global-variable", "local-variable", "new-object"]);
  sent.length = 0;

  recovery.querySelector("button")?.click();

  await vi.waitFor(() => {
    expect(sent).toEqual(["local-variable"]);
  });
});

test("an item still saving heads the box over items answered on another device", async () => {
  const memory = seededTransport();
  const transport: Transport = {
    load: (id) => memory.load(id),
    save: (id, attemptId, given) => {
      if (given.questionId === "global-variable") return new Promise<never>(() => undefined);
      memory.forced.add("answered elsewhere");
      return memory.save(id, attemptId, given);
    },
  };
  const { box, check, choose, rowOf, status } = await loadedMatching(transport);
  choose("global-variable", 2);
  choose("local-variable", 3);
  choose("new-object", 4);

  check.click();

  await vi.waitFor(() => {
    expect(rowOf("new-object").dataset.status).toBe("answered-elsewhere");
  });
  expect(box.dataset.status).toBe("saving");
  expect(status.textContent).toBe("Saving");
});

test("a set answered first on another device says so, with no mark in the header", async () => {
  const transport = seededTransport();
  const { box, check, choose, status } = await loadedMatching(transport);
  transport.forced.add("answered elsewhere");
  choose("global-variable", 2);
  choose("local-variable", 3);
  choose("new-object", 4);

  check.click();

  await vi.waitFor(() => {
    expect(status.textContent).toBe("Already answered on another device");
  });
  expect(box.dataset.status).toBe("answered-elsewhere");
  expect(box.dataset.mark).toBeUndefined();
});

test("a set lost to a sign-out shows as not saved, with no row marked", async () => {
  const transport = seededTransport();
  const { check, choose, status, markOf, rowOf } = await loadedMatching(transport);
  transport.forced.add("signed out");
  choose("global-variable", 1);
  choose("local-variable", 3);
  choose("new-object", 4);

  check.click();

  await vi.waitFor(() => {
    expect(status.textContent).toBe("Not saved · Signed out");
  });
  for (const { id } of items) expect(markOf(id).textContent).toBe("");
  expect(rightLetterOf(rowOf("global-variable"))).toBeUndefined();
});

test("the stopping point and Next question go to an item's row and name it by its own number", async () => {
  const transport = seededTransport([
    {
      id: "first-attempt",
      startedAt: answeredAt,
      answers: [{ questionId: "capital", response: 2, mark: "right", answeredAt }],
    },
  ]);
  const { rowOf, store } = await loadedMatching(transport);
  const template = document.createElement("template");
  template.innerHTML = `
    <artifact-attempt>
      <p data-part="where">4 questions.</p>
      <button type="button" data-action="resume"><span data-part="resume-label">Start with question 1</span></button>
      <button type="button" data-action="next-question"><span data-part="next-label">Question 1</span></button>
    </artifact-attempt>`;
  document.body.append(template.content);
  const where = document.querySelector("[data-part=where]");
  const resume = document.querySelector<HTMLButtonElement>("[data-action=resume]");
  const next = document.querySelector<HTMLButtonElement>("[data-action=next-question]");

  await vi.waitFor(() => {
    expect(where?.textContent).toBe("You stopped at question 2.");
  });
  resume?.click();
  expect(location.hash).toBe("#q-global-variable");
  expect(document.activeElement).toBe(rowOf("global-variable"));

  await store.answers.save("global-variable", 2, "right");
  await store.answers.save("local-variable", 3, "right");
  await vi.waitFor(() => {
    expect(next?.textContent).toBe("Next: Question 4");
  });
  next?.click();
  expect(location.hash).toBe("#q-new-object");
  expect(document.activeElement).toBe(rowOf("new-object"));
});

test("the explanation stays hidden while any item is open or saving, and shows once the last item locks, with focus left on the status", async () => {
  const { box, check, choose, explanation, status } = await loadedMatching(seededTransport());
  expect(explanation.hidden).toBe(true);
  choose("global-variable", 2);
  choose("local-variable", 4);
  choose("new-object", 4);
  check.focus();

  check.click();

  expect(box.dataset.status).toBe("saving");
  expect(explanation.hidden).toBe(true);
  await vi.waitFor(() => {
    expect(box.dataset.status).toBe("saved");
  });
  expect(explanation.hidden).toBe(false);
  expect(document.activeElement).toBe(status);
});

test("the explanation shows from the device copy as soon as the store starts, and from the server once it loads", async () => {
  openPage(neverChecked, [capital, ...itemQuestions], [everyItemAnswered]);
  expect(mountMatching().explanation.hidden).toBe(false);
  document.body.innerHTML = "";

  const { explanation } = await loadedMatching(seededTransport([everyItemAnswered]));

  expect(explanation.hidden).toBe(false);
});

test("Start over hides the explanation again", async () => {
  const { store, explanation } = await loadedMatching(seededTransport([everyItemAnswered]));
  expect(explanation.hidden).toBe(false);

  store.answers.startOver();

  expect(explanation.hidden).toBe(true);
});

test("an item added to an answered set hides the explanation until that item locks too", async () => {
  const answeredBefore = attemptWith([
    ["global-variable", 2, "right"],
    ["local-variable", 4, "wrong"],
  ]);
  const { check, choose, explanation, rowOf } = await loadedMatching(
    seededTransport([answeredBefore]),
  );
  expect(explanation.hidden).toBe(true);
  choose("new-object", 4);

  check.click();

  await vi.waitFor(() => {
    expect(rowOf("new-object").dataset.status).toBe("saved");
  });
  expect(explanation.hidden).toBe(false);
});

test("the explanation stays hidden while an item isn't saved, and shows once it is", async () => {
  const memory = seededTransport();
  let failing = true;
  const transport: Transport = {
    load: (id) => memory.load(id),
    save: (id, attemptId, given) =>
      failing && given.questionId === "local-variable"
        ? Promise.resolve({ outcome: "failed" })
        : memory.save(id, attemptId, given),
  };
  const { box, check, choose, explanation, recovery } = await loadedMatching(transport);
  choose("global-variable", 2);
  choose("local-variable", 3);
  choose("new-object", 4);

  check.click();

  await vi.waitFor(() => {
    expect(box.dataset.status).toBe("not-saved");
  });
  expect(explanation.hidden).toBe(true);
  failing = false;
  recovery.querySelector("button")?.click();
  await vi.waitFor(() => {
    expect(box.dataset.status).toBe("saved");
  });
  expect(explanation.hidden).toBe(false);
});
