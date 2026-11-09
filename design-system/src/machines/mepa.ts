/**
 * MEPA, the stack machine Pascal-like languages compile to in Kowaltowski's textbook: the program
 * counter `i`, the stack top `s`, the display `D` and the memory `M`. Trace it in a Stage with
 * `input` whose content is the listing, a registers table and a memory table, with a build of a
 * few lines. This one works out a trapezoid's area, (a + b) × h div 2, in pt-BR, laid out as a
 * compiler lays out a program: a jump over the subroutines, none here, to the main program's start:
 *
 * ````mdx
 * <Stage
 *   build="trapezio"
 *   input={{
 *     label: "Área do trapézio",
 *     fields: [
 *       { name: "a", min: 0, max: 20 },
 *       { name: "b", min: 0, max: 20 },
 *       { name: "h", min: 0, max: 20 },
 *     ],
 *     examples: [{ a: 3, b: 5, h: 4 }, { a: 2, b: 3, h: 3 }],
 *   }}
 *   prompt="Digite as bases e a altura e rode o programa."
 *   caption="A área do trapézio na MEPA, uma instrução por passo."
 * >
 *
 * ```text start=0
 * INPP
 * AMEM 3        ; a, b, h
 * DSVS L1       ; salta os procedimentos
 * L1: NADA
 * LEIT
 * ARMZ 0,0
 * LEIT
 * ARMZ 0,1
 * LEIT
 * ARMZ 0,2
 * CRVL 0,0
 * CRVL 0,1
 * SOMA
 * CRVL 0,2
 * MULT
 * CRCT 2
 * DIVI
 * IMPR
 * DMEM 3
 * PARA
 * FIM
 * ```
 *
 * | Registrador | Valor |
 * | ----------- | ----: |
 * | i           |    19 |
 * | s           |    −1 |
 * | D[0]        |     0 |
 * | entrada     |     — |
 * | saída       |    16 |
 *
 * | Célula | Dado | Papel | Topo |
 * | ------ | ---: | ----- | ---- |
 * | M[0]   |    3 |       |      |
 * | M[1]   |    5 |       |      |
 * | M[2]   |    4 |       |      |
 * | M[3]   |   16 |       |      |
 * | M[4]   |    2 |       |      |
 *
 * </Stage>
 * ````
 *
 * ```ts
 * // trapezio.build.ts
 * import { trace } from "@artifactory/design-system/stage-build";
 * import mepa from "@artifactory/design-system/machines/mepa";
 *
 * export default trace(mepa, {
 *   reads: ["a", "b", "h"],
 *   labels: { L1: "o início do programa principal" },
 *   roles: { 1: ["base a", "base b", "altura h"], 4: "lido", 12: "a mais b", 16: "a área" },
 *   after: { 18: "As variáveis a, b e h estão liberadas." },
 * });
 * ```
 *
 * The tables as written are what the first example's last step leaves, as for any Stage with
 * `input`: `PARA` keeps `i` on its own line, 19; every cell is above `s`, so none shows a role or
 * `← s`; and M[3] and M[4] keep the last values the stack held there.
 *
 * **The listing** is the Stage's one code block, fenced ` ```text start=0 `, so address k is the
 * line the page shows as k: never type the addresses into it. Each line is an optional label
 * (`L1:`, a name of letters, digits and `_`, naming that line's address), an instruction with its
 * arguments and an optional `; comment`, and the last line is `FIM`:
 *
 * - `INPP` starts the program: `s` gets −1 and `D[0]` 0.
 * - `AMEM n` reserves n cells on the stack, and `DMEM n` frees n.
 * - `LEIT` reads the next field, in the order `reads` names them, onto the stack.
 * - `ARMZ k,n` stores the top in `M[D[k] + n]` and pops it; `CRVL k,n` pushes a copy of it.
 * - `CRCT c` pushes the constant c.
 * - `SOMA`, `MULT` and `DIVI` replace the two cells at the top with their sum, product or quotient
 *   (`DIVI` drops the remainder, as Pascal's `div`).
 * - `DSVS L` jumps: `i` gets the address of the line labelled `L`. MEPA has no conditional jump
 *   yet, so a jump back to an earlier line repeats forever and runs past the Stage's 200 steps.
 * - `NADA` does nothing: it marks a place, usually labelled, for a jump to land on.
 * - `IMPR` pops the top onto the output, and `PARA` stops the machine.
 *
 * **Failures**, each a `stage-run` failure of `pnpm check`. A listing the machine can't read is
 * refused, naming the line: an instruction MEPA doesn't have ("`PUSH 3` isn't a MEPA
 * instruction"), wrong arguments ("`CRVL 0` isn't `CRVL k,n`, with 2 whole numbers", "`DSVS 3`
 * isn't `DSVS L`, with a label"), a jump to a label no line has ("`DSVS L9` jumps to the label
 * `L9`, which the listing doesn't have: it has `L1`"), a label on two lines ("the label `L1` is
 * already on line 1"), a label with no instruction after it, a fence without `start=0`, `FIM`
 * anywhere but on the last line, and a Stage with no code block or more than one. So is a `roles`
 * or `after` note keyed to an address the listing doesn't have, and a `labels` note naming a label
 * no line has ("`labels` names the label `L2`, which the listing doesn't have: it has `L1`"). A run
 * is refused, naming the line, when it divides by zero, reads with no field left, drops the stack
 * below its bottom, runs before `INPP` sets `s`, reads a cell or `D[k]` with no value, reaches a
 * cell below `M[0]`, or reaches `FIM`. A table without a column the view writes into fails as any
 * Stage's does; only `Papel` (`Role`) and `Desl.` (`Offset`) may be left out.
 *
 * **The registers table** has the rows `i`, `s`, `D[0]` and every other `D[k]` the listing names,
 * then the input yet to be read and the output, each listing its values in order, `—` when empty.
 * Its headers and the last two rows' names follow the artifact's main language. In pt-BR, as the
 * example's, and in English, after the same run:
 *
 * | Register | Value |
 * | -------- | ----: |
 * | i        |    17 |
 * | s        |    −1 |
 * | D[0]     |     0 |
 * | input    |     — |
 * | output   |    16 |
 *
 * **The memory table** has `Célula` (`Cell`) as its first column and a row per cell, `M[0]` up to
 * the highest cell the run reaches, in any order, so a run that reaches a row the table lacks
 * fails. Its columns are `Célula | Dado | Papel | Desl. | Topo` in pt-BR, and in English:
 *
 * | Cell | Data | Role | Offset | Top |
 * | ---- | ---: | ---- | -----: | --- |
 * | M[0] |    3 |      |        |     |
 *
 * `Papel` (`Role`) and `Desl.` (`Offset`) are optional: leave `Papel` out and no role is shown, and
 * `Desl.`, for the offsets in a subroutine's record, is kept as written. A cell above `s` is
 * `muted` and shows no role, `← s` marks the top, and a cell with no value shows `?`. The cell
 * each step writes is `strong`, even when it already held that value.
 *
 * **The lines:** the instruction that ran is `reversed`, and the one `i` points at next is
 * `dashed` until the machine stops.
 *
 * **Notes**, besides `reads`, in the artifact's language: `labels`, by label, the place each label
 * names (`L1: "o início de main"`), said beside the label when a jump lands there ("Desvia para L1,
 * o início de main: i recebe 3.") and when the run passes its `NADA` ("Passa por L1, o início de
 * main, e não faz nada."); a label without one is said alone. `roles`, by address, the role of the
 * cell that instruction writes (`11: "lido"`), or for an `AMEM n` a list of n roles, one per cell
 * it reserves (`1: ["x, global", "y, global"]`). A cell an `ARMZ` writes keeps its role unless the
 * note gives one; any other write without one has no role. `after`, by address, a sentence added to
 * that instruction's step (`14: "As globais x e y estão liberadas."`).
 */
