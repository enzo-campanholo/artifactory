import { markOwner } from "./owner-mark.ts";
import { numbered, type NumberedQuestion } from "./question-markers.ts";
import type { ArtifactState, SavedAnswer, SavedAttempt } from "./saved-state.ts";
import {
  currentMark,
  summarize,
  toRevisit,
  type Answer,
  type Json,
  type Mark,
  type Question,
} from "./scoring.ts";

export type LoadOutcome<State> =
  { outcome: "loaded"; state: State } | { outcome: "failed" | "signed out" };

type SaveOutcome =
  | { outcome: "saved" | "already answered"; answer: SavedAnswer }
  | { outcome: "failed" | "signed out" };

export interface Transport {
  load(artifactId: string): Promise<LoadOutcome<ArtifactState>>;
  save(artifactId: string, attemptId: string, answer: Answer): Promise<SaveOutcome>;
}

type ForcedOutcome =
  "answered elsewhere" | "save fails" | "load fails" | "artifact updated" | "signed out";

export interface MemoryTransport extends Transport {
  readonly forced: Set<ForcedOutcome>;
}

export function memoryTransport(seed: ArtifactState): MemoryTransport {
  const state = structuredClone(seed);
  const forced = new Set<ForcedOutcome>();
  const resolve = <Outcome>(outcome: Outcome) => Promise.resolve(structuredClone(outcome));
  return {
    forced,
    load() {
      if (forced.has("signed out")) return resolve({ outcome: "signed out" });
      if (forced.has("load fails")) return resolve({ outcome: "failed" });
      const contentHash = forced.has("artifact updated")
        ? `${state.contentHash}-updated`
        : state.contentHash;
      return resolve({ outcome: "loaded", state: { ...state, contentHash } });
    },
    save(_artifactId, attemptId, answer) {
      if (forced.has("signed out")) return resolve({ outcome: "signed out" });
      if (forced.has("save fails")) return resolve({ outcome: "failed" });
      const answeredAt = new Date().toISOString();
      let attempt = state.attempts.find(({ id }) => id === attemptId);
      if (attempt === undefined) {
        attempt = { id: attemptId, startedAt: answeredAt, answers: [] };
        state.attempts.push(attempt);
      }
      const { answers } = attempt;
      const answeredBefore = () =>
        answers.find(({ questionId }) => questionId === answer.questionId);
      if (forced.has("answered elsewhere") && answeredBefore() === undefined) {
        answers.push({ ...answer, mark: answer.mark === "right" ? "wrong" : "right", answeredAt });
      }
      const earlier = answeredBefore();
      if (earlier !== undefined) return resolve({ outcome: "already answered", answer: earlier });
      const saved = { ...answer, answeredAt };
      answers.push(saved);
      return resolve({ outcome: "saved", answer: saved });
    },
  };
}

// Sent so that Cloudflare Access answers an expired session with 401 instead of a login redirect.
const headers = { "X-Requested-With": "XMLHttpRequest" };

export async function loadOverHttp<State>(path: string): Promise<LoadOutcome<State>> {
  try {
    const response = await fetch(path, { headers });
    if (response.status === 401) return { outcome: "signed out" };
    if (!response.ok) return { outcome: "failed" };
    return { outcome: "loaded", state: (await response.json()) as State };
  } catch {
    return { outcome: "failed" };
  }
}

export function keepFresh({ load, retry }: { load: () => void; retry: () => void }): void {
  window.addEventListener("focus", retry);
  window.addEventListener("online", retry);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") load();
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) load();
  });
}

export function httpTransport(): Transport {
  const statePath = (artifactId: string) => `/api/state/${encodeURIComponent(artifactId)}`;
  return {
    load(artifactId) {
      return loadOverHttp<ArtifactState>(statePath(artifactId));
    },
    async save(artifactId, attemptId, { questionId, response, mark }) {
      try {
        const saved = await fetch(
          `${statePath(artifactId)}/attempts/${encodeURIComponent(attemptId)}/answers/${encodeURIComponent(questionId)}`,
          {
            method: "PUT",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ response, mark }),
          },
        );
        if (saved.status === 201) {
          return { outcome: "saved", answer: (await saved.json()) as SavedAnswer };
        }
        if (saved.status === 401) return { outcome: "signed out" };
        if (saved.status === 409) {
          // Without a saved answer, the 409 means the question isn't in the deployed manifest.
          const body = (await saved.json()) as SavedAnswer | { error: string };
          if ("answeredAt" in body) return { outcome: "already answered", answer: body };
        }
        return { outcome: "failed" };
      } catch {
        return { outcome: "failed" };
      }
    },
  };
}

const keptPrefix = "artifactory:";
export const keptKey = (name: string) => `${keptPrefix}${name}`;
const keptAttemptsKey = (artifactId: string) => keptKey(`artifact-state:${artifactId}`);

