export class StepRow {
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

  // The row goes to the first step, or to none when there are no steps, and has its host show it.
  setCount(count: number) {
    this.#count = count;
    this.#step = Math.min(1, count);
    this.#refuseEnds();
    if (this.#step > 0) this.#show(this.#step);
  }

  #go(by: number) {
    const step = Math.min(Math.max(this.#step + by, 1), this.#count);
    if (this.#count === 0 || step === this.#step) return;
    this.#step = step;
    this.#refuseEnds();
    this.#show(step);
  }

  #refuseEnds() {
    this.#back.setAttribute("aria-disabled", String(this.#step <= 1));
    this.#forward.setAttribute("aria-disabled", String(this.#step === this.#count));
  }
}
