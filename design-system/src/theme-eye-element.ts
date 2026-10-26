import { animateEye, type EyeMotion } from "./eye-motion.ts";
import { watchThemeChoice, type Theme, type ThemeWatch } from "./theme-choice.ts";

class ThemeEye extends HTMLElement {
  #watch: ThemeWatch | undefined;
  #motion: EyeMotion | undefined;

  connectedCallback() {
    const button = this.querySelector("button");
    const drawing = this.querySelector<SVGSVGElement>(".theme-eye-drawing");
    if (button === null || drawing === null) throw new Error("The theme eye has no drawing");
    button.addEventListener("click", this.#press);
    this.#watch = watchThemeChoice((shown: Theme) => {
      button.setAttribute("aria-pressed", String(shown === "dark"));
      if (this.#motion !== undefined) this.#motion.rest(shown === "dark");
      else {
        this.#motion = animateEye(drawing, button, shown === "dark");
        this.dataset.live = "";
      }
    });
  }

  disconnectedCallback() {
    this.querySelector("button")?.removeEventListener("click", this.#press);
    this.#watch?.stop();
    this.#watch = undefined;
    this.#motion?.stop();
    this.#motion = undefined;
  }

  readonly #press = () => {
    this.#watch?.press();
  };
}

customElements.define("theme-eye", ThemeEye);
