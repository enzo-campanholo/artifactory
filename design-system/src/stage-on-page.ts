import { mainLanguage } from "./page-language.ts";
import {
  MachineFault,
  MachineProblems,
  mostSteps,
  type Build,
  type CodeLine,
  type Content,
  type Mark,
  type Typed,
  type WrittenTable,
} from "./stage-build.ts";
import { mostSwatches } from "./swatches.ts";

// What each mark changes in a drawn part, after the Stage's styles for the marks and the colour
// classes in figure-colours.css: `muted` and `reversed` swap the colours `-text`, `-accent` and
// `-surface` paint with, and a label with no fill of its own paints in its part's colour. A
// swatch takes every mark: an outline at 4 or dashed, drawn if it has none, a grey hatching, or
// an ink fill. So does a part on a step that colours it, and an uncoloured part's empty label
// counts for nothing.
const unlabelled = ':not([data-swatch=""])';
const unclassedLabel = `text:not([fill]):not([class*="fill-"])${unlabelled}`;
const swatch = '[class*="fill-swatch-"]';
const changes: Record<Mark, { selector: string; actsOn: string }> = {
  strong: {
    selector: `[class*="stroke-"], ${swatch}, text${unlabelled}`,
    actsOn: "shapes with a `stroke-` or `fill-swatch-` class and labels",
  },
  dashed: {
    selector: `[class*="stroke-"], ${swatch}`,
    actsOn: "shapes with a `stroke-` or `fill-swatch-` class",
  },
  muted: {
    selector: `[class*="-text"], [class*="-accent"], ${swatch}, ${unclassedLabel}`,
    actsOn: "`-text` and `-accent` colours, swatches and labels with no fill of their own",
  },
  reversed: {
    selector: `[class*="-text"], [class*="-accent"], [class*="-surface"], ${swatch}, ${unclassedLabel}`,
    actsOn:
      "`-surface`, `-text` and `-accent` colours, swatches and labels with no fill of their own",
  },
};
const marks = new Set<unknown>(Object.keys(changes));

// The elements a step can change, in the order the content as written lists them: the drawing's
// parts, each table's body cells by row, and each code block's lines.
interface StageNodes {
  parts: Element[];
  tables: { header: Element[]; rows: Element[][] }[];
  code: Element[][];
  colours: string[];
}

