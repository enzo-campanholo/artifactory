import type { SavedAttempt } from "../src/saved-state.ts";
import type { Answer, NumericKey, Question } from "../src/scoring.ts";
import { memoryTransport, startStore, type Store, type Transport } from "../src/state.ts";

export const questionIds = {
  singleChoice: "area-of-a-circle",
  numeric: "area-of-a-3-cm-circle",
  openQuestion: "why-pi-r-squared",
};

export const numericKey: NumericKey = { value: "28.27", tolerance: 0.01 };

const questions: Question[] = [
  { id: questionIds.singleChoice, kind: "single-choice", key: 2 },
  { id: questionIds.numeric, kind: "numeric", key: numericKey },
  { id: questionIds.openQuestion, kind: "open-question" },
];

const ownWords = "Cut the disc into thin rings and add up their areas.";
const singleChoiceRight: Answer = {
  questionId: questionIds.singleChoice,
  response: 2,
  mark: "right",
};
const singleChoiceWrong: Answer = {
  questionId: questionIds.singleChoice,
  response: 3,
  mark: "wrong",
};
// The wrong answer is the circumference, 2πr, a mistake someone could really make.
const numericRight: Answer = {
  questionId: questionIds.numeric,
  response: "28,27",
  mark: "right",
};
const numericWrong: Answer = {
  questionId: questionIds.numeric,
  response: "18,85",
  mark: "wrong",
};
const openQuestionRight: Answer = {
  questionId: questionIds.openQuestion,
  response: ownWords,
  mark: "right",
};
const openQuestionWrong: Answer = {
  questionId: questionIds.openQuestion,
  response: ownWords,
  mark: "wrong",
};

function attempt(id: string, startedAt: string, answers: Answer[]): SavedAttempt {
  return {
    id,
    startedAt,
    answers: answers.map((answer, index) => ({
      ...answer,
      answeredAt: new Date(Date.parse(startedAt) + index * 60_000).toISOString(),
    })),
  };
}

const earlierAttempts = [
  attempt("finished", "2026-10-01T09:00:00.000Z", [
    singleChoiceWrong,
    numericRight,
    openQuestionRight,
  ]),
  attempt("unfinished", "2026-10-08T19:30:00.000Z", [singleChoiceRight]),
];
const latestRight = attempt("latest", "2026-10-14T08:15:00.000Z", [
  singleChoiceRight,
  numericRight,
  openQuestionRight,
]);
const latestWrong = attempt("latest", "2026-10-14T08:15:00.000Z", [
  singleChoiceWrong,
  numericWrong,
  openQuestionWrong,
]);

const artifactId = "catalog";
const contentHash = "catalog";
const noReply = () => new Promise<never>(() => undefined);

function seeded(attempts: SavedAttempt[] = []) {
  return memoryTransport({ contentHash, attempts });
}

function start(
  transport: Transport,
  pageQuestions = questions,
  startFrom: SavedAttempt[] = [],
): Store {
  return startStore({ artifactId, contentHash, questions: pageQuestions, transport, startFrom });
}

// A check that agrees with the page tells no listener, so the catalog waits for it to settle.
async function checked(store: Store): Promise<Store> {
  while (!store.answers.checked) await new Promise((resolve) => setTimeout(resolve, 0));
  return store;
}

function answerRightAndWrong(store: Store) {
  for (const { questionId, response, mark } of [
    singleChoiceRight,
    numericWrong,
    openQuestionWrong,
  ]) {
    void store.answers.save(questionId, response, mark);
  }
}

