import { shortDate } from "./dates.ts";
import { whenStoreStarts, type PageAttempt, type Store } from "./state.ts";

const newestShown = 5;

const labels = {
  en: { shown: "this attempt", finished: "finished", unfinished: "not finished" },
  pt: { shown: "esta tentativa", finished: "concluída", unfinished: "não concluída" },
};

class AttemptsPanel extends HTMLElement {
  #store: Store | undefined;
  #showingAll = false;

  constructor() {
    super();
    this.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest(".attempts-show-all") === null || this.#store === undefined) return;
      this.#showingAll = true;
      this.#show(this.#store);
      const firstRevealed = this.querySelectorAll<HTMLElement>(".attempts-list > li")[newestShown];
      if (firstRevealed === undefined) return;
      firstRevealed.tabIndex = -1;
      firstRevealed.focus();
    });
  }

  connectedCallback() {
    whenStoreStarts((store) => {
      if (this.#store !== undefined) return;
      this.#store = store;
      store.answers.subscribe(() => {
        this.#show(store);
      });
      this.#show(store);
    });
  }

  #show(store: Store) {
    const attempts = store.answers.attempts.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    this.#part(".attempts-none").hidden = attempts.length > 0;
    this.#part(".attempts-list").replaceChildren(
      ...attempts.map((attempt, index) => {
        const row = this.#row(attempt);
        row.hidden = !this.#showingAll && index >= newestShown;
        return row;
      }),
    );
    this.#part(".attempts-show-all").hidden = this.#showingAll || attempts.length <= newestShown;
  }

  #row(attempt: PageAttempt): HTMLLIElement {
    const lang = this.#lang();
    const text = lang.startsWith("pt") ? labels.pt : labels.en;
    const date = document.createElement("time");
    date.dateTime = attempt.startedAt;
    date.textContent = shortDate(new Date(attempt.startedAt), lang, { withTime: true });
    const state = document.createElement("span");
    state.textContent = attempt.shown
      ? text.shown
      : attempt.finished
        ? text.finished
        : text.unfinished;
    const row = document.createElement("li");
    row.toggleAttribute("data-shown", attempt.shown);
    row.append(date, state);
    return row;
  }

  #lang(): string {
    return this.closest("[lang]")?.getAttribute("lang") ?? "en";
  }

  #part(selector: string): HTMLElement {
    const part = this.querySelector<HTMLElement>(selector);
    if (part === null) throw new Error(`${this.localName} has no ${selector}`);
    return part;
  }
}

customElements.define("artifact-attempts-panel", AttemptsPanel);
