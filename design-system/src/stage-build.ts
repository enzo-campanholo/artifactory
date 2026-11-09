import type { Fault, Machine } from "./machine.ts";

/**
 * The four marks a step can put on the drawing, the tables and the code, named for what they
 * mean. The Stage draws each one the same way everywhere:
 *
 * - `strong`: settled, or just changed. A thicker line, or text at 600.
 * - `dashed`: provisional, such as a candidate. A dashed line, or a cell or code line in a dashed
 *   box.
 * - `muted`: no longer available, such as a branch not taken. The grey.
 * - `reversed`: the one current thing. A shape filled with ink and its label in the ground, a
 *   reversed cell, or the running code line as a bar of ink across the code's width.
 */
export type Mark = "strong" | "dashed" | "muted" | "reversed";

/** A change to one table cell, found by its row and its column. */
export interface CellChange {
  /** The row, by the text of its first cell. */
  row: string;
  /** The column, by the text of its header. */
  column: string;
  /**
   * The cell's text in this step, as plain text: Markdown and math show as typed, so write a
   * symbol in Unicode ("∞"). Leave it out to keep the cell as written.
   */
  text?: string;
  /** The cell's mark in this step, over its row's. Leave it out to keep the row's mark. */
  mark?: Mark | undefined;
}

/**
 * One step of the run, whole: the Stage starts it from the content as written and applies only
 * what it names, so name everything this step shows, not what changed since the last one.
 */
export interface Step {
  /**
   * What this step did, in one sentence in the artifact's language. The Stage shows it beside the
   * counter, and screen readers hear it after "Passo N de M." and, when a line is marked
   * `reversed`, "Linha L.", so it must make sense without the drawing.
   */
  say: string;
  /** Marks on the drawing's parts, by their `data-part` name. */
  parts?: Record<string, Mark>;
  /**
   * Marks on the code block's lines, by the number the page shows for each: from 1, or from the
   * fence's `start` (` ```pascal start=0 ` makes the first line 0). Mark the line this step runs
   * `reversed`, and only that one: the Stage says "Linha L." before `say`. The Stage must hold
   * exactly one fenced code block.
   */
  lines?: Record<number, Mark>;
  /**
   * The table's body rows in this step, in place of the rows as written: one list of cell texts
   * per row, one text per column, as plain text like `CellChange.text`. Each row takes the look of
   * the last row as written. `rows` and `cells` then find rows among these, not the rows as
   * written. Leave it out to keep the rows as written, with `choose` only: with `input` the rows as
   * written are the first example's result, so a run that gives `body` on one step gives it on
   * every step, `[]` for no rows, or the page refuses it. The Stage must hold exactly one table, with
   * at least one row as written. Give each step its own lists, `body.map((cells) => [...cells])`,
   * since a step keeps the lists it's given, and a later change to them reaches it too.
   */
  body?: string[][];
  /** Marks on whole table rows, by the text of their first cell. */
  rows?: Record<string, Mark>;
  /** New text and marks on single table cells. */
  cells?: CellChange[];
}

/** What the owner typed into a Stage's `input`: each field's whole number, by the field's `name`. */
export type Typed = Record<string, number>;

/** One line of the Stage's code block as written. */
export interface CodeLine {
  /** The number the page shows for it: from 1, or from the fence's `start`. */
  line: number;
  /** Its text, as plain text: no highlighting, no line number, its indentation kept. */
  text: string;
}

/** One of the Stage's tables as written, as plain text, as `rows` and `cells` find it. */
export interface WrittenTable {
  /** Each column's header text, in order. */
  columns: string[];
  /** Each body row as its cells' texts, one per column, in order. */
  rows: string[][];
}

/**
 * The Stage's content as written, `steps`'s second argument, so a build reads what the content
 * already says, such as a program in the code block, rather than writing it twice. The page and
 * `pnpm check` hand every run the same content, a fresh copy each time, whatever an earlier run
 * did with its own.
 */
export interface Content {
  /**
   * The artifact's main language, for saying each step in it: `"pt-BR"` or `"en"`, as the Stage
   * chooses its own lines.
   */
  lang: "pt-BR" | "en";
  /**
   * Each fenced code block's lines, one list per block in the content's order, each line in order
   * with the number the page shows for it: ` ```text start=0 ` makes the first line 0.
   */
  code: CodeLine[][];
  /**
   * Each table, in the content's order, with its rows as written, even in a run whose steps give
   * `body`.
   */
  tables: WrittenTable[];
}

/**
 * A custom build: what turns the owner's choice into steps. With `choose`, `steps` gets the option
 * as text; with `input`, it gets each field's number, typed as `Input`. Either way its second
 * argument is the Stage's content as written (`Content`), which a build may leave out.
 */
export interface Build<Input extends string | Typed = string> {
  /**
   * Every step for the option the owner chose or the numbers they typed, in order, at least one
   * and at most 200. Called again from step 1 whenever they choose again or press Start, with the
   * content as written each time.
   */
  steps: (input: Input, content: Content) => Step[];
}