// The Stage carries its colours' names on its drawing, numerals included when it names none.
function stageNodes(stage: ParentNode): StageNodes {
  return {
    colours: JSON.parse(
      stage.querySelector(".stage-figure")?.getAttribute("data-colours") ?? "[]",
    ) as string[],
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
  parts: { name: string; takes: Mark[]; labelled: boolean }[];
  tables: WrittenTable[];
  code: CodeLine[][];
  colours: string[];
}

// A step colours a part through the label it holds, so only a part holding one takes a colour.
const colourLabel = "text[data-swatch]";

const textOf = (element: Element) => element.textContent.trim();

const marksTaken = (part: Element): Mark[] =>
  (Object.keys(changes) as Mark[]).filter(
    (mark) =>
      part.matches(changes[mark].selector) || part.querySelector(changes[mark].selector) !== null,
  );

function writtenContent({ parts, tables, code, colours }: StageNodes): Written {
  return {
    colours,
    parts: parts.map((part) => ({
      name: part.getAttribute("data-part") ?? "",
      takes: marksTaken(part),
      labelled: part.querySelector(colourLabel) !== null,
    })),
    tables: tables.map(({ header, rows }) => ({
      columns: header.map(textOf),
      rows: rows.map((cells) => cells.map(textOf)),
    })),
    code: code.map((lines) =>
      lines.map((line) => ({
        line: Number(line.getAttribute("data-line")),
        text: line.textContent,
      })),
    ),
  };
}

interface ShownCell {
  text: string;
  mark: Mark | undefined;
}

export interface Shown {
  say: string;
  parts: Map<string, Mark>;
  colours: Map<string, number | null>;
  tables: ShownCell[][][];
  rowsFromBody: boolean;
  lines: Map<number, Mark>;
  running: number | undefined;
}

interface StepProblem {
  step: number;
  problem: string;
}

export type Run =
  | { steps: Shown[] }
  | { refused: "threw"; error: unknown }
  | { refused: "not-a-list" }
  | { refused: "no-steps" }
  | { refused: "too-many"; most: number }
  | { refused: "fault"; line: number; fault: MachineFault["fault"] }
  | { refused: "unfit"; problems: MachineProblems["problems"] }
  | { refused: "problems"; problems: StepProblem[] };

// Which control a Stage has, as its page carries it. The input a build gets can't say: a choice
// among several groups hands it named values, as typed input does.
export type Control = "choose" | "input";

// What a build's `steps` takes, by what gives it: one group's option as text, or values by name,
// each of a kind, from several choice groups or from typed fields.
export type Takes = { shape: "option" } | { shape: "groups" | "fields"; values: NamedValue[] };

export interface NamedValue {
  name: string;
  kind: Field["kind"];
}

function stageControl(stage: Element): { control: Control; takes: Takes } {
  const control = stage.getAttribute("data-control") as Control;
  if (control === "choose") {
    const groups = stageGroups(stage);
    return groups.length === 0
      ? { control, takes: { shape: "option" } }
      : {
          control,
          takes: { shape: "groups", values: groups.map(({ name }) => ({ name, kind: "text" })) },
        };
  }
  const values = stageFields(stage).map(({ name, kind }): NamedValue => ({ name, kind }));
  return { control, takes: { shape: "fields", values } };
}

// A Stage with several choice groups names each group on its row; one group goes unnamed, and its
// option reaches the build as text.
interface ChoiceGroup {
  name: string;
  options: HTMLInputElement[];
}

function stageGroups(stage: Element): ChoiceGroup[] {
  return [...stage.querySelectorAll(".stage-choice[data-group]")].map((group) => ({
    name: group.getAttribute("data-group") ?? "",
    options: [...group.querySelectorAll<HTMLInputElement>(".stage-option input")],
  }));
}

// Every combination, one option from each group, in the groups' order and each group's options'
// order, so the first is what the page shows on choosing each group's first option.
function combinations(groups: ChoiceGroup[]): Typed[] {
  return groups.reduce<Typed[]>(
    (chosen, { name, options }) =>
      chosen.flatMap((before) =>
        options.map((option) => ({ ...before, [name]: option.getAttribute("value") ?? "" })),
      ),
    [{}],
  );
}

// A typed field as the Stage defines it on its page, once: the page reads what the owner types by
// it, and the Stage checks its examples and the check types the build by the same definition.
export type Field = NumberField | TextField;

interface NumberField {
  name: string;
  label?: string;
  kind: "number";
  min: number;
  max: number;
}

interface TextField {
  name: string;
  label?: string;
  kind: "text";
  alphabet?: string[];
  minLength: number;
  maxLength: number;
}

function stageFields(stage: Element): Field[] {
  return JSON.parse(
    stage.querySelector(".stage-input")?.getAttribute("data-fields") ?? "[]",
  ) as Field[];
}

// A whole number as the owner types it: digits, with a hyphen or a minus sign before them.
function typedNumber(text: string): number {
  const digits = text.trim().replace(/^−/, "-");
  return /^-?\d+$/.test(digits) ? Number(digits) : Number.NaN;
}

// Text as the owner types it, in NFC, so a symbol is one code point however it was typed. It isn't
// trimmed: a trailing space is part of a hashing build's input.
function typedText(text: string): string {
  return text.normalize("NFC");
}

// A run's name, as the check's failures and `pnpm look` print it: the option, `B`, or the values in
// the order given, `a = 48, b = 18`.
export function runName(input: string | Typed): string {
  return typeof input === "string"
    ? input
    : Object.entries(input)
        .map(([name, value]) => `${name} = ${String(value)}`)
        .join(", ");
}

// Each Stage's step line gets its own ID once a refused field needs to name it.
let refusals = 0;

// A Stage as its page holds it: its control and inputs, the content as written, and the nodes a
// shown step paints. A step's colour reaches a part through `recolour`, so the element can fade it.
export class StageOnPage {
  readonly control: Control;
  readonly takes: Takes;
  readonly written: Written;
  readonly #stage: Element;
  readonly #nodes: StageNodes;
  readonly #recolour: (part: Element, recolour: () => void) => void;
  readonly #asWritten = new Map<Element, Node[]>();
  readonly #rowToCopy: Element | undefined;
  #stepRows: Element[] = [];

  constructor(
    stage: Element,
    recolour: (part: Element, recolour: () => void) => void = (_, change) => {
      change();
    },
  ) {
    this.#stage = stage;
    this.#recolour = recolour;
    this.#nodes = stageNodes(stage);
    this.written = writtenContent(this.#nodes);
    const { control, takes } = stageControl(stage);
    this.control = control;
    this.takes = takes;
    this.#rowToCopy = this.#oneTableRowsAsWritten.at(-1)?.cloneNode(true) as Element | undefined;
    const labels = this.#nodes.parts.flatMap((part) => [...part.querySelectorAll(colourLabel)]);
    const cells = this.#nodes.tables.flatMap(({ rows }) => rows.flat());
    for (const element of [...cells, ...labels]) {
      this.#asWritten.set(
        element,
        [...element.childNodes].map((node) => node.cloneNode(true)),
      );
    }
  }

  // The build's file, from the repo's root.
  get build(): string {
    return (this.#stage.getAttribute("data-build") ?? "").replace(/^\//, "");
  }

  get lang(): Content["lang"] {
    return mainLanguage(this.#stage);
  }

  // What the page offers to run: every option, every combination of one option per group, or
  // every example.
  get inputs(): (string | Typed)[] {
    if (this.takes.shape === "fields") {
      return JSON.parse(
        this.#stage.querySelector(".stage-input")?.getAttribute("data-examples") ?? "[]",
      ) as Typed[];
    }
    if (this.takes.shape === "groups") return combinations(stageGroups(this.#stage));
    return this.options.map((input) => input.getAttribute("value") ?? "");
  }

  get options(): HTMLInputElement[] {
    return [...this.#stage.querySelectorAll<HTMLInputElement>(".stage-option input")];
  }

  get fields(): HTMLInputElement[] {
    return [...this.#stage.querySelectorAll<HTMLInputElement>(".stage-field input")];
  }

  get drawing(): SVGSVGElement | null {
    return this.#stage.querySelector<SVGSVGElement>(".stage-figure svg");
  }

  partsNamed(name: string): SVGGraphicsElement[] {
    return [
      ...(this.drawing?.querySelectorAll<SVGGraphicsElement>(`[data-part="${CSS.escape(name)}"]`) ??
        []),
    ];
  }

  // An example reads as its values in the fields' order, as a choice does in the groups' order.
  name(input: string | Typed): string {
    return runName(
      typeof input === "string" || this.takes.shape === "option"
        ? input
        : (Object.fromEntries(this.takes.values.map(({ name }) => [name, input[name]])) as Typed),
    );
  }

  run(build: Build<string | Typed>, input: string | Typed): Run {
    return runBuild(build, this.control, input, this.written, this.lang);
  }

  // The page renders its controls hidden, so they never show before the element can run a build.
  // Firefox restores a checked option after a reload, but not the run it chose, and `autocomplete`
  // isn't valid on a radio.
  open() {
    for (const option of this.options) option.checked = false;
    for (const field of this.fields) {
      field.value = field.defaultValue;
      field.removeAttribute("aria-invalid");
    }
    this.#part(".stage-controls").hidden = false;
  }

  // With several groups the run waits for every group's choice.
  chosen(): string | Typed | undefined {
    const groups = stageGroups(this.#stage);
    if (groups.length === 0) return this.options.find(({ checked }) => checked)?.value;
    const chosen: Typed = {};
    for (const { name, options } of groups) {
      const option = options.find(({ checked }) => checked);
      if (option === undefined) return undefined;
      chosen[name] = option.value;
    }
    return chosen;
  }

  // What the owner typed, by each field's definition, or the first field whose rule it breaks.
  typed(): { input: Typed } | { refused: HTMLInputElement; field: Field } {
    for (const field of this.fields) {
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-describedby");
    }
    const input: Typed = {};
    for (const field of stageFields(this.#stage)) {
      const typed = this.#part(
        `.stage-field input[name="${CSS.escape(field.name)}"]`,
      ) as HTMLInputElement;
      const value = field.kind === "text" ? typedText(typed.value) : typedNumber(typed.value);
      if (fieldProblem(field, value) !== undefined) return { refused: typed, field };
      input[field.name] = value;
    }
    return { input };
  }

  show(shown: Shown, step: number, count: number, announcement: string) {
    this.#paint(shown);
    this.#part(".stage-counter").hidden = false;
    this.#part(".stage-current").textContent = String(step);
    this.#part(".stage-count").textContent = String(count);
    this.#part(".stage-say").textContent = shown.say;
    this.#part(".stage-announcement").textContent = announcement;
  }

  // A refused field is drawn dashed, and named by the step's line that gives the reason.
  refuse(why: string, field?: HTMLInputElement) {
    this.#paint(undefined);
    this.#part(".stage-counter").hidden = true;
    const say = this.#part(".stage-say");
    say.textContent = why;
    this.#part(".stage-announcement").textContent = why;
    if (field === undefined) return;
    field.setAttribute("aria-invalid", "true");
    say.id ||= `stage-say-${String(++refusals)}`;
    field.setAttribute("aria-describedby", say.id);
  }

  #part(selector: string): HTMLElement {
    const part = this.#stage.querySelector<HTMLElement>(selector);
    if (part === null) throw new Error(`artifact-stage has no ${selector}`);
    return part;
  }

  get #oneTableRowsAsWritten(): Element[] {
    return (this.#nodes.tables[0]?.rows ?? []).flatMap(([cell]) => cell?.parentElement ?? []);
  }

  // A cell whose text the step changes keeps its written nodes beside the step's text, so print
  // can show the content as written from CSS alone, even when `beforeprint` never fires.
  #paint(shown: Shown | undefined) {
    this.#nodes.parts.forEach((part, index) => {
      const { name = "", labelled = false } = this.written.parts[index] ?? {};
      const mark = shown?.parts.get(name);
      if (mark === undefined) part.removeAttribute("data-mark");
      else part.setAttribute("data-mark", mark);
      if (labelled) this.#colour(part, shown?.colours.get(name));
    });
    const lineNumbers = this.written.code.flat().map(({ line }) => line);
    this.#nodes.code.flat().forEach((line, index) => {
      const mark = shown?.lines.get(lineNumbers[index] ?? 0);
      if (mark === undefined) line.removeAttribute("data-mark");
      else line.setAttribute("data-mark", mark);
    });
    const rowsFromBody = shown?.rowsFromBody === true;
    this.#nodes.tables.forEach(({ rows }, table) => {
      rows.forEach((cells, row) => {
        cells.forEach((cell, column) => {
          const written = this.written.tables[table]?.rows[row]?.[column] ?? "";
          const { text, mark } = (rowsFromBody
            ? undefined
            : shown?.tables[table]?.[row]?.[column]) ?? {
            text: written,
            mark: undefined,
          };
          const stepText = cell.querySelector(":scope > .stage-step-text");
          if (text !== written && stepText !== null) stepText.textContent = text;
          else if (text !== written) {
            const asWritten = document.createElement("span");
            asWritten.className = "stage-as-written";
            asWritten.append(...[...cell.childNodes]);
            const replaced = document.createElement("span");
            replaced.className = "stage-step-text";
            replaced.textContent = text;
            cell.replaceChildren(asWritten, replaced);
          } else if (stepText !== null) {
            cell.replaceChildren(
              ...(this.#asWritten.get(cell) ?? []).map((node) => node.cloneNode(true)),
            );
          }
          if (mark === undefined) cell.removeAttribute("data-mark");
          else cell.setAttribute("data-mark", mark);
        });
      });
    });
    this.#rewrite(rowsFromBody ? shown.tables[0] : undefined);
  }

  // The part's colour as written stays in its classes and its label's written text for print, so a
  // step's colour is an attribute the screen's styles paint from, and its name a second text.
  #colour(part: Element, colour: number | null | undefined) {
    const before = part.getAttribute("data-colour");
    const after = colour === undefined ? null : colour === null ? "none" : String(colour);
    if (before === after) return;
    this.#recolour(part, () => {
      if (after === null) part.removeAttribute("data-colour");
      else part.setAttribute("data-colour", after);
    });
    const name =
      colour === undefined || colour === null ? undefined : this.written.colours[colour - 1];
    for (const label of part.querySelectorAll(colourLabel)) {
      const asWritten = (this.#asWritten.get(label) ?? []).map((node) => node.cloneNode(true));
      const writtenName = asWritten
        .map((node) => node.textContent)
        .join("")
        .trim();
      if (name === undefined || name === writtenName) {
        label.replaceChildren(...asWritten);
        continue;
      }
      const ns = "http://www.w3.org/2000/svg";
      const written = document.createElementNS(ns, "tspan");
      written.classList.add("stage-as-written");
      written.append(...asWritten);
      const stepText = document.createElementNS(ns, "tspan");
      stepText.classList.add("stage-step-text");
      stepText.textContent = name;
      label.replaceChildren(written, stepText);
    }
  }

  // The rows as written stay in the table for print, hidden on screen, and each of the step's rows
  // copies the last of them, so it keeps the table's alignment and look.
  #rewrite(rows: Shown["tables"][number] | undefined) {
    for (const row of this.#stepRows) row.remove();
    this.#stepRows = [];
    const written = this.#oneTableRowsAsWritten;
    for (const row of written) row.classList.toggle("stage-as-written", rows !== undefined);
    const rowToCopy = this.#rowToCopy;
    if (rows === undefined || rowToCopy === undefined) return;
    this.#stepRows = rows.map((cells) => {
      const row = rowToCopy.cloneNode(true) as Element;
      row.classList.add("stage-step-row");
      [...row.children].forEach((cell, column) => {
        const mark = cells[column]?.mark;
        cell.textContent = cells[column]?.text ?? "";
        if (mark !== undefined) cell.setAttribute("data-mark", mark);
      });
      return row;
    });
    written.at(-1)?.after(...this.#stepRows);
  }
}

