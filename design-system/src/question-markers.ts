import { escapedAttribute, unescapedAttribute } from "./html-attributes.ts";
import type { AutoCheckedKind, Json, Question } from "./scoring.ts";

export type NumberedQuestion = Question & { number: number };

export function questionAnchor(questionId: string): string {
  return `q-${questionId}`;
}

export function questionMarkers({ id, kind, key }: Question) {
  return {
    id: questionAnchor(id),
    "data-question-id": id,
    "data-question-kind": kind,
    "data-question-key": key === undefined ? undefined : JSON.stringify(key),
  };
}

// Astro writes attribute values in double quotes and escapes only `&` and `"` in them, and code
// blocks escape their "<", so only a question's own start tag matches.
const markers =
  /<[a-z][\w-]*\sid="q-[^"]*"\sdata-question-id="([^"]*)"\sdata-question-kind="([^"]*)"(?:\sdata-question-key="([^"]*)")?/g;

// The page's frame fills in question numbers a component can't count: a CSS counter can't print a
// range ahead of the questions it counts.
export function questionRangeSlot(firstId: string, lastId: string): string {
  return `<span data-question-range-from="${escapedAttribute(firstId)}" data-question-range-to="${escapedAttribute(lastId)}"></span>`;
}

export function questionNumberSlot(questionId: string): string {
  return `<span data-question-number="${escapedAttribute(questionId)}"></span>`;
}

const rangeSlot =
  /(<span data-question-range-from="([^"]*)" data-question-range-to="([^"]*)">)(<\/span>)/g;
const numberSlot = /(<span data-question-number="([^"]*)">)(<\/span>)/g;

export function withQuestionNumbers(content: string, questions: NumberedQuestion[]): string {
  const numbers = new Map<string, number>();
  for (const { id, number } of questions) if (!numbers.has(id)) numbers.set(id, number);
  const numberOf = (written: string) => numbers.get(unescapedAttribute(written));
  return content
    .replace(rangeSlot, (slot, open: string, from: string, to: string, close: string) => {
      const first = numberOf(from);
      const last = numberOf(to);
      return first === undefined || last === undefined
        ? slot
        : `${open} ${String(first)}–${String(last)}${close}`;
    })
    .replace(numberSlot, (slot, open: string, written: string, close: string) => {
      const number = numberOf(written);
      return number === undefined ? slot : `${open}${String(number)}${close}`;
    });
}

export function numbered(questions: Question[]): NumberedQuestion[] {
  return questions.map((question, index) => ({ ...question, number: index + 1 }));
}

function markedQuestion(id: string, kind: string, key: string | undefined): Question {
  if (key === undefined) return { id, kind };
  return { id, kind: kind as AutoCheckedKind, key: JSON.parse(key) as Json };
}

export function readQuestions(html: string): NumberedQuestion[] {
  return numbered(
    [...html.matchAll(markers)].map(([, id = "", kind = "", key]) =>
      markedQuestion(
        unescapedAttribute(id),
        unescapedAttribute(kind),
        key === undefined ? undefined : unescapedAttribute(key),
      ),
    ),
  );
}

export interface PlacedQuestion {
  id: string;
  number: number;
  section?: string | undefined;
}

type WrittenQuestion = Question & PlacedQuestion;

const blockId = "artifact-questions";

export function questionsBlock(questions: WrittenQuestion[]): string {
  return jsonBlock(
    blockId,
    questions.map(({ id, kind, key, number, section }) => ({ id, kind, key, number, section })),
  );
}

function jsonBlock(id: string, value: unknown): string {
  const json = JSON.stringify(value).replaceAll("<", "\\u003c");
  return `<script type="application/json" id="${id}">${json}</script>`;
}

function jsonInBlock(id: string, html: string): string | undefined {
  return new RegExp(String.raw`<script type="application/json" id="${id}">([^<]*)</script>`).exec(
    html,
  )?.[1];
}

export function questionsInBlock(html: string): Question[] {
  return parsedBlock(jsonInBlock(blockId, html)).map(asQuestion);
}

export function placedQuestionsInBlock(html: string): PlacedQuestion[] {
  return parsedBlock(jsonInBlock(blockId, html)).map(({ id, number, section }) => ({
    id,
    number,
    section,
  }));
}

export function questionsInDocument(): Question[] {
  return parsedBlock(document.getElementById(blockId)?.textContent).map(asQuestion);
}

function parsedBlock(json: string | undefined): WrittenQuestion[] {
  if (json === undefined) throw new Error("The page has no questions block");
  return JSON.parse(json) as WrittenQuestion[];
}

function asQuestion({ id, kind, key }: WrittenQuestion): Question {
  return key === undefined ? { id, kind } : { id, kind, key };
}

export interface LibraryQuestions {
  artifactId: string;
  questions: PlacedQuestion[];
}

const libraryBlockId = "library-questions";

export function libraryQuestionsBlock(artifacts: LibraryQuestions[]): string {
  return jsonBlock(libraryBlockId, artifacts);
}

export function libraryQuestionsInBlock(html: string): LibraryQuestions[] {
  return parsedLibraryBlock(jsonInBlock(libraryBlockId, html));
}

export function libraryQuestionsInDocument(): LibraryQuestions[] {
  return parsedLibraryBlock(document.getElementById(libraryBlockId)?.textContent);
}

function parsedLibraryBlock(json: string | undefined): LibraryQuestions[] {
  if (json === undefined) throw new Error("The page has no Library questions block");
  return JSON.parse(json) as LibraryQuestions[];
}

export function questionElement(questionId: string): HTMLElement {
  const element = document.getElementById(questionAnchor(questionId));
  if (element === null) throw new Error(`The page has no question ${questionId}`);
  return element;
}