import {
  shownNumber,
  spokenNumber,
  type Language,
  type Machine,
  type Moved,
  type Parsed,
  type Problem,
  type Said,
  type View,
} from "../machine.ts";
import type { CellChange, Content, Mark } from "../stage-build.ts";

type Instruction =
  | { op: "INPP" | "LEIT" | "SOMA" | "MULT" | "DIVI" | "IMPR" | "NADA" | "PARA" | "FIM" }
  | { op: "AMEM" | "DMEM" | "CRCT"; n: number }
  | { op: "ARMZ" | "CRVL"; k: number; n: number }
  | { op: "DSVS"; label: string; to: number };

// Each operand by the name its shape gives it: `L` is a label, any other a whole number.
const operands: Record<Instruction["op"], readonly string[]> = {
  INPP: [],
  LEIT: [],
  SOMA: [],
  MULT: [],
  DIVI: [],
  IMPR: [],
  NADA: [],
  PARA: [],
  FIM: [],
  AMEM: ["n"],
  DMEM: ["n"],
  CRCT: ["n"],
  ARMZ: ["k", "n"],
  CRVL: ["k", "n"],
  DSVS: ["L"],
};

interface Notes {
  labels?: Readonly<Record<string, string>>;
  roles?: Readonly<Record<number, string | readonly string[]>>;
  after?: Readonly<Record<number, string>>;
}