function typeNumber() {
  const field = document.querySelector(`#q-${questionIds.numeric} input`);
  if (!(field instanceof HTMLInputElement))
    throw new Error("The catalog's numeric question has no field");
  field.value = "28,27";
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

function writeAndShowModelAnswer() {
  const question = `#q-${questionIds.openQuestion}`;
  const textarea = document.querySelector(`${question} textarea`);
  const modelAnswer = document.querySelector(`${question} details`);
  if (!(textarea instanceof HTMLTextAreaElement) || !(modelAnswer instanceof HTMLDetailsElement)) {
    throw new Error("The catalog's open question has no textarea or model answer");
  }
  textarea.value = ownWords;
  modelAnswer.open = true;
}

interface CatalogState {
  title: string;
  about: string;
  show(): void | Promise<void>;
}

export const catalogStates = {
  unanswered: {
    title: "Unanswered",
    about:
      "Checked with no attempts, as the page reads before its script runs: the questions are open, the contents offer to start with question 1 and the attempts history has none.",
    show() {
      start(seeded());
    },
  },
  "model-answer-shown": {
    title: "Model answer shown",
    about:
      "The owner typed a number into the numeric question without checking it, and wrote an answer to the self-checked question and opened its model answer. Nothing is saved until they check the number or mark their answer.",
    async show() {
      await checked(start(seeded()));
      typeNumber();
      writeAndShowModelAnswer();
    },
  },
  saving: {
    title: "Saving",
    about:
      "Every question is answered, the choice right and the number and the open answer wrong, and no save has been confirmed yet.",
    async show() {
      answerRightAndWrong(await checked(start({ ...seeded(), save: noReply })));
    },
  },
  "saved-right": {
    title: "Saved right",
    about:
      "Seeded with three attempts: a finished one, an unfinished one and the latest, which the page shows, with every question right.",
    show() {
      start(seeded([...earlierAttempts, latestRight]));
    },
  },
  "saved-wrong": {
    title: "Saved wrong",
    about:
      "Seeded with three attempts: a finished one, an unfinished one and the latest, which the page shows, with every question wrong: the choice crosses out the chosen option and ticks the right one, and the number shows the right answer.",
    show() {
      start(seeded([...earlierAttempts, latestWrong]));
    },
  },
  "not-saved": {
    title: "Not saved",
    about:
      "Forced outcome “save fails”: every answer stays locked with Not saved and a Retry, which fails again. A wrong number shows no right answer until it is saved.",
    async show() {
      const transport = seeded();
      transport.forced.add("save fails");
      answerRightAndWrong(await checked(start(transport)));
    },
  },
  "answered-elsewhere": {
    title: "Answered elsewhere",
    about:
      "Forced outcome “answered elsewhere”: another device answered each question first with the opposite mark, so the page shows that answer. The auto-checked ones are checked again against their keys, so only their notices change, and the wrong number shows the right answer.",
    async show() {
      const transport = seeded();
      transport.forced.add("answered elsewhere");
      answerRightAndWrong(await checked(start(transport)));
    },
  },
  "load-failed": {
    title: "Check failed",
    about:
      "Forced outcome “load fails” on a page that starts from the answers this device last showed, three attempts with every question right in the latest: the page stays as it started and usable, and the band says the answers couldn't be checked, with Try again.",
    show() {
      const attempts = [...earlierAttempts, latestRight];
      const transport = seeded(attempts);
      transport.forced.add("load fails");
      start(transport, questions, attempts);
    },
  },
  "signed-out": {
    title: "Signed out",
    about:
      "Forced outcome “signed out” once the page has loaded: the answers given next are lost, and the band counts them and links the first.",
    async show() {
      const transport = seeded();
      const store = await checked(start(transport));
      transport.forced.add("signed out");
      answerRightAndWrong(store);
    },
  },
  "artifact-updated": {
    title: "Artifact updated",
    about:
      "Forced outcome “artifact updated”: the saved state belongs to a newer build of the artifact, so the band asks for a reload.",
    show() {
      const transport = seeded([...earlierAttempts, latestRight]);
      transport.forced.add("artifact updated");
      start(transport);
    },
  },
  "attempt-switched": {
    title: "Attempt switched",
    about:
      "Another device starts a newer attempt and the page refreshes, so it switches to that attempt with a notice.",
    async show() {
      const transport = seeded([...earlierAttempts, latestRight]);
      await checked(start(transport));
      await transport.save(artifactId, "other-device", singleChoiceWrong);
      document.dispatchEvent(new Event("visibilitychange"));
    },
  },
  "started-over": {
    title: "Started over",
    about:
      "Seeded with three attempts, then Start over: the questions reopen, the contents offer question 1 again, no attempt is marked as this attempt, and the band offers Undo until the next answer.",
    async show() {
      const store = await checked(start(seeded([...earlierAttempts, latestRight])));
      store.answers.startOver();
    },
  },
} satisfies Record<string, CatalogState>;

export type CatalogStateName = keyof typeof catalogStates;

const manyQuestionsPerSection = 4;

export const manyQuestions = {
  title: "Trinta e duas questões sob títulos longos que quebram linhas",
  about:
    "A draft in pt-BR with 32 questions under eight long headings. The latest attempt has right and wrong answers, one answer still saving and one not saved, and 23 earlier attempts fill the history past Show all.",
  sections: [
    "Respostas certas e erradas lado a lado, numa seção de título longo",
    "Uma resposta ainda salvando e outra que não foi salva",
    "Questões ainda sem resposta depois das respondidas",
    "Palavras compridas como desoxirribonucleico e otorrinolaringologista quebram sem cortar",
    "Seção curta",
    "Mais quatro questões para passar de trinta",
    "Penúltima seção, com um título que quebra em duas linhas no celular",
    "Última seção antes do fim da página",
  ].map((heading, index) => ({
    slug: `secao-${String(index + 1)}`,
    heading,
    questionIds: Array.from(
      { length: manyQuestionsPerSection },
      (_, question) => `secao-${String(index + 1)}-questao-${String(question + 1)}`,
    ),
  })),
  async show() {
    const ids = manyQuestions.sections.flatMap(({ questionIds }) => questionIds);
    const answer = (questionId: string, right: boolean): Answer =>
      right
        ? { questionId, response: 1, mark: "right" }
        : { questionId, response: 2, mark: "wrong" };
    const earlier = Array.from({ length: 23 }, (_, index) =>
      attempt(
        `earlier-${String(index)}`,
        new Date(Date.UTC(2026, 8, 1 + index, 19)).toISOString(),
        ids.slice(0, 4 + (index % 5)).map((id, question) => answer(id, (question + index) % 3 > 0)),
      ),
    );
    const latest = attempt(
      "latest",
      "2026-10-14T08:15:00.000Z",
      ids.slice(0, 12).map((id, index) => answer(id, index % 4 !== 3)),
    );
    const [saving = "", notSaved = ""] = ids.slice(12, 14);
    const memory = seeded([...earlier, latest]);
    const store = await checked(
      start(
        {
          load: (id) => memory.load(id),
          save: (id, attemptId, given) => {
            if (given.questionId === saving) return noReply();
            if (given.questionId === notSaved) return Promise.resolve({ outcome: "failed" });
            return memory.save(id, attemptId, given);
          },
        },
        ids.map((id) => ({ id, kind: "single-choice", key: 1 })),
      ),
    );
    void store.answers.save(saving, 1, "right");
    void store.answers.save(notSaved, 2, "wrong");
  },
};

export const catalogScenes = { ...catalogStates, "many-questions": manyQuestions };

export type CatalogSceneName = keyof typeof catalogScenes;
