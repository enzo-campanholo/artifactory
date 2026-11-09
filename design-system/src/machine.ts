import type { Content, Step } from "./stage-build.ts";

// The machine definition the trace runs ([ADR 0008](../../docs/adr/0008-the-design-system-holds-machines.md)).
// Only `stage-build.ts` imports it, so artifacts never see these types.

export type Language = Content["lang"];

export type InEachLanguage = Record<Language, string>;

// In English only: the check's failure line names it. `line` is the shown number, and none for a
// problem that isn't on a code line, such as a note's.
export interface Problem {
  line: number | undefined;
  problem: string;
}

export type Parsed<Program> = { program: Program } | { problems: Problem[] };

// In each language: the check reports it in English and the page in the artifact's.
export interface Fault {
  line: number;
  fault: InEachLanguage;
}

export type StepOutcome<State> = { state: State; say: string; halted: boolean } | { fault: Fault };

// Without `say`: the trace says the first state, and `step` each later one.
export type ShownState = Omit<Step, "say">;

// `Value` is the kind of value the machine reads, which types the trace's input, so a Stage field
// of another kind fails the check's `build-input`.
export interface Machine<Program, State, Notes, Value extends number | string> {
  parse: (content: Content, notes: Notes) => Parsed<Program>;
  start: (program: Program, readsInOrder: Value[]) => State;
  step: (state: State) => StepOutcome<State>;
  view: (state: State) => ShownState;
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