interface Line {
  label: string | undefined;
  read: Instruction;
}

interface Program {
  lang: Language;
  listing: Line[];
  displays: number[];
  cells: number;
  roleColumn: boolean;
  notes: Notes;
}

interface State {
  program: Program;
  i: number;
  s: number | undefined;
  D: (number | undefined)[];
  M: (number | undefined)[];
  roles: string[];
  input: (number | undefined)[];
  output: number[];
  ran: number | undefined;
  // A write of the value a cell already held changes no text, so the view marks it itself.
  wrote: number | undefined;
  halted: boolean;
}

const headers = {
  "pt-BR": {
    value: "Valor",
    input: "entrada",
    output: "saída",
    cell: "Célula",
    data: "Dado",
    role: "Papel",
    top: "Topo",
  },
  en: {
    value: "Value",
    input: "input",
    output: "output",
    cell: "Cell",
    data: "Data",
    role: "Role",
    top: "Top",
  },
};

const plural = (count: number, one: string, many: string) =>
  `${String(count)} ${count === 1 ? one : many}`;

// A label is said with its place name when the `labels` note gives one: "L1, o início de main".
const placed = (label: string, name: string | undefined) =>
  name === undefined ? label : `${label}, ${name}`;

const words = {
  "pt-BR": {
    starts: (s: string) => `O programa começa: s recebe ${s} e D[0] recebe 0.`,
    reserves: (n: number, s: string) => `Reserva ${plural(n, "célula", "células")}: s recebe ${s}.`,
    frees: (n: number, s: string) => `Libera ${plural(n, "célula", "células")}: s recebe ${s}.`,
    reads: (value: string, s: string, cell: string) =>
      `Lê ${value} da entrada: s recebe ${s} e ${cell} recebe ${value}.`,
    stores: (cell: string, value: string, s: string) =>
      `${cell} recebe ${value}, do topo, e s recebe ${s}.`,
    loads: (s: string, cell: string, value: string, from: string) =>
      `s recebe ${s} e ${cell} recebe ${value}, o valor de ${from}.`,
    constant: (s: string, cell: string, value: string) =>
      `s recebe ${s} e ${cell} recebe a constante ${value}.`,
    sum: (a: string, b: string) => `${a} mais ${b}`,
    product: (a: string, b: string) => `${a} vezes ${b}`,
    quotient: (a: string, b: string) => `o quociente de ${a} por ${b}`,
    computes: (cell: string, operation: string, value: string, s: string) =>
      `${cell} recebe ${operation}, que é ${value}, e s recebe ${s}.`,
    writes: (value: string, s: string) => `Escreve ${value} na saída: s recebe ${s}.`,
    jumps: (label: string, name: string | undefined, i: string) =>
      `Desvia para ${placed(label, name)}: i recebe ${i}.`,
    passes: (label: string | undefined, name: string | undefined) =>
      label === undefined
        ? "Não faz nada."
        : `Passa por ${placed(label, name)}${name === undefined ? "" : ","} e não faz nada.`,
    stops: "O programa para.",
  },
  en: {
    starts: (s: string) => `The program starts: s gets ${s} and D[0] gets 0.`,
    reserves: (n: number, s: string) => `Reserves ${plural(n, "cell", "cells")}: s gets ${s}.`,
    frees: (n: number, s: string) => `Frees ${plural(n, "cell", "cells")}: s gets ${s}.`,
    reads: (value: string, s: string, cell: string) =>
      `Reads ${value} from the input: s gets ${s} and ${cell} gets ${value}.`,
    stores: (cell: string, value: string, s: string) =>
      `${cell} gets ${value} from the top, and s gets ${s}.`,
    loads: (s: string, cell: string, value: string, from: string) =>
      `s gets ${s} and ${cell} gets ${value}, the value of ${from}.`,
    constant: (s: string, cell: string, value: string) =>
      `s gets ${s} and ${cell} gets the constant ${value}.`,
    sum: (a: string, b: string) => `${a} plus ${b}`,
    product: (a: string, b: string) => `${a} times ${b}`,
    quotient: (a: string, b: string) => `the quotient of ${a} by ${b}`,
    computes: (cell: string, operation: string, value: string, s: string) =>
      `${cell} gets ${operation}, which is ${value}, and s gets ${s}.`,
    writes: (value: string, s: string) => `Writes ${value} to the output: s gets ${s}.`,
    jumps: (label: string, name: string | undefined, i: string) =>
      `Jumps to ${placed(label, name)}: i gets ${i}.`,
    passes: (label: string | undefined, name: string | undefined) =>
      label === undefined
        ? "Does nothing."
        : `Passes ${placed(label, name)}${name === undefined ? "" : ","} and does nothing.`,
    stops: "The program stops.",
  },
};

