import { QuestionElement } from "@artifactory/design-system/question-element";
import type { Json } from "@artifactory/design-system/scoring";

class MinimalQuestion extends QuestionElement {
  readResponse(): Json | undefined {
    const { value } = this.#input();
    return value === "" ? undefined : Number(value);
  }

  showResponse(response: Json): void {
    this.#input().value = JSON.stringify(response);
  }

  #input(): HTMLInputElement {
    const input = this.querySelector("input");
    if (input === null) throw new Error("minimal-question has no input");
    return input;
  }
}
customElements.define("minimal-question", MinimalQuestion);

export function mountMinimalQuestion() {
  const template = document.createElement("template");
  template.innerHTML = `
    <minimal-question id="q-capital" data-question-id="capital">
      <form>
        <fieldset>
          <input name="response">
          <button type="submit">Check</button>
        </fieldset>
        <p class="question-status" tabindex="-1"></p>
        <div class="question-recovery" hidden></div>
      </form>
    </minimal-question>`;
  document.body.replaceChildren(template.content);
  const question = document.querySelector<HTMLElement>("minimal-question");
  const input = document.querySelector("input");
  const button = document.querySelector("button");
  const status = document.querySelector(".question-status");
  const recovery = document.querySelector<HTMLElement>(".question-recovery");
  if (
    question === null ||
    input === null ||
    button === null ||
    status === null ||
    recovery === null
  ) {
    throw new Error("not mounted");
  }
  return { question, input, button, status, recovery };
}

// happy-dom's `:disabled` ignores a disabled ancestor fieldset, which browsers apply.
export function isDisabled(control: Element): boolean {
  return control.matches(":disabled") || control.closest("fieldset:disabled") !== null;
}
