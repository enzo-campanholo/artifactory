import { inPageLanguage } from "./page-language.ts";
import { StepRow } from "./step-row.ts";
import { lineRuns } from "./stepper.ts";

const texts = {
  en: {
    step: (step: number, count: number) => `Step ${String(step)} of ${String(count)}.`,
    lines: { one: "Line", many: "Lines", to: "to", and: "and" },
  },
  pt: {
    step: (step: number, count: number) => `Passo ${String(step)} de ${String(count)}.`,
    lines: { one: "Linha", many: "Linhas", to: "a", and: "e" },
  },
};

function saidLines(lines: number[], words: (typeof texts)["en"]["lines"]): string {
  const runs = lineRuns(lines).map(({ from, to }) =>
    from === to ? String(from) : `${String(from)} ${words.to} ${String(to)}`,
  );
  const last = runs.pop() ?? "";
  const list = runs.length === 0 ? last : `${runs.join(", ")} ${words.and} ${last}`;
  return `${lines.length === 1 ? words.one : words.many} ${list}.`;
}

class ArtifactStepper extends HTMLElement {
  #shown = false;

  connectedCallback() {
    new StepRow(this, (step) => {
      this.#show(step);
    }).setCount(this.#count);
  }

  get #count(): number {
    return Number(this.dataset.count);
  }

  get #texts() {
    return inPageLanguage(this, texts);
  }

  #part(selector: string): HTMLElement {
    const part = this.querySelector<HTMLElement>(selector);
    if (part === null) throw new Error(`artifact-stepper has no ${selector}`);
    return part;
  }

  // The first step shows as the page opens, unannounced and with no transition.
  #show(step: number) {
    const stepped = this.#shown;
    this.#shown = true;
    if (stepped) this.dataset.stepped = "";
    const number = String(step);
    for (const part of this.querySelectorAll<HTMLElement | SVGElement>("[data-in-steps]")) {
      const steps = (part.dataset.inSteps ?? "").split(" ");
      part.toggleAttribute("data-off", !steps.includes(number));
    }
    this.#part(".stepper-current").textContent = number;
    const lines = this.querySelector(".stepper-lines");
    if (lines !== null) {
      const block = this.querySelector(
        ".stepper-code pre, .stepper-blocks > :not([data-off]) > pre",
      );
      const lit = block?.matches("[data-marks]")
        ? [...block.querySelectorAll<HTMLElement>(".line:not([data-off])")].map((line) =>
            Number(line.dataset.line),
          )
        : [];
      lines.textContent = lit.length > 0 ? saidLines(lit, this.#texts.lines) : "";
    }
    if (!stepped) return;
    this.#part(".stepper-announcement").textContent = [
      this.#texts.step(step, this.#count),
      this.querySelector(".stepper-lines")?.textContent,
      this.querySelector(".stepper-captions > :not([data-off])")?.textContent,
    ]
      .filter(Boolean)
      .join(" ");
  }
}

customElements.define("artifact-stepper", ArtifactStepper);
