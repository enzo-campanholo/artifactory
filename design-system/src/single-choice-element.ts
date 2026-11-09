import { QuestionElement } from "./question-element.ts";
import type { Json } from "./scoring.ts";

const labels = {
  en: { chooseFirst: "Choose an option first.", rightAnswer: "Right answer" },
  pt: { chooseFirst: "Escolha uma opção primeiro.", rightAnswer: "Resposta certa" },
};

class SingleChoice extends QuestionElement {
  constructor() {
    super();
    // The browser's own message follows the browser's language, not the page's.
    this.addEventListener(
      "invalid",
      (event) => {
        if (event.target instanceof HTMLInputElement)
          event.target.setCustomValidity(this.inPageLanguage(labels).chooseFirst);
      },
      { capture: true },
    );
    this.addEventListener("input", () => {
      for (const option of this.querySelectorAll("input")) option.setCustomValidity("");
    });
  }

  override attributeChangedCallback() {
    super.attributeChangedCallback();
    this.#showRightAnswer();
  }

  // Only once a wrong answer is locked, so nothing singles out the right option before.
  #showRightAnswer() {
    const shown = this.wrongAnswerLocked;
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
      description.textContent = this.inPageLanguage(labels).rightAnswer;
      option.append(description);
    }
  }

  readResponse(): Json | undefined {
    const chosen = this.querySelector<HTMLInputElement>("input:checked");
    return chosen === null ? undefined : Number(chosen.value);
  }

  showResponse(response: Json): void {
    for (const option of this.querySelectorAll("input")) {
      option.checked = option.value === JSON.stringify(response);
    }
  }
}

customElements.define("artifact-single-choice", SingleChoice);
