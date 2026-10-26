import type { Build, Mark, Typed } from "./stage-build.ts";

// More steps than this is no longer a walkthrough.
const mostSteps = 200;

// What each mark changes in a drawn part, after the Stage's styles for the marks and the colour
// classes in figure-colours.css: `muted` and `reversed` swap the colours `-text`, `-accent` and
// `-surface` paint with, and a label with no fill of its own paints in its part's colour.
const unclassedLabel = 'text:not([fill]):not([class*="fill-"])';
const changes: Record<Mark, { selector: string; actsOn: string }> = {
  strong: {
    selector: '[class*="stroke-"], text',
    actsOn: "shapes with a `stroke-` class and labels",
  },
  dashed: { selector: '[class*="stroke-"]', actsOn: "shapes with a `stroke-` class" },
  muted: {
    selector: `[class*="-text"], [class*="-accent"], ${unclassedLabel}`,
    actsOn: "`-text` and `-accent` colours and labels with no fill of their own",
  },
  reversed: {
    selector: `[class*="-text"], [class*="-accent"], [class*="-surface"], ${unclassedLabel}`,
    actsOn: "`-surface`, `-text` and `-accent` colours and labels with no fill of their own",
  },
};
const marks = new Set<unknown>(Object.keys(changes));

// The elements a step can change, in the order the content as written lists them: the drawing's
// parts, each table's body cells by row, and each code block's lines.
export interface StageNodes {
  parts: Element[];
  tables: { header: Element[]; rows: Element[][] }[];
  code: Element[][];
}

export function stageNodes(stage: ParentNode): StageNodes {
  return {
    parts: [...stage.querySelectorAll(".stage-figure [data-part]")],
    tables: [...stage.querySelectorAll(".stage-content table")].map((table) => ({
      header: [...table.querySelectorAll("thead th")],
      rows: [...table.querySelectorAll("tbody tr")].map((row) => [...row.children]),
    })),
    code: [...stage.querySelectorAll(".stage-content pre")].map((block) => [
      ...block.querySelectorAll("code > .line"),
    ]),
  };
}

export interface Written {
  parts: { name: string; takes: Mark[] }[];
  tables: { columns: string[]; rows: string[][] }[];
  codeLineCounts: number[];
}

const textOf = (element: Element) => element.textContent.trim();

const marksTaken = (part: Element): Mark[] =>
  (Object.keys(changes) as Mark[]).filter(
    (mark) =>
      part.matches(changes[mark].selector) || part.querySelector(changes[mark].selector) !== null,
  );

export function writtenContent({ parts, tables, code }: StageNodes): Written {
  return {
    parts: parts.map((part) => ({
      name: part.getAttribute("data-part") ?? "",
      takes: marksTaken(part),
    })),
    tables: tables.map(({ header, rows }) => ({
      columns: header.map(textOf),
      rows: rows.map((cells) => cells.map(textOf)),
    })),
    codeLineCounts: code.map((lines) => lines.length),
  };
}

interface ShownCell {
  text: string;
  mark: Mark | undefined;
}

export interface Shown {
  say: string;
  parts: Map<string, Mark>;
  tables: ShownCell[][][];
  rowsFromBody: boolean;
  lines: Map<number, Mark>;
  running: number | undefined;
}

export interface StepProblem {
  step: number;
  problem: string;
}

export type Run =
  | { steps: Shown[] }
  | { refused: "threw"; error: unknown }
  | { refused: "not-a-list" }
  | { refused: "no-steps" }
  | { refused: "too-many"; most: number }
  | { refused: "problems"; problems: StepProblem[] };

export interface Field {
  name: string;
  label?: string;
  min: number;
  max: number;
}

// A whole number as the owner types it: digits, with a hyphen or a minus sign before them.
export function typedNumber(text: string): number {
  const digits = text.trim().replace(/^−/, "-");
  return /^-?\d+$/.test(digits) ? Number(digits) : Number.NaN;
}

// The page refuses what the owner types, and the Stage refuses its examples, by the same rules.
export function numberProblem(
  { min, max }: Field,
  value: unknown,
): "not-whole" | "out-of-bounds" | undefined {
  if (typeof value !== "number" || !Number.isInteger(value)) return "not-whole";
  return value < min || value > max ? "out-of-bounds" : undefined;
}