type FieldProblem =
  | { problem: "not-whole" | "out-of-bounds" | "not-text" | "not-nfc" | "too-long" | "too-short" }
  | { problem: "outside-alphabet"; symbol: string };

// The page refuses what the owner types, and the Stage refuses its examples, by the same rule.
// Typed text reaches it in NFC, so only an example can be refused as "not-nfc".
export function fieldProblem(field: Field, value: unknown): FieldProblem | undefined {
  if (field.kind === "text") {
    if (typeof value !== "string") return { problem: "not-text" };
    if (value !== value.normalize("NFC")) return { problem: "not-nfc" };
    const symbols = Array.from(value);
    const outside = symbols.find((symbol) => field.alphabet?.includes(symbol) === false);
    if (outside !== undefined) return { problem: "outside-alphabet", symbol: outside };
    if (symbols.length > field.maxLength) return { problem: "too-long" };
    return symbols.length < field.minLength ? { problem: "too-short" } : undefined;
  }
  if (typeof value !== "number" || !Number.isInteger(value)) return { problem: "not-whole" };
  return value < field.min || value > field.max ? { problem: "out-of-bounds" } : undefined;
}

// Each run gets its own copy, so a build that changes the content it was given changes neither
// the next run's nor what the step applier finds rows and columns in.
function contentAsWritten({ tables, code }: Written, lang: Content["lang"]): Content {
  return {
    lang,
    code: code.map((lines) => lines.map(({ line, text }) => ({ line, text }))),
    tables: tables.map(({ columns, rows }) => ({
      columns: [...columns],
      rows: rows.map((cells) => [...cells]),
    })),
  };
}