export function keeping(write: () => void): void {
  try {
    write();
  } catch {
    // Storage can be full or turned off, and then nothing is kept: an artifact page starts from no
    // answers, and the Library paints its statuses after the load.
  }
}

export function forgetKeptState(): void {
  keeping(() => {
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
    // The prefix is reserved for kept state, which signing out clears.
    for (const key of keys) if (key?.startsWith(keptPrefix)) localStorage.removeItem(key);
  });
}

export function keptAttempts(artifactId: string): SavedAttempt[] {
  try {
    const kept: unknown = JSON.parse(localStorage.getItem(keptAttemptsKey(artifactId)) ?? "[]");
    return Array.isArray(kept) ? (kept as SavedAttempt[]) : [];
  } catch {
    return [];
  }
}

function keepAttempts(artifactId: string, attempts: SavedAttempt[]) {
  keeping(() => {
    localStorage.setItem(keptAttemptsKey(artifactId), JSON.stringify(attempts));
  });
}

function addToAttempts(attempts: SavedAttempt[], attemptId: string, saved: SavedAnswer) {
  let attempt = attempts.find(({ id }) => id === attemptId);
  if (attempt === undefined) {
    attempt = { id: attemptId, startedAt: saved.answeredAt, answers: [] };
    attempts.push(attempt);
  }
  if (!attempt.answers.some(({ questionId }) => questionId === saved.questionId)) {
    attempt.answers.push(saved);
  }
}

export function keptTransport(transport: Transport): Transport {
  return {
    async load(artifactId) {
      const loading = await transport.load(artifactId);
      if (loading.outcome === "loaded") {
        markOwner();
        keepAttempts(artifactId, loading.state.attempts);
      }
      if (loading.outcome === "signed out") forgetKeptState();
      return loading;
    },
    async save(artifactId, attemptId, answer) {
      const saving = await transport.save(artifactId, attemptId, answer);
      if (saving.outcome === "saved" || saving.outcome === "already answered") {
        markOwner();
        const attempts = keptAttempts(artifactId);
        addToAttempts(attempts, attemptId, saving.answer);
        keepAttempts(artifactId, attempts);
      }
      if (saving.outcome === "signed out") forgetKeptState();
      return saving;
    },
  };
}

export interface PageAnswer {
  response: Json;
  mark: Mark;
  status: "saving" | "saved" | "not-saved" | "answered-elsewhere" | "lost";
}

interface PageEntry extends Answer, PageAnswer {
  attemptId: string;
}

function sameAnswer(entry: PageEntry, saved: SavedAnswer): boolean {
  return (
    entry.mark === saved.mark && JSON.stringify(entry.response) === JSON.stringify(saved.response)
  );
}

export interface Notices {
  loadFailed: boolean;
  signedOut: boolean;
  lostAnswers: string[];
  attemptSwitched: boolean;
  artifactUpdated: boolean;
  startedOver: boolean;
}

export interface PageAttempt extends SavedAttempt {
  shown: boolean;
  finished: boolean;
}

export interface ShownAttempt {
  progress: { answered: number; total: number };
  score: number;
  toRevisit: NumberedQuestion[];
  stoppingPoint: NumberedQuestion | undefined;
}

export interface Store {
  answers: {
    readonly checked: boolean;
    readonly notices: Notices;
    readonly attempts: PageAttempt[];
    readonly questions: NumberedQuestion[];
    readonly shownAttempt: ShownAttempt;
    get(questionId: string): PageAnswer | undefined;
    save(questionId: string, response: Json, mark: Mark): Promise<void>;
    retry(): void;
    startOver(): void;
    undoStartOver(): void;
    subscribe(listener: () => void): () => void;
  };
}

function latestAttempt(attempts: SavedAttempt[]): SavedAttempt | undefined {
  return attempts.reduce<SavedAttempt | undefined>(
    (latest, attempt) =>
      latest === undefined || attempt.startedAt > latest.startedAt ? attempt : latest,
    undefined,
  );
}

