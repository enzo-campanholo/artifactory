export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type Mark = "right" | "wrong";

export type ParsedNumber = { number: number } | { refused: "not-a-number" | "ambiguous" };

const typedNumber =
  /^(?<sign>[+-])?(?:(?<whole>\d+)(?:[.,](?<decimals>\d+))?(?:[eE](?<exponent>[+-]?\d+))?|(?<numerator>\d+)\/(?<denominator>\d+))$/;

function readNumber(text: string): { number: number; ambiguous: boolean } | undefined {
  const parts = typedNumber.exec(text.trim().replaceAll("−", "-"))?.groups;
  if (parts === undefined) return undefined;
  const { sign = "", whole, decimals, exponent = "0", numerator, denominator } = parts;
  const magnitude =
    whole === undefined
      ? Number(numerator) / Number(denominator)
      : Number(`${whole}.${decimals ?? "0"}e${exponent}`);
  if (!Number.isFinite(magnitude)) return undefined;
  return {
    number: sign === "-" ? -magnitude : magnitude,
    // `1.000` and `2,500` group thousands in one convention and are decimals in the other.
    ambiguous: whole !== undefined && Number(whole) !== 0 && decimals?.length === 3,
  };
}

export function parseNumber(text: string): ParsedNumber {
  const read = readNumber(text);
  if (read === undefined) return { refused: "not-a-number" };
  return read.ambiguous ? { refused: "ambiguous" } : { number: read.number };
}

// `checks` reads a numeric question's `Json` key as a `NumericKey`; an interface has no implicit index
// signature, so TypeScript would refuse that conversion.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type NumericKey = {
  value: string;
  tolerance?: number;
  relativeTolerance?: number;
};

// The agent writes `value` as the question's `answer` prop, so the problems name `answer`.
export function numericKeyProblem(key: NumericKey): string | undefined {
  const value = readNumber(key.value)?.number;
  if (value === undefined) {
    return `\`answer\` is "${key.value}", which isn't a number; write it like "9.81", "-3/4" or "6.02e23"`;
  }
  if (key.value.includes(",")) {
    return `\`answer\` is "${key.value}"; write its decimals after \`.\`, not \`,\``;
  }
  if (key.tolerance !== undefined && key.relativeTolerance !== undefined) {
    return "give it `tolerance` or `relativeTolerance`, not both";
  }
  for (const name of ["tolerance", "relativeTolerance"] as const) {
    const tolerance = key[name];
    if (tolerance !== undefined && !(Number.isFinite(tolerance) && tolerance >= 0)) {
      return `\`${name}\` is ${String(tolerance)}; give it a finite number, zero or more`;
    }
  }
  if (key.relativeTolerance !== undefined && value === 0) {
    return "`relativeTolerance` is a fraction of `answer`, which is zero; give it a `tolerance` instead";
  }
  return undefined;
}

// Edges are inclusive, but `9.80 - 9.81` comes out a hair over `0.01` in doubles. The slack is a few
// units in the last place, so it scales with the numbers compared.
function within(answer: number, value: number, allowed: number): boolean {
  if (allowed === 0) return answer === value;
  const slack = 4 * Number.EPSILON * Math.max(Math.abs(answer), Math.abs(value));
  return Math.abs(answer - value) <= allowed + slack;
}

function checkNumeric(response: Json, key: NumericKey): boolean {
  if (typeof response !== "string") return false;
  const answer = parseNumber(response);
  const value = readNumber(key.value)?.number;
  if (!("number" in answer) || value === undefined) return false;
  const allowed =
    key.relativeTolerance === undefined
      ? (key.tolerance ?? 0)
      : key.relativeTolerance * Math.abs(value);
  return within(answer.number, value, allowed);
}

const checks = {
  "single-choice": (response: Json, key: Json) => response === key,
  numeric: (response: Json, key: Json) => checkNumeric(response, key as NumericKey),
} satisfies Record<string, (response: Json, key: Json) => boolean>;

export type AutoCheckedKind = keyof typeof checks;

export function check(kind: AutoCheckedKind, response: Json, key: Json): Mark {
  return checks[kind](response, key) ? "right" : "wrong";
}

export type Question = AutoCheckedQuestion | SelfCheckedQuestion;

interface AutoCheckedQuestion {
  id: string;
  kind: AutoCheckedKind;
  key: Json;
}

interface SelfCheckedQuestion {
  id: string;
  kind: string;
  key?: undefined;
}

export interface Answer {
  questionId: string;
  response: Json;
  mark: Mark;
}

export interface Summary {
  marks: Record<string, Mark>;
  progress: { answered: number; total: number };
  score: number;
  finished: boolean;
}

export function currentMark(question: Question, answer: Answer): Mark {
  return question.key === undefined
    ? answer.mark
    : check(question.kind, answer.response, question.key);
}

export function summarize(answers: Answer[], questions: Question[]): Summary {
  const answerTo = new Map(answers.map((answer) => [answer.questionId, answer]));
  const marks: Record<string, Mark> = {};
  for (const question of questions) {
    const answer = answerTo.get(question.id);
    if (answer !== undefined) marks[question.id] = currentMark(question, answer);
  }
  const answered = Object.keys(marks).length;
  const score = Object.values(marks).filter((mark) => mark === "right").length;
  return {
    marks,
    progress: { answered, total: questions.length },
    score,
    finished: answered === questions.length,
  };
}

export function toRevisit<Q extends { id: string }>(questions: Q[], marks: Summary["marks"]): Q[] {
  return questions.filter(({ id }) => marks[id] === "wrong");
}
