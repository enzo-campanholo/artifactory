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

function attributeValue(written: string): string {
  return written.replaceAll("&quot;", '"').replaceAll("&amp;", "&");
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
        attributeValue(id),
        attributeValue(kind),
        key === undefined ? undefined : attributeValue(key),
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