// A build is the artifact agent's code, cast or not, so what it returns is checked here, where the
// page and the check both run it.
export function runBuild<Input extends string | Typed>(
  build: Build<Input>,
  input: Input,
  written: Written,
): Run {
  try {
    const steps: unknown = build.steps(input);
    if (!Array.isArray(steps)) return { refused: "not-a-list" };
    if (steps.length === 0) return { refused: "no-steps" };
    if (steps.length > mostSteps) return { refused: "too-many", most: mostSteps };
    const shown: Shown[] = [];
    const problems: StepProblem[] = [];
    // With typed input the rows as written are the first example's result, so a step without
    // `body` in a run that rewrites them would show that result mid-run. With `choose` they're the
    // starting state, which a step may show again by leaving `body` out.
    const rewritesRows =
      typeof input !== "string" &&
      steps.some((step: unknown) => isRecord(step) && step.body !== undefined);
    steps.forEach((step: unknown, index) => {
      const applied = applyStep(written, step);
      if ("shown" in applied) shown.push(applied.shown);
      else problems.push(...applied.problems.map((problem) => ({ step: index + 1, problem })));
      if (rewritesRows && isRecord(step) && step.body === undefined) {
        problems.push({
          step: index + 1,
          problem:
            "has no `body`, but this run's other steps rewrite the table's rows: give every step `body`, `[]` for no rows",
        });
      }
    });
    return problems.length > 0 ? { refused: "problems", problems } : { steps: shown };
  } catch (error) {
    return { refused: "threw", error };
  }
}

