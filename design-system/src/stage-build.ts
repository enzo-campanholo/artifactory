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
