import type { Content, Step } from "./stage-build.ts";

// What a machine definition gives the trace ([ADR 0008](../../docs/adr/0008-the-design-system-holds-machines.md)).
// The trace runs it from `stage-build.ts`, so artifacts never see these types.

export type Language = Content["lang"];

// Said in each of the languages an artifact is written in, for what the check reports in English
// and the page says in the artifact's.
export type Said = Record<Language, string>;

// Reads the program from the content: a problem names the code line it's on, by its shown number.
export type Parsed<Program> =
  { program: Program } | { problems: { line: number | undefined; problem: string }[] };

export interface Fault {
  line: number;
  fault: Said;
}

export type Moved<State> = { state: State; say: string; halted: boolean } | { fault: Fault };

// The marks and texts of one state, as a step shows them, without its sentence: the trace says the
// first state and `step` says each later one.
export type View = Omit<Step, "say">;

export interface Machine<Program, State, Notes> {
  parse: (content: Content, notes: Notes) => Parsed<Program>;
  // The values the Stage's fields read, in the order of the notes' `reads`.
  start: (program: Program, input: number[]) => State;
  step: (state: State) => Moved<State>;
  view: (state: State) => View;
}

// Every machine shows and says numbers alike: a true minus sign, and `?` for a cell with no value.
export function shownNumber(value: number | undefined): string {
  return value === undefined ? "?" : String(value).replace("-", "−");
}

const spokenWords: Record<Language, { minus: string; none: string }> = {
  "pt-BR": { minus: "menos", none: "sem valor" },
  en: { minus: "minus", none: "no value" },
};

export function spokenNumber(value: number | undefined, lang: Language): string {
  const words = spokenWords[lang];
  if (value === undefined) return words.none;
  return value < 0 ? `${words.minus} ${String(-value)}` : String(value);
}
