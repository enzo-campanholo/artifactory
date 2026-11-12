import { inPageLanguage } from "./page-language.ts";

const stepOfCount = {
  en: (step: number, count: number) => `Step ${String(step)} of ${String(count)}.`,
  pt: (step: number, count: number) => `Passo ${String(step)} de ${String(count)}.`,
};

// A host tells its row how many steps there are and shows the step the row gives it. The row says
// that step and the count on the host, as `data-current-step` and `data-count`, so a reader such as
// `pnpm look` follows a Stage and a Stepper alike; with no steps, it says neither.
export class StepRow {
  readonly #host: HTMLElement;
  readonly #back: HTMLButtonElement;
  readonly #forward: HTMLButtonElement;
  readonly #show: (step: number) => void;
  #count = 0;
  #step = 0;

  constructor(host: HTMLElement, show: (step: number) => void) {
    const [back, forward] = host.querySelectorAll<HTMLButtonElement>(".step-controls > button");
    if (back === undefined || forward === undefined) {
      throw new Error(`${host.localName} has no step row`);
    }
    this.#host = host;
    this.#back = back;
    this.#forward = forward;
    this.#show = show;
    back.addEventListener("click", () => {
      this.#go(-1);
    });
    forward.addEventListener("click", () => {
      this.#go(1);
    });
    // The arrow keys step from any of the host's buttons, a Stage's Start included.
    host.addEventListener("keydown", (event) => {
      if (!(event.target instanceof HTMLButtonElement)) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      this.#go(event.key === "ArrowLeft" ? -1 : 1);
    });
    // The buttons render disabled, so they never look usable before the element can step.
    for (const button of [back, forward]) button.removeAttribute("disabled");
    this.#refuseEnds();
  }

  showFirstOf(count: number) {
    this.#count = count;
    this.#step = Math.min(1, count);
    this.#refuseEnds();
    if (this.#step > 0) this.#showStep();
    else {
      this.#host.removeAttribute("data-current-step");
      this.#host.removeAttribute("data-count");
    }
  }

  said(step: number): string {
    return inPageLanguage(this.#host, stepOfCount)(step, this.#count);
  }

  #go(by: number) {
    const step = Math.min(Math.max(this.#step + by, 1), this.#count);
    if (this.#count === 0 || step === this.#step) return;
    this.#step = step;
    this.#refuseEnds();
    this.#showStep();
  }

  #showStep() {
    this.#show(this.#step);
    this.#host.setAttribute("data-current-step", String(this.#step));
    this.#host.setAttribute("data-count", String(this.#count));
  }

  #refuseEnds() {
    this.#back.setAttribute("aria-disabled", String(this.#step <= 1));
    this.#forward.setAttribute("aria-disabled", String(this.#step === this.#count));
  }
}