const faults = {
  divisionByZero: { "pt-BR": "divisão por zero", en: "division by zero" },
  noInput: { "pt-BR": "não há mais entrada para ler", en: "no input is left to read" },
  belowBottom: {
    "pt-BR": "a pilha desceria abaixo do fundo",
    en: "the stack would drop below its bottom",
  },
  notStarted: {
    "pt-BR": "s ainda não tem valor: o programa começa com INPP",
    en: "s has no value yet: a program starts with INPP",
  },
  noValue: (name: string): Said => ({
    "pt-BR": `${name} não tem valor`,
    en: `${name} has no value`,
  }),
  noCell: (name: string): Said => ({
    "pt-BR": `${name} não existe`,
    en: `${name} doesn't exist`,
  }),
  noPara: {
    "pt-BR": "o programa chega a FIM sem PARA",
    en: "the program reaches FIM without PARA",
  },
};

const isOp = (text: string): text is Instruction["op"] => Object.hasOwn(operands, text);

const labelName = /^[A-Za-z_]\w*$/;

// A line as written, without its comment: its label, if it has one, and its instruction.
function split(text: string): { label: string | undefined; written: string } {
  const written = text.replace(/;.*$/, "").trim();
  const [, label, rest = ""] = /^([A-Za-z_]\w*):\s*(.*)$/.exec(written) ?? [];
  return label === undefined ? { label, written } : { label, written: rest };
}