// A build is the artifact agent's code, cast or not, so what it returns is checked here, where the
// page and the check both run it.
export function runBuild<Input extends string | Typed>(
  build: Build<Input>,
  control: Control,
  input: Input,
  written: Written,
  lang: Content["lang"],
): Run {
  try {
    const steps: unknown = build.steps(input, contentAsWritten(written, lang));
    if (!Array.isArray(steps)) return { refused: "not-a-list" };
    if (steps.length === 0) return { refused: "no-steps" };
    if (steps.length > mostSteps) return { refused: "too-many", most: mostSteps };
    const shown: Shown[] = [];
    const problems: StepProblem[] = [];
    // With typed input the rows as written are the first example's result, so a step without
    // `body` in a run that rewrites them would show that result mid-run. With `choose` they're the
    // starting state, which a step may show again by leaving `body` out.
    const rewritesRows =
      control === "input" &&
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
    if (error instanceof MachineFault) {
      return { refused: "fault", line: error.line, fault: error.fault };
    }
    if (error instanceof MachineProblems) return { refused: "unfit", problems: error.problems };
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
    colours: colouredParts = {},
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

  const colours = new Map<string, number | null>();
  if (!isRecord(colouredParts)) {
    problems.push("has `colours` that isn't an object of colours by name");
  }
  for (const [name, colour] of Object.entries(isRecord(colouredParts) ? colouredParts : {})) {
    if (colour === undefined) continue;
    const withName = written.parts.filter((part) => part.name === name);
    const named = written.colours.length;
    if (withName.length === 0) {
      problems.push(`colours the part \`${name}\`, which the drawing doesn't have`);
    } else if (!withName.some(({ labelled }) => labelled)) {
      problems.push(
        `colours the part \`${name}\`, which holds no label: put a \`<text data-swatch>\` in its \`<g>\`, empty if it's uncoloured as written`,
      );
    } else if (colour === null) {
      colours.set(name, null);
    } else if (
      typeof colour !== "number" ||
      !Number.isInteger(colour) ||
      colour < 1 ||
      colour > mostSwatches
    ) {
      const given = typeof colour === "number" ? String(colour) : quoted(colour);
      problems.push(
        `colours the part \`${name}\` with ${given}, which isn't a swatch: give a whole number from 1 to ${String(mostSwatches)}, or \`null\` for uncoloured`,
      );
    } else if (colour > named) {
      problems.push(
        `colours the part \`${name}\` with ${String(colour)}, past the ${String(named)} colours \`colours\` names: add its name to \`colours\`, or use 1 to ${String(named)}`,
      );
    } else colours.set(name, colour);
  }

  const parts = new Map<string, Mark>();
  for (const [name, mark] of marked("parts", markedParts)) {
    const withName = written.parts.filter((part) => part.name === name);
    if (withName.length === 0) {
      problems.push(`marks the part \`${name}\`, which the drawing doesn't have`);
    } else if (
      typeof colours.get(name) !== "number" &&
      !withName.some(({ takes }) => takes.includes(mark))
    ) {
      problems.push(
        `marks the part \`${name}\` \`${mark}\`, which changes nothing in it: \`${mark}\` acts on ${changes[mark].actsOn}`,
      );
    } else parts.set(name, mark);
  }

  const lines = new Map<number, Mark>();
  let running: number | undefined;
  const lineMarks = marked("lines", markedLines);
  const [lineNumbers, ...otherBlocks] = written.code.map((lines) => lines.map(({ line }) => line));
  if (lineMarks.length > 0 && (lineNumbers === undefined || otherBlocks.length > 0)) {
    const blocks =
      lineNumbers === undefined ? "no code block" : `${String(written.code.length)} code blocks`;
    problems.push(
      `has \`lines\`, but the Stage holds ${blocks}: \`lines\` marks the lines of exactly one`,
    );
  } else if (lineNumbers !== undefined) {
    const [first, last] = [String(lineNumbers[0]), String(lineNumbers.at(-1))];
    const range = first === last ? `only line ${first}` : `lines ${first} to ${last}`;
    for (const [name, mark] of lineMarks) {
      if (lineNumbers.map(String).includes(name)) lines.set(Number(name), mark);
      else
        problems.push(`marks the line \`${name}\`, which the code doesn't have: it has ${range}`);
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
    : { shown: { say, parts, colours, tables, rowsFromBody, lines, running } };
}
