import {
  inPageLanguage,
  QuestionAnswer,
  type QuestionResponse,
  type ShownAnswer,
} from "./question-answer.ts";
import type { Json } from "./scoring.ts";
import { whenStoreStarts, type PageAnswer, type Store } from "./state.ts";

const labels = {
  en: {
    right: "Right",
    wrong: "Wrong",
    ownRight: "I got it right",
    ownWrong: "I got it wrong",
    saving: "Saving",
    notSaved: "Not saved",
    retry: "Try saving again",
    answeredElsewhere: "Already answered on another device",
    signedOut: "Signed out",
  },
  pt: {
    right: "Correta",
    wrong: "Incorreta",
    ownRight: "Acertei",
    ownWrong: "Errei",
    saving: "Salvando",
    notSaved: "Não salva",
    retry: "Tentar salvar de novo",
    answeredElsewhere: "Já respondida em outro dispositivo",
    signedOut: "Sessão encerrada",
  },
};

type Labels = (typeof labels)["en"];

// Right or wrong shows only once the answer is saved: until then the box's outline says why not.
const statusText: Record<PageAnswer["status"], (mark: ShownAnswer["mark"]) => (keyof Labels)[]> = {
  saving: () => ["saving"],
  saved: (mark) => [mark],
  "not-saved": () => ["notSaved"],
  "answered-elsewhere": (mark) => [mark, "answeredElsewhere"],
  lost: () => ["notSaved", "signedOut"],
};

// A question box: its form, Check, status and recovery line, driving the answers of the questions
// it holds. Its one Check saves every unanswered one of them together.
export abstract class QuestionBox extends HTMLElement {
  protected abstract readonly answers: readonly QuestionAnswer[];

  #store: Store | undefined;
  #unsubscribe: (() => void) | undefined;

  // Coming back to the page, the browser restores what was written just before pageshow, with no
  // input event, and the store may show the question before or after that.
  readonly #syncRestoredResponse = () => {
    if (!this.inert) this.#responsesChanged();
  };

  constructor() {
    super();
    this.addEventListener("submit", (event) => {
      event.preventDefault();
      this.#answer(event.submitter);
    });
    this.addEventListener("input", () => {
      this.#responsesChanged();
    });
  }

  // Each kind enables what it submits with once there's something to submit.
  protected responseChanged(hasResponse: boolean): void {
    this.querySelector(".question-check")?.setAttribute("aria-disabled", String(!hasResponse));
  }

  connectedCallback() {
    this.inert = true;
    window.addEventListener("pageshow", this.#syncRestoredResponse);
    whenStoreStarts((store) => {
      if (!this.isConnected || this.#store !== undefined) return;
      this.#store = store;
      for (const answer of this.answers) answer.name(store);
      this.#unsubscribe = store.answers.subscribe(() => {
        this.#show(store);
      });
      this.#show(store);
    });
  }

  disconnectedCallback() {
    window.removeEventListener("pageshow", this.#syncRestoredResponse);
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.#store = undefined;
  }

  #responsesChanged() {
    const open = this.answers.filter((answer) => !answer.showsAnswer);
    if (open.length === 0) return;
    this.responseChanged(open.every((answer) => answer.readResponse() !== undefined));
  }

  #part(selector: string): HTMLElement {
    const part = this.querySelector<HTMLElement>(selector);
    if (part === null) throw new Error(`${this.localName} has no ${selector}`);
    return part;
  }

  #answer(submitter: HTMLElement | null) {
    const store = this.#store;
    if (store === undefined) return;
    const unanswered = this.answers.filter((answer) => answer.unanswered(store));
    if (unanswered.some((answer) => answer.readResponse() === undefined)) return;
    for (const answer of unanswered) answer.save(store, submitter);
  }

  #show(store: Store) {
    const focused = this.contains(document.activeElement) ? document.activeElement : null;
    const notShownYet = this.inert;
    this.inert = false;
    const reopened = this.answers.filter(
      (answer) => answer.showsAnswer && answer.unanswered(store),
    );
    if (reopened.length > 0) {
      this.querySelector("form")?.reset();
      for (const answer of reopened) answer.reopen();
    }
    const [shown] = this.answers.flatMap((answer) => answer.show(store) ?? []);
    if (shown !== undefined) this.#report(store, shown, focused);
    else if (reopened.length > 0) this.#clearReport();
    if (reopened.length > 0) this.responseChanged(false);
    else if (notShownYet) this.#syncRestoredResponse();
  }

  #report(
    store: Store,
    { status: answerStatus, mark, restored }: ShownAnswer,
    focused: Element | null,
  ) {
    const text = this.inPageLanguage(labels);
    const status = this.#part(".question-status");
    if (restored) status.setAttribute("aria-live", "off");
    status.textContent = statusText[answerStatus](mark)
      .map((key) => text[key])
      .join(" · ");
    const recovery = this.#part(".question-recovery");
    recovery.hidden = answerStatus !== "not-saved";
    if (answerStatus !== "not-saved") recovery.replaceChildren();
    else if (recovery.childElementCount === 0) {
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "control-text";
      retry.textContent = text.retry;
      retry.addEventListener("click", () => {
        store.answers.retry();
      });
      recovery.append(retry);
    }
    if (focused !== null && (!focused.isConnected || focused.closest(":disabled") !== null)) {
      status.focus({ preventScroll: true });
    }
  }

  #clearReport() {
    const status = this.#part(".question-status");
    status.removeAttribute("aria-live");
    status.textContent = "";
    this.#part(".question-recovery").hidden = true;
  }

  protected inPageLanguage<Text>(texts: { en: Text; pt: Text }): Text {
    return inPageLanguage(this, texts);
  }
}

// A question box holding one question, whose markers it carries.
export abstract class QuestionElement extends QuestionBox implements QuestionResponse {
  abstract readResponse(): Json | undefined;
  abstract showResponse(response: Json): void;

  protected readonly answers = [new QuestionAnswer(this, this)];

  protected get wrongAnswerLocked(): boolean {
    const locked = this.dataset.status === "saved" || this.dataset.status === "answered-elsewhere";
    return locked && this.dataset.mark === "wrong";
  }
}
