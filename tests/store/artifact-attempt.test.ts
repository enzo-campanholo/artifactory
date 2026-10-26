// @vitest-environment happy-dom
import "@artifactory/design-system/artifact-attempt";
import type { SavedAttempt } from "@artifactory/design-system/saved-state";
import { afterEach, expect, test, vi } from "vitest";
import { isDisabled, mountMinimalQuestion } from "./minimal-question.ts";
import type { Store } from "@artifactory/design-system/state";
import { capital, checked, heldCheck, openPage, river, seededTransport } from "./seeded-page.ts";

function mountAttemptPage(store: Store) {
  const question = mountMinimalQuestion();
  const template = document.createElement("template");
  template.innerHTML = `
    <div class="question" id="q-river" data-question-id="river"></div>
    <artifact-attempt>
      <p data-part="where">2 questions.</p>
      <button type="button" data-action="resume"><span data-part="resume-label">Start with question 1</span></button>
      <p data-part="none-wrong">No question to revisit in this attempt.</p>
      <div data-part="wrong" hidden>
        <ul>
          <li data-wrong-for="capital" hidden></li>
          <li data-wrong-for="river" hidden></li>
        </ul>
      </div>
      <button type="button" data-action="start-over" disabled>Start over</button>
      <button type="button" data-action="next-question"><span data-part="next-label"><span class="artifact-visually-hidden">Next:</span> Question 1</span></button>
    </artifact-attempt>
    <h2 class="page-close-heading">To revisit</h2>`;
  document.body.append(template.content);
  const part = (selector: string) => {
    const found = document.querySelector<HTMLElement>(selector);
    if (found === null) throw new Error(`no ${selector}`);
    return found;
  };
  const button = (selector: string) => {
    const found = part(selector);
    if (!(found instanceof HTMLButtonElement)) throw new Error(`${selector} isn't a button`);
    return found;
  };
  return {
    ...question,
    store,
    where: part("[data-part=where]"),
    resume: button("[data-action=resume]"),
    startOver: button("[data-action=start-over]"),
    next: button("[data-action=next-question]"),
    river: part("#q-river"),
    noneWrong: part("[data-part=none-wrong]"),
    close: part(".page-close-heading"),
  };
}

async function openAttemptPage(attempts: SavedAttempt[] = []) {
  const store = openPage(seededTransport(attempts), [capital, river]);
  const page = mountAttemptPage(store);
  await checked(store);
  return page;
}

const answerCapital = ({ input, button }: { input: HTMLInputElement; button: HTMLElement }) => {
  input.value = "2";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  button.click();
};

const answer = (latestAnswers: SavedAttempt["answers"]): SavedAttempt => ({
  id: "latest",
  startedAt: "2020-10-01T10:00:00.000Z",
  answers: latestAnswers,
});

const capitalRight = {
  questionId: "capital",
  response: 2,
  mark: "right",
  answeredAt: "2020-10-01T10:00:00.000Z",
} as const;

afterEach(() => {
  document.body.innerHTML = "";
  history.replaceState(null, "", "/");
});

test("the stopping point's button names it and goes there, setting its address and focus, and goes to the end of the page once every question is answered", async () => {
  const page = await openAttemptPage([answer([capitalRight])]);

  expect(page.where.textContent).toBe("You stopped at question 2.");
  expect(page.resume.textContent).toBe("Go to question 2");
  page.resume.click();
  expect(location.hash).toBe("#q-river");
  expect(document.activeElement).toBe(page.river);

  await page.store.answers.save("river", 3, "wrong");

  expect(page.where.textContent).toBe("Every question answered.");
  expect(page.resume.textContent).toBe("See what to revisit");
  page.resume.click();
  expect(document.activeElement).toBe(page.close);
});

test("Start over reopens the questions and the position, goes to question 1, and stays disabled until there's an answer", async () => {
  const page = await openAttemptPage([answer([capitalRight])]);
  expect(page.startOver.disabled).toBe(false);
  page.startOver.focus();

  page.startOver.click();

  expect(page.question.dataset.mark).toBeUndefined();
  expect(isDisabled(page.input)).toBe(false);
  expect(page.where.textContent).toBe("2 questions.");
  expect(page.startOver.disabled).toBe(true);
  expect(location.hash).toBe("#q-capital");
  expect(document.activeElement).toBe(page.question);
});

test("with every question right, the stopping point's button and Next question go to the end of the page, saying so", async () => {
  const page = await openAttemptPage([
    answer([capitalRight, { ...capitalRight, questionId: "river", response: 1 }]),
  ]);

  expect(page.where.textContent).toBe("Every question answered.");
  expect(page.resume.textContent).toBe("Go to the end of the page");
  expect(page.next.textContent).toBe("Next: End of the page");
  expect(page.noneWrong.hidden).toBe(false);
  page.next.click();
  expect(document.activeElement).toBe(page.close);
});

test.each(["load fails", "signed out"] as const)(
  "the position and its buttons show the answers this device last showed, and stay so when the first load comes back %s",
  async (outcome) => {
    const copied = [answer([capitalRight])];
    const transport = seededTransport(copied);
    transport.forced.add(outcome);
    const store = openPage(transport, [capital, river], copied);

    const page = mountAttemptPage(store);

    const shown = () => ({
      where: page.where.textContent,
      resume: page.resume.textContent,
      next: page.next.textContent,
      disabled: [page.resume, page.startOver, page.next].map(({ disabled }) => disabled),
    });
    const fromCopy = {
      where: "You stopped at question 2.",
      resume: "Go to question 2",
      next: "Next: Question 2",
      disabled: [false, false, false],
    };
    expect(shown()).toEqual(fromCopy);
    await vi.waitFor(() => {
      expect(store.answers.notices.loadFailed || store.answers.notices.signedOut).toBe(true);
    });
    expect(shown()).toEqual(fromCopy);
  },
);

test("with no answers on the device, the page reads as a first visit until the first load shows the server's", async () => {
  const { held, release } = heldCheck(seededTransport([answer([capitalRight])]));
  const store = openPage(held, [capital, river]);
  const page = mountAttemptPage(store);
  expect(page.where.textContent).toBe("2 questions.");
  expect(page.resume.textContent).toBe("Start with question 1");
  expect(page.startOver.disabled).toBe(true);

  release();
  await checked(store);

  expect(page.where.textContent).toBe("You stopped at question 2.");
  expect(page.startOver.disabled).toBe(false);
  expect(store.answers.notices.attemptSwitched).toBe(false);
});

test("Next question names the unanswered question it goes to, setting its address and focus, and the end of the page once every question is answered", async () => {
  const page = await openAttemptPage();
  expect(page.next.textContent).toBe("Next: Question 1");
  answerCapital(page);
  await vi.waitFor(() => {
    expect(page.next.textContent).toBe("Next: Question 2");
  });

  page.next.click();

  expect(location.hash).toBe("#q-river");
  expect(document.activeElement).toBe(page.river);

  await page.store.answers.save("river", 3, "wrong");
  expect(page.next.textContent).toBe("Next: To revisit");

  page.next.click();

  expect(document.activeElement).toBe(page.close);
});