const listedLabels = (labels: ReadonlyMap<string, number>) =>
  labels.size === 0
    ? "it has no labels"
    : `it has ${[...labels.keys()].map((label) => `\`${label}\``).join(", ")}`;

function instruction(
  written: string,
  label: string | undefined,
  labels: ReadonlyMap<string, number>,
): Instruction | string {
  const [op = "", ...rest] = written.split(/\s+/);
  if (op === "" && label !== undefined) {
    return `\`${label}:\` labels no instruction: write one after it, as \`${label}: NADA\``;
  }
  if (!isOp(op)) return `\`${written}\` isn't a MEPA instruction`;
  const args = rest.join("").split(",").filter(Boolean);
  const names = operands[op];
  const fits =
    args.length === names.length &&
    names.every((name, at) => (name === "L" ? labelName : /^-?\d+$/).test(args[at] ?? ""));
  if (!fits) {
    const wholes = names.filter((name) => name !== "L").length;
    const kinds = [
      ...(names.includes("L") ? ["a label"] : []),
      ...(wholes > 0 || names.length === 0
        ? [plural(wholes, "whole number", "whole numbers")]
        : []),
    ];
    const shape = names.length === 0 ? op : `${op} ${names.join(",")}`;
    return `\`${written}\` isn't \`${shape}\`, with ${kinds.join(" and ")}`;
  }
  if (op === "DSVS") {
    const [target = ""] = args;
    const to = labels.get(target);
    if (to === undefined) {
      return `\`${written}\` jumps to the label \`${target}\`, which the listing doesn't have: ${listedLabels(labels)}`;
    }
    return { op, label: target, to };
  }
  const [k = 0, n = 0] = args.map(Number);
  if (op === "ARMZ" || op === "CRVL") return { op, k, n };
  if (op === "AMEM" || op === "DMEM" || op === "CRCT") return { op, n: k };
  return { op };
}

function parse(content: Content, notes: Notes): Parsed<Program> {
  const [listing, ...others] = content.code;
  if (listing === undefined || others.length > 0) {
    return {
      problems: [
        { line: undefined, problem: "the Stage holds the MEPA listing as its one code block" },
      ],
    };
  }
  const problems: Problem[] = [];
  if (listing[0]?.line !== 0) {
    problems.push({
      line: listing[0]?.line ?? 1,
      problem: "the listing starts at address 0: fence it ` ```text start=0 `",
    });
  }
  const written = listing.map(({ line, text }) => ({ line, ...split(text) }));
  const labels = new Map<string, number>();
  written.forEach(({ line, label }, address) => {
    if (label === undefined) return;
    const first = labels.get(label);
    if (first === undefined) labels.set(label, address);
    else {
      problems.push({
        line,
        problem: `the label \`${label}\` is already on line ${String(listing[first]?.line)}: give each line its own`,
      });
    }
  });
  const lines: Line[] = [];
  written.forEach(({ line, label, written: text }, address) => {
    const read = instruction(text, label, labels);
    if (typeof read === "string") {
      problems.push({ line, problem: read });
      return;
    }
    lines.push({ label, read });
    const last = address === listing.length - 1;
    if ((read.op === "FIM") !== last) {
      problems.push({
        line,
        problem: last
          ? "the listing ends with `FIM`"
          : "`FIM` goes only on the listing's last line",
      });
    }
  });
  for (const label of Object.keys(notes.labels ?? {})) {
    if (labels.has(label)) continue;
    problems.push({
      line: undefined,
      problem: `\`labels\` names the label \`${label}\`, which the listing doesn't have: ${listedLabels(labels)}`,
    });
  }
  const addresses = `it has addresses 0 to ${String(listing.length - 1)}`;
  for (const [name, keyed] of [
    ["roles", notes.roles],
    ["after", notes.after],
  ] as const) {
    for (const key of Object.keys(keyed ?? {})) {
      if (Object.hasOwn(listing, key)) continue;
      problems.push({
        line: undefined,
        problem: `\`${name}\` names the address ${key}, which the listing doesn't have: ${addresses}`,
      });
    }
  }
  if (problems.length > 0) return { problems };
  const memory = content.tables.find(({ columns }) => columns[0] === headers[content.lang].cell);
  return {
    program: {
      lang: content.lang,
      listing: lines,
      displays: [
        ...new Set([0, ...lines.flatMap(({ read }) => ("k" in read ? [read.k] : []))]),
      ].sort((a, b) => a - b),
      cells: memory?.rows.length ?? 0,
      roleColumn: memory?.columns.includes(headers[content.lang].role) ?? false,
      notes,
    },
  };
}

