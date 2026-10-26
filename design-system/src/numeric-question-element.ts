import { parseNumber, type NumericKey } from "./scoring.ts";
import { TextQuestionElement } from "./text-question-element.ts";

const superscripts: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "-": "⁻",
};

// The key already passed `numericKeyProblem`, so this only resets its text in the page's convention.
function inConvention(written: string, separator: string): string {
  const [mantissa = "", exponent] = written.trim().split(/[eE]/);
  const number = mantissa.replace(/^\+/, "").replace(/^-/, "−").replace(".", separator);
  if (exponent === undefined) return number;
  const power = exponent.replace(/^\+/, "").replace(/^(-?)0+(?=\d)/, "$1");
  return `${number} × 10${power.replace(/[\d-]/g, (digit) => superscripts[digit] ?? digit)}`;
}

function rightAnswer(key: NumericKey, unit: string, separator: string): string {
  const value = inConvention(key.value, separator);
  const inUnit = unit === "" ? "" : ` ${unit}`;
  const { tolerance = 0, relativeTolerance = 0 } = key;
  if (tolerance > 0) return `${value} ± ${inConvention(String(tolerance), separator)}${inUnit}`;
  if (relativeTolerance > 0) {
    // `0.075 * 100` is 7.499999999999999 in doubles.
    const percent = String(Number((relativeTolerance * 100).toPrecision(12)));
    return `${value}${inUnit} ± ${inConvention(percent, separator)} %`;
  }
  return `${value}${inUnit}`;
}

// Read as thousands, `2,500` drops its separator; read as a decimal, a fourth digit makes it plain.
function readings(ambiguous: string) {
  return {
    thousands: ambiguous.replace(/[.,](?=\d{3})/, ""),
    decimal: ambiguous.replace(/[.,]\d{3}/, (decimals) => `${decimals}0`),
  };
}

const labels = {
  en: {
    separator: ".",
    rightAnswer: "Right answer:",
    empty: "Write a number first.",
    notANumber: "Write one number, like 2.5, −3/4 or 6.02e23.",
    ambiguous: (typed: string) => {
      const { thousands, decimal } = readings(typed);
      return `${typed} could be thousands or a decimal: write ${thousands} or ${decimal}.`;
    },
  },
  pt: {
    separator: ",",
    rightAnswer: "Resposta certa:",
    empty: "Escreva um número primeiro.",
    notANumber: "Escreva um número, como 2,5; −3/4 ou 6,02e23.",
    ambiguous: (typed: string) => {
      const { thousands, decimal } = readings(typed);
      return `${typed} pode ser milhar ou decimal: escreva ${thousands} ou ${decimal}.`;
    },
  },
};

class NumericQuestion extends TextQuestionElement {
  static observedAttributes = ["data-status", "data-mark"];

  constructor() {
    super();
    // The browser's own messages follow the browser's language, not the page's.
    this.addEventListener(
      "invalid",
      (event) => {
        if (event.target instanceof HTMLInputElement && event.target.value === "")
          event.target.setCustomValidity(this.inPageLanguage(labels).empty);
      },
      { capture: true },
    );
    // Before the shared element's own submit listener, so a refused input never reaches the store.
    this.addEventListener(
      "submit",
      (event) => {
        const field = this.textField();
        const typed = field.value.trim();
        const parsed = parseNumber(typed);
        if ("number" in parsed) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const text = this.inPageLanguage(labels);
        field.setCustomValidity(
          parsed.refused === "ambiguous" ? text.ambiguous(typed) : text.notANumber,
        );
        field.reportValidity();
      },
      { capture: true },
    );
    this.addEventListener("input", () => {
      this.textField().setCustomValidity("");
    });
  }

  attributeChangedCallback() {
    this.#showRightAnswer();
  }

  #showRightAnswer() {
    const lineId = `${this.id}--right-answer`;
    this.querySelector(`#${lineId}`)?.remove();
    const field = this.textField();
    const unit = this.querySelector(".numeric-question-unit");
    const described = unit === null ? [] : [unit.id];
    if (this.wrongAnswerLocked && this.dataset.questionKey !== undefined) {
      const key = JSON.parse(this.dataset.questionKey) as NumericKey;
      const text = this.inPageLanguage(labels);
      const line = document.createElement("p");
      line.id = lineId;
      line.className = "numeric-question-right-answer";
      const label = document.createElement("span");
      label.className = "numeric-question-right-answer-label";
      label.textContent = text.rightAnswer;
      const value = document.createElement("span");
      value.className = "numeric-question-right-answer-value";
      value.textContent = rightAnswer(key, unit?.textContent.trim() ?? "", text.separator);
      line.append(label, " ", value);
      (field.closest(".numeric-question-answer") ?? field).after(line);
      described.push(lineId);
    }
    if (described.length === 0) field.removeAttribute("aria-describedby");
    else field.setAttribute("aria-describedby", described.join(" "));
  }
}

customElements.define("artifact-numeric", NumericQuestion);
