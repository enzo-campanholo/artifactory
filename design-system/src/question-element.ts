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
    answered: "Answered",
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
    answered: "Respondidas",
    notSaved: "Não salva",
    retry: "Tentar salvar de novo",
    answeredElsewhere: "Já respondida em outro dispositivo",
    signedOut: "Sessão encerrada",
  },
};

type Labels = (typeof labels)["en"];
type StatusWords = (keyof Labels)[];

// Right or wrong shows only once the answer is saved: until then the box's outline says why not.
const markedStatusText: Record<PageAnswer["status"], (mark: ShownAnswer["mark"]) => StatusWords> = {
  saving: () => ["saving"],
  saved: (mark) => [mark],
  "not-saved": () => ["notSaved"],
  "answered-elsewhere": (mark) => [mark, "answeredElsewhere"],
  lost: () => ["notSaved", "signedOut"],
};

// A box holding several questions never says right or wrong: each question carries its own mark,
// and the box shows no score.
const setStatusText: Record<PageAnswer["status"], StatusWords> = {
  saving: ["saving"],
  saved: ["answered"],
  "not-saved": ["notSaved"],
  "answered-elsewhere": ["answeredElsewhere"],
  lost: ["notSaved", "signedOut"],
};

const mostUrgentFirst: PageAnswer["status"][] = [
  "not-saved",
  "lost",
  "saving",
  "answered-elsewhere",
];

// The box reports its most urgent answer while any is saving, not saved, answered elsewhere or
// signed out, and that every one is saved once all are. Otherwise it's open, and reports nothing.
function boxReport(shown: readonly (ShownAnswer | undefined)[]): ShownAnswer | undefined {
  const answered = shown.filter((answer) => answer !== undefined);
  const restored = answered.every((answer) => answer.restored);
  for (const status of mostUrgentFirst) {
    const urgent = answered.find((answer) => answer.status === status);
    if (urgent !== undefined) return { ...urgent, restored };
  }
  const [first] = answered;
  return first !== undefined && answered.length === shown.length
    ? { ...first, restored }
    : undefined;
}

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
    const shown = this.answers.map((answer) => answer.show(store));
    this.answersShown(shown);
    const report = boxReport(shown);
    this.showBoxStatus(report?.status);
    if (report !== undefined) this.#report(store, report, focused);
    else this.#clearReport();
    if (reopened.length > 0) this.responseChanged(false);
    else if (notShownYet) this.#syncRestoredResponse();
  }

  // Each answer's element carries its own status; a box holding several questions carries the set's.
  protected showBoxStatus(status: PageAnswer["status"] | undefined): void {
    if (status === undefined) delete this.dataset.status;
    else this.dataset.status = status;
  }

  protected statusWords({ status }: ShownAnswer): StatusWords {
    return setStatusText[status];
  }

  // Called with each answer as shown, in the order of `answers`, on every change.
  protected abstract answersShown(shown: readonly (ShownAnswer | undefined)[]): void;

  #report(store: Store, report: ShownAnswer, focused: Element | null) {
    const { status: answerStatus, restored } = report;
    const text = this.inPageLanguage(labels);
    const status = this.#part(".question-status");
    if (restored) status.setAttribute("aria-live", "off");
    status.textContent = this.statusWords(report)
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
    if (focused !== null && this.#focusLeaves(focused)) status.focus({ preventScroll: true });
  }

  // Check hides once nothing is left to check, as a locked answer's controls are disabled.
  #focusLeaves(focused: Element): boolean {
    return (
      !focused.isConnected ||
      focused.closest(":disabled") !== null ||
      (focused.matches(".question-check") && this.answers.every((answer) => answer.showsAnswer))
    );
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

// A question box holding one question, whose markers it carries. Its explanation, if it has one,
// shows only while the answer is locked, as a wrong answer's right option does.
export abstract class QuestionElement extends QuestionBox implements QuestionResponse {
  static observedAttributes = ["data-status", "data-mark"];

  abstract readResponse(): Json | undefined;
  abstract showResponse(response: Json): void;

  protected readonly answers = [new QuestionAnswer(this, this)];

  protected override showBoxStatus(): void {
    // Its one answer's status and mark are on the box itself already.
  }

  protected answersShown(): void {
    // Its one answer shows its mark on the box, through its status and mark attributes.
  }

  protected override statusWords({ status, mark }: ShownAnswer): StatusWords {
    return markedStatusText[status](mark);
  }

  attributeChangedCallback() {
    const explanation = this.querySelector<HTMLElement>(":scope > form > .question-explanation");
    if (explanation !== null) explanation.hidden = !this.#answerLocked;
  }

  get #answerLocked(): boolean {
    return this.dataset.status === "saved" || this.dataset.status === "answered-elsewhere";
  }

  protected get wrongAnswerLocked(): boolean {
    return this.#answerLocked && this.dataset.mark === "wrong";
  }
}
