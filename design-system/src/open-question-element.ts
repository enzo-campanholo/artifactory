import type { Json } from "./scoring.ts";
import { TextQuestionElement } from "./text-question-element.ts";

class OpenQuestion extends TextQuestionElement {
  #revealedByOwner = false;

  constructor() {
    super();
    this.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const summary = event.target.closest("summary");
      if (summary === null) return;
      if (summary.getAttribute("aria-disabled") === "true") event.preventDefault();
      else this.#revealedByOwner = true;
    });
    this.addEventListener(
      "toggle",
      (event) => {
        if (!(event.target instanceof HTMLDetailsElement) || !event.target.open) return;
        this.textField().readOnly = true;
        // The summary hides once open, so focus moves on to the answer it revealed.
        if (!this.#revealedByOwner) return;
        this.#revealedByOwner = false;
        event.target.querySelector<HTMLElement>(".question-model-answer-body")?.focus();
      },
      { capture: true },
    );
  }

  override showResponse(response: Json): void {
    super.showResponse(response);
    this.textField().readOnly = true;
    const modelAnswer = this.querySelector("details");
    if (modelAnswer !== null) modelAnswer.open = true;
  }

  protected override responseChanged(hasResponse: boolean): void {
    if (!hasResponse) this.textField().readOnly = false;
    this.querySelector("summary")?.setAttribute("aria-disabled", String(!hasResponse));
  }
}

customElements.define("artifact-open-question", OpenQuestion);