/**
 * Wraps the build so TypeScript checks it. A `.build.ts` file's default export. With `input`,
 * give the fields' names as its type, `defineBuild<{ a: number; b: number }>({ … })`, so `steps`
 * gets them typed: `pnpm check` fails when they aren't the Stage's fields. `steps` gets the
 * content as written second, typed `Content`, without a type of its own.
 */
export function defineBuild<Input extends string | Typed = string>(
  build: Build<Input>,
): Build<Input> {
  return build;
}

// More steps than this is no longer a walkthrough.
export const mostSteps = 200;

// A machine's fault refuses the run. The trace throws it through `steps`, which returns only steps,
// and the step applier turns it into the refusal the page and the check give.
export class MachineFault extends Error {
  readonly line: number;
  readonly fault: Fault["fault"];

  constructor({ line, fault }: Fault) {
    super(`line ${String(line)}: ${fault.en}`);
    this.line = line;
    this.fault = fault;
  }
}

const startingSay: Record<Content["lang"], string> = {
  "pt-BR": "A máquina ainda não deu nenhum passo.",
  en: "The machine hasn't taken a step yet.",
};

/**
 * A build that traces a machine the design system holds, such as MEPA
 * (`@artifactory/design-system/machines/mepa`), on the owner's input: the build's whole default
 * export, `export default trace(mepa, { reads: ["x", "y"], … })`. The machine reads its program
 * from the Stage's content as written (MEPA's from the code block), so the program is written
 * once, and says each step in the artifact's main language. `notes` are the program's own data,
 * keyed by address, in the artifact's language, never read from the code's comments: `reads`
 * names the Stage's fields in the order the machine reads them, exactly the Stage's fields, or
 * `pnpm check` fails as `build-input`. Each machine's entry lists its other notes and its tables.
 *
 * The first step shows the starting state, then one step follows per step of the machine until it
 * halts, at most 200 in all, as for any build: a run past them is refused, so keep runs short
 * through the fields' bounds. Every cell whose text changed since the step before is `strong`. A
 * fault, such as a division by zero, refuses the run, naming the line and the fault.
 */
export function trace<Program, State, Notes, const Reads extends string>(
  machine: Machine<Program, State, Notes>,
  notes: NoInfer<Notes> & { reads: readonly Reads[] },
): Build<Record<Reads, number>> {
  return {
    steps(input, content) {
      const parsed = machine.parse(content, notes);
      if ("problems" in parsed) {
        throw new Error(
          parsed.problems
            .map(({ line, problem }) =>
              line === undefined ? problem : `line ${String(line)}: ${problem}`,
            )
            .join("; "),
        );
      }
      let state = machine.start(
        parsed.program,
        notes.reads.map((name) => input[name]),
      );
      const steps = [{ say: startingSay[content.lang], ...machine.view(state) }];
      for (let halted = false; !halted && steps.length <= mostSteps;) {
        const moved = machine.step(state);
        if ("fault" in moved) throw new MachineFault(moved.fault);
        ({ state, halted } = moved);
        steps.push({ say: moved.say, ...machine.view(state) });
      }
      return steps.map((step, index) => strongWhereChanged(step, steps[index - 1], content));
    },
  };
}

// A text diff can't see a write of the value a cell already held, so a view may still mark that
// cell `strong` itself, and a cell the view marks keeps its mark.
function strongWhereChanged(step: Step, before: Step | undefined, content: Content): Step {
  if (before === undefined) return step;
  const textOf = (shown: Step, row: string, column: string) =>
    shown.cells?.findLast(
      (cell) => cell.row === row && cell.column === column && cell.text !== undefined,
    )?.text ?? writtenText(content, row, column);
  const named = [...(before.cells ?? []), ...(step.cells ?? [])];
  const changed = named.filter(
    ({ row, column }, index) =>
      named.findIndex((cell) => cell.row === row && cell.column === column) === index &&
      textOf(step, row, column) !== textOf(before, row, column),
  );
  const cells = (step.cells ?? []).map((cell) =>
    cell.mark === undefined &&
    changed.some(({ row, column }) => row === cell.row && column === cell.column)
      ? { ...cell, mark: "strong" as const }
      : cell,
  );
  const unnamed = changed.filter(
    ({ row, column }) => !cells.some((cell) => cell.row === row && cell.column === column),
  );
  return {
    ...step,
    cells: [
      ...cells,
      ...unnamed.map(({ row, column }) => ({ row, column, mark: "strong" as const })),
    ],
  };
}

function writtenText(content: Content, row: string, column: string): string | undefined {
  for (const { columns, rows } of content.tables) {
    const at = columns.indexOf(column);
    const cells = rows.find(([first]) => first === row);
    if (at >= 0 && cells !== undefined) return cells[at];
  }
  return undefined;
}