function sameAttempts(shown: SavedAttempt[], loaded: SavedAttempt[]): boolean {
  const canonical = (attempts: SavedAttempt[]) =>
    JSON.stringify(
      attempts
        .map(({ id, startedAt, answers }) => ({
          id,
          startedAt,
          answers: answers
            .map(({ questionId, response, mark, answeredAt }) => ({
              questionId,
              response,
              mark,
              answeredAt,
            }))
            .sort((a, b) => a.questionId.localeCompare(b.questionId)),
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
  return canonical(shown) === canonical(loaded);
}

function stoppingPoint(
  questions: NumberedQuestion[],
  answered: (question: Question) => boolean,
): NumberedQuestion | undefined {
  const unanswered = (question: Question) => !answered(question);
  const lastAnswered = questions.findLastIndex(answered);
  return questions.slice(lastAnswered + 1).find(unanswered) ?? questions.find(unanswered);
}

function createStore(
  artifactId: string,
  contentHash: string,
  questions: Question[],
  transport: Transport,
  startFrom: SavedAttempt[],
): Store {
  const pageQuestions = numbered(questions);
  let checked = false;
  let actedBeforeCheck = false;
  let loadInFlight = false;
  let shownAttemptId: string = crypto.randomUUID();
  let attempts: SavedAttempt[] = [];
  const knownAttemptIds = new Set<string>();
  const confirmedAnswers: [attemptId: string, saved: SavedAnswer][] = [];
  const answers = new Map<string, PageEntry>();
  const unsaved = new Set<PageEntry>();
  const notices: Notices = {
    loadFailed: false,
    signedOut: false,
    lostAnswers: [],
    attemptSwitched: false,
    artifactUpdated: false,
    startedOver: false,
  };
  let beforeStartOver: { attemptId: string; answers: Map<string, PageEntry> } | undefined;
  const listeners = new Set<() => void>();
  const changed = () => {
    for (const listener of listeners) listener();
  };

  const entry = (
    { questionId, response, mark }: Answer,
    attemptId: string,
    status: PageAnswer["status"],
  ): PageEntry => ({ questionId, response, mark, attemptId, status });

  function answeredOnServer(saved: SavedAnswer, attemptId: string, mine: PageEntry | undefined) {
    if (mine !== undefined) unsaved.delete(mine);
    if (mine !== undefined && sameAnswer(mine, saved)) {
      mine.status = "saved";
    } else if (answers.get(saved.questionId) === mine) {
      answers.set(saved.questionId, entry(saved, attemptId, "answered-elsewhere"));
    }
  }

  function addConfirmedAnswer(attemptId: string, saved: SavedAnswer) {
    confirmedAnswers.push([attemptId, saved]);
    addToAttempts(attempts, attemptId, saved);
  }

  function lose(mine: PageEntry) {
    mine.status = "lost";
    notices.lostAnswers.push(mine.questionId);
  }

  // A sign-out stops every load, so Retry on a failed load would do nothing.
  function signOut() {
    notices.signedOut = true;
    notices.loadFailed = false;
    for (const mine of unsaved) lose(mine);
    unsaved.clear();
  }

  async function send(mine: PageEntry) {
    knownAttemptIds.add(mine.attemptId);
    const sending = await transport.save(artifactId, mine.attemptId, {
      questionId: mine.questionId,
      response: mine.response,
      mark: mine.mark,
    });
    switch (sending.outcome) {
      case "saved":
        mine.status = "saved";
        addConfirmedAnswer(mine.attemptId, sending.answer);
        break;
      case "already answered":
        answeredOnServer(sending.answer, mine.attemptId, mine);
        addConfirmedAnswer(mine.attemptId, sending.answer);
        break;
      case "failed":
        if (notices.signedOut) {
          lose(mine);
        } else {
          mine.status = "not-saved";
          unsaved.add(mine);
        }
        break;
      case "signed out":
        signOut();
        lose(mine);
        break;
    }
    changed();
  }

  function showAttempt(attempt: SavedAttempt) {
    notices.startedOver = false;
    shownAttemptId = attempt.id;
    answers.clear();
    for (const answer of attempt.answers) {
      answers.set(answer.questionId, entry(answer, attempt.id, "saved"));
    }
  }

  function showFirst(state: SavedAttempt[]) {
    answers.clear();
    shownAttemptId = crypto.randomUUID();
    attempts = state;
    for (const { id } of attempts) knownAttemptIds.add(id);
    const latest = latestAttempt(attempts);
    if (latest !== undefined) showAttempt(latest);
  }

  function refresh(state: ArtifactState) {
    attempts = state.attempts;
    for (const [attemptId, saved] of confirmedAnswers) addToAttempts(attempts, attemptId, saved);
    const latest = latestAttempt(attempts);
    // Before the first check the page knows only the copy's attempts, so any other attempt the
    // server sent looks new, but answers given on the page since, not yet saved, are in a newer one.
    const answeredBeforeCheck =
      !checked && answers.size > 0 && !attempts.some(({ id }) => id === shownAttemptId);
    const latestIsNew =
      latest !== undefined && !knownAttemptIds.has(latest.id) && !answeredBeforeCheck;
    for (const { id } of attempts) knownAttemptIds.add(id);
    if (latestIsNew) {
      showAttempt(latest);
      notices.attemptSwitched = true;
      return;
    }
    const shown = attempts.find(({ id }) => id === shownAttemptId);
    for (const saved of shown?.answers ?? []) {
      const mine = answers.get(saved.questionId);
      if (mine === undefined || mine.status === "not-saved") {
        answeredOnServer(saved, shownAttemptId, mine);
      }
    }
  }

  function receive(state: ArtifactState) {
    notices.loadFailed = false;
    if (state.contentHash !== contentHash) notices.artifactUpdated = true;
    if (checked || actedBeforeCheck) refresh(state);
    else showFirst(state.attempts);
    checked = true;
  }

  // The page started from what this device last showed, so a first load that agrees changes nothing.
  function agreesWithPage(state: ArtifactState): boolean {
    return (
      !checked &&
      !actedBeforeCheck &&
      !notices.loadFailed &&
      state.contentHash === contentHash &&
      sameAttempts(attempts, state.attempts)
    );
  }

  async function load() {
    if (loadInFlight || notices.signedOut) return;
    loadInFlight = true;
    const loading = await transport.load(artifactId);
    loadInFlight = false;
    switch (loading.outcome) {
      case "loaded":
        if (agreesWithPage(loading.state)) {
          checked = true;
          return;
        }
        receive(loading.state);
        break;
      case "failed":
        if (!checked) notices.loadFailed = true;
        break;
      case "signed out":
        signOut();
        break;
    }
    changed();
  }

  function retry() {
    if (notices.signedOut) return;
    if (notices.loadFailed) void load();
    const retrying = [...unsaved];
    if (retrying.length === 0) return;
    unsaved.clear();
    for (const mine of retrying) {
      mine.status = "saving";
      void send(mine);
    }
    changed();
  }
  keepFresh({ load: () => void load(), retry });

  showFirst(structuredClone(startFrom));
  void load();

  return {
    answers: {
      get checked() {
        return checked;
      },
      get notices() {
        return { ...notices, lostAnswers: [...notices.lostAnswers] };
      },
      get attempts() {
        return attempts.map((attempt) => ({
          ...structuredClone(attempt),
          shown: attempt.id === shownAttemptId,
          finished: summarize(attempt.answers, questions).finished,
        }));
      },
      get questions() {
        return structuredClone(pageQuestions);
      },
      get shownAttempt() {
        const onPage = [...answers.values()];
        const saved = onPage.filter(
          ({ status }) => status === "saved" || status === "answered-elsewhere",
        );
        const { marks, score } = summarize(saved, questions);
        return {
          progress: summarize(onPage, questions).progress,
          score,
          toRevisit: structuredClone(toRevisit(pageQuestions, marks)),
          stoppingPoint: structuredClone(stoppingPoint(pageQuestions, ({ id }) => answers.has(id))),
        };
      },
      get(questionId) {
        const question = pageQuestions.find(({ id }) => id === questionId);
        const answer = answers.get(questionId);
        if (question === undefined || answer === undefined) return undefined;
        return {
          response: answer.response,
          mark: currentMark(question, answer),
          status: answer.status,
        };
      },
      async save(questionId, response, mark) {
        actedBeforeCheck ||= !checked;
        const mine = entry({ questionId, response, mark }, shownAttemptId, "saving");
        answers.set(questionId, mine);
        notices.attemptSwitched = false;
        notices.startedOver = false;
        if (notices.signedOut) lose(mine);
        changed();
        if (mine.status === "saving") await send(mine);
      },
      retry,
      startOver() {
        actedBeforeCheck ||= !checked;
        beforeStartOver = { attemptId: shownAttemptId, answers: new Map(answers) };
        shownAttemptId = crypto.randomUUID();
        notices.attemptSwitched = false;
        notices.startedOver = true;
        answers.clear();
        changed();
      },
      // The answers come back as the page had them, so one still saving or not saved stays shown.
      undoStartOver() {
        if (!notices.startedOver || beforeStartOver === undefined) return;
        shownAttemptId = beforeStartOver.attemptId;
        answers.clear();
        for (const [questionId, mine] of beforeStartOver.answers) answers.set(questionId, mine);
        notices.startedOver = false;
        changed();
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
  };
}

let pageStore: Store | undefined;
const waitingForStore: ((store: Store) => void)[] = [];

export function startStore({
  artifactId,
  contentHash,
  questions,
  transport,
  startFrom,
}: {
  artifactId: string;
  contentHash: string;
  questions: Question[];
  transport: Transport;
  startFrom: SavedAttempt[];
}): Store {
  const store = createStore(artifactId, contentHash, questions, transport, startFrom);
  pageStore = store;
  for (const connect of waitingForStore.splice(0)) connect(store);
  return store;
}

export function whenStoreStarts(connect: (store: Store) => void): void {
  if (pageStore === undefined) waitingForStore.push(connect);
  else connect(pageStore);
}
