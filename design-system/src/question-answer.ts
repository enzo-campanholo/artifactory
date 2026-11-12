import type { NumberedQuestion } from "./question-markers.ts";
import { check, type Json, type Mark } from "./scoring.ts";
import type { PageAnswer, Store } from "./state.ts";

export interface QuestionResponse {
  readResponse(): Json | undefined;
  showResponse(response: Json): void;
}

// A choice among numbered options, as a single choice's options and a matching item's letters
// are: the response is the chosen option's number.
export function chosenOption(within: Element): QuestionResponse {
  return {
    readResponse() {
      const chosen = within.querySelector<HTMLInputElement>("input:checked");
      return chosen === null ? undefined : Number(chosen.value);
    },
    showResponse(response) {
      for (const option of within.querySelectorAll("input")) {
        option.checked = option.value === JSON.stringify(response);
      }
    },
  };
}

export interface ShownAnswer {
  number: number;
  status: PageAnswer["status"];
  mark: Mark | "ownRight" | "ownWrong";
  restored: boolean;
}

export function locksAnswer(status: PageAnswer["status"] | undefined): boolean {
  return status === "saved" || status === "answered-elsewhere";
}

// Only once a wrong answer is locked, so nothing singles out the right answer before.
export function rightAnswerShown(answer: ShownAnswer | undefined): boolean {
  return locksAnswer(answer?.status) && answer?.mark === "wrong";
}

function ownMark(submitter: HTMLElement | null): Mark | undefined {
  const value = submitter?.getAttribute("value");
  return value === "right" || value === "wrong" ? value : undefined;
}

// One question's answer on the page, kept on the element that carries the question's markers: the
// question box itself when it holds one question, or that question's part of a box holding several.
export class QuestionAnswer {
  readonly #element: HTMLElement;
  readonly #response: QuestionResponse;

  constructor(element: HTMLElement, response: QuestionResponse) {
    this.#element = element;
    this.#response = response;
  }

  get showsAnswer(): boolean {
    return this.#element.dataset.status !== undefined;
  }

  readResponse(): Json | undefined {
    return this.#response.readResponse();
  }

  unanswered(store: Store): boolean {
    return store.answers.get(this.#question(store).id) === undefined;
  }

  save(store: Store, submitter: HTMLElement | null) {
    const question = this.#question(store);
    if (store.answers.get(question.id) !== undefined) return;
    const response = this.readResponse();
    if (response === undefined) return;
    const mark =
      question.key === undefined
        ? ownMark(submitter)
        : check(question.kind, response, question.key);
    if (mark === undefined) return;
    void store.answers.save(question.id, response, mark);
  }

  show(store: Store): ShownAnswer | undefined {
    const question = this.#question(store);
    const answer = store.answers.get(question.id);
    if (answer === undefined) return undefined;
    // An answer given on this page shows saving first. One that arrives saved was restored, from
    // the device or a load, and a page of them would otherwise all be read out at once.
    const restored = !this.showsAnswer && answer.status === "saved";
    this.#response.showResponse(answer.response);
    for (const fieldset of this.#element.querySelectorAll("fieldset")) fieldset.disabled = true;
    const { mark } = answer;
    this.#element.dataset.mark = mark;
    this.#element.dataset.status = answer.status;
    return {
      number: question.number,
      status: answer.status,
      mark: question.key === undefined ? (mark === "right" ? "ownRight" : "ownWrong") : mark,
      restored,
    };
  }

  // The box resets its form first, which clears every response it holds.
  reopen() {
    for (const fieldset of this.#element.querySelectorAll("fieldset")) fieldset.disabled = false;
    for (const details of this.#element.querySelectorAll("details")) details.open = false;
    delete this.#element.dataset.mark;
    delete this.#element.dataset.status;
  }

  #question(store: Store): NumberedQuestion {
    const question = store.answers.questions.find(
      ({ id }) => id === this.#element.dataset.questionId,
    );
    if (question === undefined)
      throw new Error(`${this.#element.localName} isn't one of the page's questions`);
    return question;
  }
}