function start(program: Program, input: number[]): State {
  return {
    program,
    i: 0,
    s: undefined,
    D: [],
    M: [],
    roles: [],
    input,
    output: [],
    ran: undefined,
    wrote: undefined,
    halted: false,
  };
}

const cellName = (address: number) => `M[${shownNumber(address)}]`;

function step(state: State): Moved<State> {
  const { program, i } = state;
  const { label, read } = program.listing[i] ?? { label: undefined, read: { op: "FIM" } };
  const say = words[program.lang];
  const spoken = (value: number | undefined) => spokenNumber(value, program.lang);
  const fault = (said: Said) => ({ fault: { line: i, fault: said } });
  const next: State = {
    ...state,
    i: i + 1,
    D: [...state.D],
    M: [...state.M],
    roles: [...state.roles],
    input: [...state.input],
    output: [...state.output],
    ran: i,
    wrote: undefined,
  };
  const role = program.notes.roles?.[i];
  const roleOf = (at: number) => (typeof role === "string" ? role : (role?.[at] ?? ""));
  const moved = (sentence: string, halted = false) => {
    const after = program.notes.after?.[i];
    return {
      state: { ...next, halted },
      say: after === undefined ? sentence : `${sentence} ${after}`,
      halted,
    };
  };

  if (read.op === "INPP") {
    next.s = -1;
    next.D[0] = 0;
    return moved(say.starts(spoken(-1)));
  }
  if (read.op === "PARA") {
    next.i = i;
    return moved(say.stops, true);
  }
  const name = (label: string) => program.notes.labels?.[label];
  if (read.op === "DSVS") {
    next.i = read.to;
    return moved(say.jumps(read.label, name(read.label), spoken(read.to)));
  }
  if (read.op === "NADA") {
    return moved(say.passes(label, label === undefined ? undefined : name(label)));
  }
  if (read.op === "FIM") return fault(faults.noPara);
  const s = state.s;
  if (s === undefined) return fault(faults.notStarted);

  // Pops `count` cells, each with a value, or gives the fault that stops the run.
  const popped = (count: number): number[] | Said => {
    if (s - count < -1) return faults.belowBottom;
    const values = Array.from({ length: count }, (_, at) => next.M[s - count + 1 + at]);
    const missing = values.findIndex((value) => value === undefined);
    if (missing >= 0) return faults.noValue(cellName(s - count + 1 + missing));
    next.s = s - count;
    return values as number[];
  };
  const push = (value: number, cellRole: string) => {
    next.s = s + 1;
    next.M[s + 1] = value;
    next.wrote = s + 1;
    next.roles[s + 1] = cellRole;
  };
  const address = (k: number, n: number): number | Said => {
    const base = state.D[k];
    if (base === undefined) return faults.noValue(`D[${String(k)}]`);
    return base + n < 0 ? faults.noCell(cellName(base + n)) : base + n;
  };

  switch (read.op) {
    case "AMEM": {
      for (let at = 0; at < read.n; at++) next.roles[s + 1 + at] = roleOf(at);
      next.s = s + read.n;
      return moved(say.reserves(read.n, spoken(next.s)));
    }
    case "DMEM": {
      if (s - read.n < -1) return fault(faults.belowBottom);
      next.s = s - read.n;
      return moved(say.frees(read.n, spoken(next.s)));
    }
    case "LEIT": {
      const [value, ...rest] = next.input;
      if (value === undefined) return fault(faults.noInput);
      next.input = rest;
      push(value, roleOf(0));
      return moved(say.reads(spoken(value), spoken(s + 1), cellName(s + 1)));
    }
    case "CRCT": {
      push(read.n, roleOf(0));
      return moved(say.constant(spoken(s + 1), cellName(s + 1), spoken(read.n)));
    }
    case "CRVL": {
      const from = address(read.k, read.n);
      if (typeof from !== "number") return fault(from);
      const value = state.M[from];
      if (value === undefined) return fault(faults.noValue(cellName(from)));
      push(value, roleOf(0));
      return moved(say.loads(spoken(s + 1), cellName(s + 1), spoken(value), cellName(from)));
    }
    case "ARMZ": {
      const to = address(read.k, read.n);
      if (typeof to !== "number") return fault(to);
      const values = popped(1);
      if (!Array.isArray(values)) return fault(values);
      const [value = 0] = values;
      next.M[to] = value;
      next.wrote = to;
      if (role !== undefined) next.roles[to] = roleOf(0);
      return moved(say.stores(cellName(to), spoken(value), spoken(next.s)));
    }
    case "IMPR": {
      const values = popped(1);
      if (!Array.isArray(values)) return fault(values);
      next.output.push(...values);
      return moved(say.writes(spoken(values[0]), spoken(next.s)));
    }
    case "SOMA":
    case "MULT":
    case "DIVI": {
      const values = popped(2);
      if (!Array.isArray(values)) return fault(values);
      const [a = 0, b = 0] = values;
      if (read.op === "DIVI" && b === 0) return fault(faults.divisionByZero);
      const [operation, value] =
        read.op === "SOMA"
          ? [say.sum, a + b]
          : read.op === "MULT"
            ? [say.product, a * b]
            : [say.quotient, Math.trunc(a / b)];
      next.M[s - 1] = value;
      next.wrote = s - 1;
      next.roles[s - 1] = roleOf(0);
      next.s = s - 1;
      return moved(
        say.computes(
          cellName(s - 1),
          operation(spoken(a), spoken(b)),
          spoken(value),
          spoken(s - 1),
        ),
      );
    }
  }
}

