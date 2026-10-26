import { QuestionElement } from "./question-element.ts";
import type { Json } from "./scoring.ts";

export abstract class TextQuestionElement extends QuestionElement {
  readResponse(): Json | undefined {
    const text = this.textField().value.trim();
    return text === "" ? undefined : text;
  }

  showResponse(response: Json): void {
    this.textField().value = typeof response === "string" ? response : JSON.stringify(response);
  }

  protected textField(): HTMLInputElement | HTMLTextAreaElement {
    const field = this.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
    if (field === null) throw new Error(`${this.localName} has no text field`);
    return field;
  }
}
