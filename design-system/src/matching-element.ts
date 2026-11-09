import { inPageLanguage } from "./page-language.ts";
import {
  chosenOption,
  locksAnswer,
  QuestionAnswer,
  rightAnswerShown,
  type ShownAnswer,
} from "./question-answer.ts";
import { QuestionBox } from "./question-element.ts";
import type { PageAnswer } from "./state.ts";

const labels = {
  en: { right: "Right", wrong: "Wrong", rightAnswer: "Right answer" },
  pt: { right: "Correta", wrong: "Incorreta", rightAnswer: "Resposta certa" },
};

const letters = "abcdefghijklmnopqrstuvwxyz";

function locked(shown: ShownAnswer | undefined): shown is ShownAnswer {
  return locksAnswer(shown?.status);
}

class Matching extends QuestionBox {
  #rows: HTMLElement[] | undefined;
  #answers: QuestionAnswer[] | undefined;

  get #itemRows(): HTMLElement[] {
    this.#rows ??= [...this.querySelectorAll<HTMLElement>("[data-question-id]")];
    return this.#rows;
  }

  // Each item's row carries its question's markers and its own row of letter choices.
  protected get answers(): readonly QuestionAnswer[] {
    this.#answers ??= this.#itemRows.map((row) => new QuestionAnswer(row, chosenOption(row)));
    return this.#answers;
  }

  // Each item's row carries its own status; the box carries the set's. A row's mark shows only
  // once its answer is locked, so nothing singles out the right letter before. Restored marks
  // aren't read out, as a restored status isn't. The explanation is the set's, so it waits for
  // every item to lock.
  protected answersShown(
    shown: readonly (ShownAnswer | undefined)[],
    boxStatus: PageAnswer["status"] | undefined,
  ): void {
    if (boxStatus === undefined) delete this.dataset.status;
    else this.dataset.status = boxStatus;
    this.showExplanation(shown.every(locked));
    const text = inPageLanguage(this, labels);
    this.#itemRows.forEach((row, index) => {
      const answer = shown[index];
      const rightChoice = row.dataset.questionKey;
      const rightShown = rightAnswerShown(answer);
      for (const choice of row.querySelectorAll("input")) {
        choice
          .closest("label")
          ?.toggleAttribute("data-right-answer", rightShown && choice.value === rightChoice);
      }
      const mark = row.querySelector(".matching-item-mark");
      if (mark === null) return;
      if (!locked(answer)) {
        mark.removeAttribute("aria-live");
        mark.textContent = "";
        return;
      }
      if (answer.restored) mark.setAttribute("aria-live", "off");
      const name = row.getAttribute("aria-label") ?? "";
      const letter = letters[Number(rightChoice) - 1] ?? "";
      mark.textContent =
        answer.mark === "right"
          ? `${name}: ${text.right}`
          : `${name}: ${text.wrong} · ${text.rightAnswer}: ${letter})`;
    });
  }
}

customElements.define("artifact-matching", Matching);