const listed = (values: (number | undefined)[]) =>
  values.length === 0 ? "—" : values.map(shownNumber).join(", ");

function view(state: State): View {
  const { program, s } = state;
  const named = headers[program.lang];
  const lines: Record<number, Mark> = {};
  if (state.ran !== undefined) lines[state.ran] = "reversed";
  if (!state.halted && state.i !== state.ran) lines[state.i] = "dashed";
  const registers: [string, string][] = [
    ["i", shownNumber(state.i)],
    ["s", shownNumber(s)],
    ...program.displays.map((k): [string, string] => [`D[${String(k)}]`, shownNumber(state.D[k])]),
    [named.input, listed(state.input)],
    [named.output, listed(state.output)],
  ];
  const cells: CellChange[] = registers.map(([row, text]) => ({
    row,
    column: named.value,
    text,
  }));
  const top = s ?? -1;
  for (let address = 0; address < Math.max(program.cells, top + 1); address++) {
    const row = cellName(address);
    const mark: Mark | undefined = address > top ? "muted" : undefined;
    const columns: [string, string][] = [
      [named.cell, row],
      [named.data, shownNumber(state.M[address])],
      ...(program.roleColumn
        ? [[named.role, mark === undefined ? (state.roles[address] ?? "") : ""] as [string, string]]
        : []),
      [named.top, address === s ? "← s" : ""],
    ];
    cells.push(
      ...columns.map(([column, text]) => ({
        row,
        column,
        text,
        mark:
          mark ??
          (column === named.data && state.wrote === address ? ("strong" as const) : undefined),
      })),
    );
  }
  return { lines, cells };
}

const mepa: Machine<Program, State, Notes> = { parse, start, step, view };

export default mepa;