interface Place {
  table: number;
  row: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function quoted(value: unknown): string {
  return typeof value === "string" ? `\`${value}\`` : "something";
}

function listed(numbers: number[]): string {
  return `${numbers.slice(0, -1).join(", ")} and ${String(numbers.at(-1))}`;
}

export function rowTexts(cells: string[]): string {
  return cells.map((text) => `\`${text}\``).join(", ");
}

function isRows(value: unknown): value is string[][] {
  return (
    Array.isArray(value) &&
    value.every((row) => Array.isArray(row) && row.every((text) => typeof text === "string"))
  );
}

// Rows and columns are found by their text, so a name that matches more than one is a problem
// rather than a guess.
function applyStep(written: Written, step: unknown): { shown: Shown } | { problems: string[] } {
  if (!isRecord(step)) return { problems: ["isn't a step, an object with `say`"] };
  const problems: string[] = [];
  const {
    say,
    parts: markedParts = {},
    lines: markedLines = {},
    body,
    rows: markedRows = {},
    cells = [],
  } = step;
  if (typeof say !== "string") problems.push("has a `say` that isn't text");
  else if (say.trim() === "") problems.push("has an empty `say`");

  const marked = (field: string, value: unknown): [string, Mark][] => {
    if (!isRecord(value)) {
      problems.push(`has \`${field}\` that isn't an object of marks by name`);
      return [];
    }
    return Object.entries(value).flatMap(([name, mark]): [string, Mark][] => {
      if (marks.has(mark)) return [[name, mark as Mark]];
      problems.push(`marks \`${name}\` in \`${field}\` with ${quoted(mark)}, which isn't a mark`);
      return [];
    });
  };

  const parts = new Map<string, Mark>();
  for (const [name, mark] of marked("parts", markedParts)) {
    const withName = written.parts.filter((part) => part.name === name);
    if (withName.length === 0) {
      problems.push(`marks the part \`${name}\`, which the drawing doesn't have`);
    } else if (!withName.some(({ takes }) => takes.includes(mark))) {
      problems.push(
        `marks the part \`${name}\` \`${mark}\`, which changes nothing in it: \`${mark}\` acts on ${changes[mark].actsOn}`,
      );
    } else parts.set(name, mark);
  }

  const lines = new Map<number, Mark>();
  let running: number | undefined;
  const lineMarks = marked("lines", markedLines);
  const [lineCount, ...otherBlocks] = written.codeLineCounts;
  if (lineMarks.length > 0 && (lineCount === undefined || otherBlocks.length > 0)) {
    const blocks =
      lineCount === undefined
        ? "no code block"
        : `${String(written.codeLineCounts.length)} code blocks`;
    problems.push(
      `has \`lines\`, but the Stage holds ${blocks}: \`lines\` marks the lines of exactly one`,
    );
  } else if (lineCount !== undefined) {
    for (const [name, mark] of lineMarks) {
      const line = Number(name);
      if (/^[1-9]\d*$/.test(name) && line <= lineCount) lines.set(line, mark);
      else {
        problems.push(
          `marks the line \`${name}\`, which the code doesn't have: it has ${String(lineCount)} ${lineCount === 1 ? "line" : "lines"}`,
        );
      }
    }
    const reversed = [...lines].flatMap(([line, mark]) => (mark === "reversed" ? [line] : []));
    if (reversed.length > 1) {
      problems.push(
        `marks the lines ${listed(reversed)} \`reversed\`, but only the one running line is \`reversed\``,
      );
    } else [running] = reversed;
  }

  // `body` adds rows only of the kind already there, so it needs one table and a row to copy.
  const rows = written.tables.map((table) => table.rows);
  let rowsFromBody = false;
  if (body !== undefined) {
    const [table, ...otherTables] = written.tables;
    if (!isRows(body)) problems.push("has `body` that isn't a list of rows, each a list of texts");
    else if (table === undefined || otherTables.length > 0) {
      const tableCount =
        table === undefined ? "no table" : `${String(written.tables.length)} tables`;
      problems.push(
        `has \`body\`, but the Stage holds ${tableCount}: \`body\` rewrites the rows of exactly one`,
      );
    } else if (table.rows.length === 0) {
      problems.push(
        "has `body`, but its table has no row as written for the new rows to copy: write one",
      );
    } else {
      const columns = table.columns.length;
      const misfits = body.filter((cells) => cells.length !== columns);
      for (const cells of misfits) {
        problems.push(
          `gives \`body\` a row of ${String(cells.length)} ${cells.length === 1 ? "cell" : "cells"} (${rowTexts(cells)}), but the table has ${String(columns)} ${columns === 1 ? "column" : "columns"}: give every row one text per column`,
        );
      }
      if (misfits.length === 0) {
        rows[0] = body;
        rowsFromBody = true;
      }
    }
  }

  const tables = rows.map((table) =>
    table.map((cells) => cells.map((text): ShownCell => ({ text, mark: undefined }))),
  );
  const rowsStarting = (name: string, among: number[]): Place[] =>
    among.flatMap((table) =>
      (rows[table] ?? []).flatMap((cells, row) => (cells[0] === name ? [{ table, row }] : [])),
    );
  const everyTable = written.tables.map((_, table) => table);

  for (const [name, mark] of marked("rows", markedRows)) {
    const [place, ...others] = rowsStarting(name, everyTable);
    if (place === undefined) {
      problems.push(
        rowsFromBody
          ? `marks the row \`${name}\`, which starts no row of this step's \`body\``
          : `marks the row \`${name}\`, which starts no table row`,
      );
    } else if (others.length > 0) {
      problems.push(`names the row \`${name}\`, which starts more than one table row`);
    } else {
      for (const cell of tables[place.table]?.[place.row] ?? []) cell.mark = mark;
    }
  }

  if (!Array.isArray(cells)) problems.push("has `cells` that isn't a list");
  for (const change of Array.isArray(cells) ? (cells as unknown[]) : []) {
    if (!isRecord(change) || typeof change.row !== "string" || typeof change.column !== "string") {
      problems.push("has a cell change without a `row` and a `column` written as text");
      continue;
    }
    const { row, column, text, mark } = change;
    const cellName = `the cell in the row \`${row}\` and the column \`${column}\``;
    if (text !== undefined && typeof text !== "string") {
      problems.push(`sets ${cellName} to something that isn't text`);
      continue;
    }
    if (mark !== undefined && !marks.has(mark)) {
      problems.push(`marks ${cellName} with ${quoted(mark)}, which isn't a mark`);
      continue;
    }
    const headed = everyTable.filter((table) => written.tables[table]?.columns.includes(column));
    const [table, ...otherTables] = headed;
    if (table === undefined) {
      problems.push(`changes a cell in the column \`${column}\`, which heads no table`);
      continue;
    }
    if (otherTables.length > 0) {
      problems.push(`names the column \`${column}\`, which heads more than one table`);
      continue;
    }
    const [place, ...others] = rowsStarting(row, [table]);
    if (place === undefined) {
      problems.push(
        rowsFromBody
          ? `changes a cell in the row \`${row}\`, which this step's \`body\` doesn't have`
          : `changes a cell in the row \`${row}\`, which the table with the column \`${column}\` doesn't have`,
      );
      continue;
    }
    if (others.length > 0) {
      problems.push(`names the row \`${row}\`, which starts more than one table row`);
      continue;
    }
    const index = written.tables[table]?.columns.indexOf(column) ?? -1;
    const cell = tables[table]?.[place.row]?.[index];
    if (cell === undefined) continue;
    if (text !== undefined) cell.text = text;
    if (mark !== undefined) cell.mark = mark as Mark;
  }

  return problems.length > 0 || typeof say !== "string"
    ? { problems }
    : { shown: { say, parts, tables, rowsFromBody, lines, running } };
}
