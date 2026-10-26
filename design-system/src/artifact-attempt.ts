import { attemptLabels, type AttemptLabels } from "./attempt-labels.ts";
import { goTo } from "./go-to.ts";
import { questionAnchor, questionElement, type NumberedQuestion } from "./question-markers.ts";
import { whenStoreStarts, type Store } from "./state.ts";

function closeHeading(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".page-close-heading");
}

let lastQuestionGoneTo: string | undefined;

function inView(element: HTMLElement): boolean {
  const { top, bottom } = element.getBoundingClientRect();
  return bottom > 0 && top < innerHeight;
}

// The reading position is the last question whose top has reached the line a question sits at
// once gone to, or the question last gone to while it's still in view.
function readingIndex(questions: NumberedQuestion[]): number {
  const line = parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart) || 0;
  const reached = questions.findLastIndex(
    ({ id }) => questionElement(id).getBoundingClientRect().top <= line + 2,
  );
  const goneTo =
    lastQuestionGoneTo !== undefined && inView(questionElement(lastQuestionGoneTo))
      ? questions.findIndex(({ id }) => id === lastQuestionGoneTo)
      : -1;
  return Math.max(reached, goneTo);
}

function nextFromReading(store: Store): NumberedQuestion | undefined {
  const { questions } = store.answers;
  const unanswered = ({ id }: NumberedQuestion) => store.answers.get(id) === undefined;
  return (
    questions.slice(readingIndex(questions) + 1).find(unanswered) ?? questions.find(unanswered)
  );
}

function goToQuestionOrClose(question: NumberedQuestion | undefined) {
  if (question !== undefined) {
    lastQuestionGoneTo = question.id;
    goTo(questionElement(question.id), `#${questionAnchor(question.id)}`);
    return;
  }
  const close = closeHeading();
  if (close !== null) goTo(close);
}

class ArtifactAttempt extends HTMLElement {
  #store: Store | undefined;

  constructor() {
    super();
    this.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const action = event.target.closest<HTMLElement>("[data-action]")?.dataset.action;
      const store = this.#store;
      if (store === undefined) return;
      if (action === "start-over") store.answers.startOver();
      if (action !== "resume" && action !== "next-question" && action !== "start-over") return;
      // Closing the contents sheet first keeps focus on the target, not back on the bar.
      this.closest("dialog")?.close();
      goToQuestionOrClose(
        action === "next-question"
          ? nextFromReading(store)
          : store.answers.shownAttempt.stoppingPoint,
      );
    });
  }

  connectedCallback() {
    whenStoreStarts((store) => {
      if (this.#store !== undefined) return;
      this.#store = store;
      store.answers.subscribe(() => {
        this.#show(store);
      });
      this.#show(store);
      if (this.querySelector("[data-action=next-question]") === null) return;
      let frame = 0;
      addEventListener(
        "scroll",
        () => {
          frame ||= requestAnimationFrame(() => {
            frame = 0;
            this.#showNext(store);
          });
        },
        { passive: true },
      );
    });
  }

  #labels(): AttemptLabels {
    const lang = this.closest("[lang]")?.getAttribute("lang") ?? "en";
    return lang.startsWith("pt") ? attemptLabels.pt : attemptLabels.en;
  }

  #show(store: Store) {
    const text = this.#labels();
    const { progress, toRevisit, stoppingPoint } = store.answers.shownAttempt;
    const { answered } = progress;
    const stoppedNumber = stoppingPoint?.number;

    for (const part of this.querySelectorAll("[data-part=where]")) {
      part.textContent =
        stoppedNumber === undefined
          ? text.allAnswered
          : answered === 0
            ? text.questions(progress.total)
            : text.stoppedAt(stoppedNumber);
    }
    for (const part of this.querySelectorAll("[data-part=resume-label]")) {
      part.textContent =
        stoppedNumber === undefined
          ? toRevisit.length === 0
            ? text.toEnd
            : text.toRevisit
          : answered === 0
            ? text.startAt(stoppedNumber)
            : text.goTo(stoppedNumber);
    }
    for (const button of this.querySelectorAll<HTMLButtonElement>("[data-action=start-over]")) {
      button.disabled = answered === 0;
    }

    const wrong = new Set(toRevisit.map(({ id }) => id));
    for (const item of this.querySelectorAll<HTMLElement>("[data-wrong-for]")) {
      item.hidden = !wrong.has(item.dataset.wrongFor ?? "");
    }
    for (const part of this.querySelectorAll<HTMLElement>("[data-part=wrong]")) {
      part.hidden = wrong.size === 0;
    }
    for (const part of this.querySelectorAll<HTMLElement>("[data-part=none-wrong]")) {
      part.hidden = wrong.size > 0;
    }
    this.#showNext(store);
  }

  #showNext(store: Store) {
    const text = this.#labels();
    const next = nextFromReading(store);
    const destination =
      next !== undefined
        ? text.question(next.number)
        : store.answers.shownAttempt.toRevisit.length === 0
          ? text.end
          : text.revisit;
    for (const button of this.querySelectorAll<HTMLButtonElement>("[data-action=next-question]")) {
      const label = button.querySelector("[data-part=next-label]");
      if (label === null) continue;
      const hidden = document.createElement("span");
      hidden.className = "artifact-visually-hidden";
      hidden.textContent = text.next;
      label.replaceChildren(hidden, ` ${destination}`);
    }
  }
}

customElements.define("artifact-attempt", ArtifactAttempt);
