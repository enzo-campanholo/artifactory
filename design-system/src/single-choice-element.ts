import { inPageLanguage } from "./page-language.ts";
import { chosenOption, rightAnswerShown, type ShownAnswer } from "./question-answer.ts";
import { QuestionElement } from "./question-element.ts";
import type { Json } from "./scoring.ts";

const labels = {
  en: { chooseFirst: "Choose an option first.", rightAnswer: "Right answer" },
  pt: { chooseFirst: "Escolha uma opção primeiro.", rightAnswer: "Resposta certa" },
};

class SingleChoice extends QuestionElement {
  readonly #options = chosenOption(this);

  constructor() {
    super();
    // The browser's own message follows the browser's language, not the page's.
    this.addEventListener(
      "invalid",
      (event) => {
        if (event.target instanceof HTMLInputElement)
          event.target.setCustomValidity(inPageLanguage(this, labels).chooseFirst);
      },
      { capture: true },
    );
    this.addEventListener("input", () => {
      for (const option of this.querySelectorAll("input")) option.setCustomValidity("");
    });
  }

  protected override answersShown(shown: readonly (ShownAnswer | undefined)[]): void {
    super.answersShown(shown);
    this.#showRightAnswer(rightAnswerShown(shown[0]));
  }

  #showRightAnswer(shown: boolean) {
    const descriptionId = `${this.id}--right-answer`;
    this.querySelector(`#${descriptionId}`)?.remove();
    for (const option of this.querySelectorAll("li")) {
      const radio = option.querySelector("input");
      const right = shown && radio?.value === this.dataset.questionKey;
      option.toggleAttribute("data-right-answer", right);
      if (!right) {
        radio?.removeAttribute("aria-describedby");
        continue;
      }
      radio?.setAttribute("aria-describedby", descriptionId);
      const description = document.createElement("span");
      description.id = descriptionId;
      description.hidden = true;
      description.textContent = inPageLanguage(this, labels).rightAnswer;
      option.append(description);
    }
  }

  readResponse(): Json | undefined {
    return this.#options.readResponse();
  }

  showResponse(response: Json): void {
    this.#options.showResponse(response);
  }
}

customElements.define("artifact-single-choice", SingleChoice);
