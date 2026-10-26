import type { NumberedQuestion } from "./question-markers.ts";
import { check, type Json, type Mark } from "./scoring.ts";
import { whenStoreStarts, type PageAnswer, type Store } from "./state.ts";

const labels = {
  en: {
    question: "Question",
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
    question: "Questão",
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
const statusText: Record<PageAnswer["status"], (mark: keyof Labels) => (keyof Labels)[]> = {
  saving: () => ["saving"],
  saved: (mark) => [mark],
  "not-saved": () => ["notSaved"],
  "answered-elsewhere": (mark) => [mark, "answeredElsewhere"],
  lost: () => ["notSaved", "signedOut"],
};

function ownMark(submitter: HTMLElement | null): Mark | undefined {
  const value = submitter?.getAttribute("value");
  return value === "right" || value === "wrong" ? value : undefined;
}

export abstract class QuestionElement extends HTMLElement {
  abstract readResponse(): Json | undefined;
  abstract showResponse(response: Json): void;

  #store: Store | undefined;
  #unsubscribe: (() => void) | undefined;

  // Coming back to the page, the browser restores what was written just before pageshow, with no
  // input event, and the store may show the question before or after that.
  readonly #syncRestoredResponse = () => {
    if (this.inert || this.dataset.status !== undefined) return;
    this.responseChanged(this.readResponse() !== undefined);
  };

  constructor() {
    super();
    this.addEventListener("submit", (event) => {
      event.preventDefault();
      this.#answer(event.submitter);
    });
    this.addEventListener("input", () => {
      this.responseChanged(this.readResponse() !== undefined);
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
      this.#name(store);
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

  #question(store: Store): NumberedQuestion {
    const question = store.answers.questions.find(({ id }) => id === this.dataset.questionId);
    if (question === undefined)
      throw new Error(`${this.localName} isn't one of the page's questions`);
    return question;
  }

  #part(selector: string): HTMLElement {
    const part = this.querySelector<HTMLElement>(selector);
    if (part === null) throw new Error(`${this.localName} has no ${selector}`);
    return part;
  }

  // The page numbers questions with a CSS counter, which Chromium leaves out of a computed name.
  // The name is on the question itself, which going to a question focuses.
  #name(store: Store) {
    const { number } = this.#question(store);
    this.setAttribute("aria-label", `${this.#labels().question} ${String(number)}`);
  }

  #answer(submitter: HTMLElement | null) {
    const store = this.#store;
    if (store === undefined) return;
    const question = this.#question(store);
    if (store.answers.get(question.id) !== undefined) return;
    const response = this.readResponse();
    if (response === undefined) return;
    const mark =
      question.key === undefined
        ? ownMark(submitter)
        : check(question.kind, response, question.key);
    if (mark === undefined) return;
    void store.answers.save(question.id, response, mark);
  }

  #show(store: Store) {
    const focused = this.contains(document.activeElement) ? document.activeElement : null;
    const notShownYet = this.inert;
    this.inert = false;
    const question = this.#question(store);
    const answer = store.answers.get(question.id);
    if (answer === undefined) {
      if (this.dataset.status !== undefined) this.#reopen();
      else if (notShownYet) this.#syncRestoredResponse();
      return;
    }
    // An answer given on this page shows saving first. One that arrives saved was restored, from
    // the device or a load, and a page of them would otherwise all be read out at once.
    const restored = this.dataset.status === undefined && answer.status === "saved";
    this.showResponse(answer.response);
    for (const fieldset of this.querySelectorAll("fieldset")) fieldset.disabled = true;
    const { mark } = answer;
    this.dataset.mark = mark;
    this.dataset.status = answer.status;
    const text = this.#labels();
    const markLabel =
      question.key === undefined ? (mark === "right" ? "ownRight" : "ownWrong") : mark;
    const status = this.#part(".question-status");
    if (restored) status.setAttribute("aria-live", "off");
    status.textContent = statusText[answer.status](markLabel)
      .map((key) => text[key])
      .join(" · ");
    const recovery = this.#part(".question-recovery");
    recovery.hidden = answer.status !== "not-saved";
    if (answer.status !== "not-saved") recovery.replaceChildren();
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

  #reopen() {
    this.querySelector("form")?.reset();
    for (const fieldset of this.querySelectorAll("fieldset")) fieldset.disabled = false;
    for (const details of this.querySelectorAll("details")) details.open = false;
    delete this.dataset.mark;
    delete this.dataset.status;
    const status = this.#part(".question-status");
    status.removeAttribute("aria-live");
    status.textContent = "";
    this.#part(".question-recovery").hidden = true;
    this.responseChanged(false);
  }

  protected get wrongAnswerLocked(): boolean {
    const locked = this.dataset.status === "saved" || this.dataset.status === "answered-elsewhere";
    return locked && this.dataset.mark === "wrong";
  }

  protected inPageLanguage<Text>(texts: { en: Text; pt: Text }): Text {
    const lang = this.closest("[lang]")?.getAttribute("lang") ?? "en";
    return lang.startsWith("pt") ? texts.pt : texts.en;
  }

  #labels() {
    return this.inPageLanguage(labels);
  }
}
