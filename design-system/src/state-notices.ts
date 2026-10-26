import { goTo } from "./go-to.ts";
import { whenLibraryStatusesStart } from "./library-statuses.ts";
import { questionAnchor } from "./question-markers.ts";
import { whenStoreStarts, type Store } from "./state.ts";

const shownWhen = [
  "loadFailed",
  "signedOut",
  "artifactUpdated",
  "libraryUpdated",
  "attemptSwitched",
  "startedOver",
] as const;

interface NoticeSource {
  readonly notices: Partial<Record<(typeof shownWhen)[number], boolean>>;
  retry(): void;
  subscribe(listener: () => void): () => void;
}

const labels = {
  en: {
    lost: {
      one: (count: number) => `${String(count)} answer not saved`,
      other: (count: number) => `${String(count)} answers not saved`,
    },
    goTo: (number: number) => `Go to question ${String(number)}`,
  },
  pt: {
    lost: {
      one: (count: number) => `${String(count)} resposta não salva`,
      other: (count: number) => `${String(count)} respostas não salvas`,
    },
    goTo: (number: number) => `Ir para a questão ${String(number)}`,
  },
};

function pageLanguage(): "en" | "pt" {
  return document.documentElement.lang.startsWith("pt") ? "pt" : "en";
}

class StateNotices extends HTMLElement {
  #source: NoticeSource | undefined;
  #store: Store | undefined;
  #lostShown = "";

  constructor() {
    super();
    this.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const control = event.target.closest<HTMLElement>("[data-action]");
      if (control === null) return;
      const { action } = control.dataset;
      if (action === "retry" && control.getAttribute("aria-disabled") !== "true") {
        this.#retry(control);
      }
      if (action === "reload") location.reload();
      if (action === "undo-start-over") this.#store?.answers.undoStartOver();
      if (action === "go-to-lost" && control instanceof HTMLAnchorElement) {
        const target = document.getElementById(control.hash.slice(1));
        if (target === null) return;
        event.preventDefault();
        goTo(target, control.hash);
      }
    });
  }

  connectedCallback() {
    whenStoreStarts((store) => {
      if (this.#source !== undefined) return;
      this.#store = store;
      this.#connect(store.answers);
    });
    whenLibraryStatusesStart((statuses) => {
      if (this.#source !== undefined) return;
      this.#connect(statuses);
    });
  }

  #connect(source: NoticeSource) {
    this.#source = source;
    source.subscribe(() => {
      this.#show(source);
    });
    this.#show(source);
  }

  #retry(button: HTMLElement) {
    button.setAttribute("aria-disabled", "true");
    this.#part("[data-notice=loadFailed]").dataset.retrying = "";
    this.#source?.retry();
  }

  #show(source: NoticeSource) {
    const focused = this.contains(document.activeElement) ? document.activeElement : null;
    const { notices } = source;
    for (const notice of shownWhen) {
      const part = this.querySelector<HTMLElement>(`[data-notice=${notice}]`);
      if (part !== null) part.hidden = notices[notice] !== true;
    }
    this.#settleRetry(notices.loadFailed === true);
    if (this.#store !== undefined) {
      this.#showLost(this.#store, new Set(this.#store.answers.notices.lostAnswers));
    }
    if (focused !== null && focused.closest("[hidden]") !== null) {
      const main = document.querySelector("main");
      if (main === null) return;
      if (!main.hasAttribute("tabindex")) main.tabIndex = -1;
      main.focus({ preventScroll: true });
    }
  }

  // Rewriting the text of a load that failed again makes the status region announce it again.
  #settleRetry(stillFailed: boolean) {
    const notice = this.#part("[data-notice=loadFailed]");
    if (notice.dataset.retrying === undefined) return;
    delete notice.dataset.retrying;
    this.#part("[data-action=retry]").removeAttribute("aria-disabled");
    if (!stillFailed) return;
    for (const message of notice.querySelectorAll(":scope > [data-lang]")) {
      message.replaceChildren(message.textContent);
    }
  }

  #showLost(store: Store, lost: Set<string>) {
    const shown = [...lost].join(" ");
    if (shown === this.#lostShown) return;
    this.#lostShown = shown;
    for (const part of this.querySelectorAll<HTMLElement>(".state-notices-lost")) {
      part.hidden = lost.size === 0;
    }
    const first = store.answers.questions.find(({ id }) => lost.has(id));
    if (first === undefined) return;
    const text = labels[pageLanguage()];
    const plural = new Intl.PluralRules(document.documentElement.lang || "en").select(lost.size);
    this.#part(".state-notices-lost-count").textContent =
      plural === "one" ? text.lost.one(lost.size) : text.lost.other(lost.size);
    const link = this.#part("[data-action=go-to-lost]");
    link.setAttribute("href", `#${questionAnchor(first.id)}`);
    link.textContent = text.goTo(first.number);
  }

  #part(selector: string): HTMLElement {
    const part = this.querySelector<HTMLElement>(selector);
    if (part === null) throw new Error(`${this.localName} has no ${selector}`);
    return part;
  }
}

customElements.define("artifact-state-notices", StateNotices);
