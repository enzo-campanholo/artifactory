/**
 * MEPA, the stack machine Pascal-like languages compile to in Kowaltowski's textbook: the program
 * counter `i`, the stack top `s`, the display `D` and the memory `M`. Trace it with
 * `export default trace(mepa, { reads: ["x", "y"], … })` from `stage-build`, in a Stage with
 * `input`.
 *
 * **The listing** is the Stage's one code block, fenced ` ```text start=0 `, so address k is the
 * line the page shows as k: never type the addresses into it. Each line is an instruction with its
 * arguments and an optional `; comment`, and the last line is `FIM`:
 *
 * - `INPP` starts the program: `s` gets −1 and `D[0]` 0.
 * - `AMEM n` reserves n cells on the stack, and `DMEM n` frees n.
 * - `LEIT` reads the next field, in the order `reads` names them, onto the stack.
 * - `ARMZ k,n` stores the top in `M[D[k] + n]` and pops it; `CRVL k,n` pushes a copy of it.
 * - `CRCT c` pushes the constant c.
 * - `SOMA`, `MULT` and `DIVI` replace the two cells at the top with their sum, product or quotient
 *   (`DIVI` drops the remainder, as Pascal's `div`).
 * - `IMPR` pops the top onto the output, and `PARA` stops the machine.
 *
 * A run that divides by zero, reads with no field left, drops the stack below its bottom, reads a
 * cell with no value or reaches `FIM` is refused, naming the line.
 *
 * **The registers table** has the rows `i`, `s`, `D[0]` and every other `D[k]` the listing names,
 * then the input yet to be read and the output, listed in order, `—` when empty. In pt-BR:
 *
 * | Registrador | Valor |
 * | ----------- | ----: |
 * | i           |    15 |
 * | s           |    −1 |
 * | D[0]        |     0 |
 * | entrada     |     — |
 * | saída       |    −1 |
 *
 * and in English `| Register | Value |`, with the rows `input` and `output` in place of `entrada` and
 * `saída`.
 *
 * **The memory table** has a row per cell, `M[0]` up to as many as the run reaches, in any order:
 *
 * | Célula | Dado | Papel | Topo |
 * | ------ | ---: | ----- | ---- |
 * | M[0]   |   −4 |       |      |
 *
 * and in English `| Cell | Data | Role | Top |`. `Papel` (`Role`) is optional: leave it out and no
 * role is shown. `Desl.` (`Offset`), for the offsets in a subroutine's record, is kept as written.
 * A cell above `s` is `muted` and shows no role, `← s` marks the top, and a cell with no value
 * shows `?`. The cell each step writes is `strong`, even when it already held that value.
 *
 * **The lines:** the instruction that ran is `reversed`, and the one `i` points at next is
 * `dashed` until the machine stops.
 *
 * **Notes**, besides `reads`, in the artifact's language: `roles`, by address, the role of the
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
  type Said,
  type View,
} from "../machine.ts";
import type { CellChange, Content, Mark } from "../stage-build.ts";

type Instruction =
  | { op: "INPP" | "LEIT" | "SOMA" | "MULT" | "DIVI" | "IMPR" | "PARA" | "FIM" }
  | { op: "AMEM" | "DMEM" | "CRCT"; n: number }
  | { op: "ARMZ" | "CRVL"; k: number; n: number };

const arity: Record<Instruction["op"], number> = {
  INPP: 0,
  LEIT: 0,
  SOMA: 0,
  MULT: 0,
  DIVI: 0,
  IMPR: 0,
  PARA: 0,
  FIM: 0,
  AMEM: 1,
  DMEM: 1,
  CRCT: 1,
  ARMZ: 2,
  CRVL: 2,
};

interface Notes {
  roles?: Readonly<Record<number, string | readonly string[]>>;
  after?: Readonly<Record<number, string>>;
}

interface Program {
  lang: Language;
  listing: Instruction[];
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

const isOp = (text: string): text is Instruction["op"] => Object.hasOwn(arity, text);

function instruction(text: string): Instruction | string {
  const written = text.replace(/;.*$/, "").trim();
  const [op = "", ...rest] = written.split(/\s+/);
  if (!isOp(op)) return `\`${written}\` isn't a MEPA instruction`;
  const args = rest.join("").split(",").filter(Boolean);
  const count = arity[op];
  const numbers = args.map((arg) => (/^-?\d+$/.test(arg) ? Number(arg) : Number.NaN));
  if (numbers.length !== count || numbers.some(Number.isNaN)) {
    const shape = ["", " n", " k,n"][count] ?? "";
    return `\`${written}\` isn't \`${op}${shape}\`, with ${plural(count, "whole number", "whole numbers")}`;
  }
  const [k = 0, n = 0] = numbers;
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
  const problems: { line: number; problem: string }[] = [];
  const instructions: Instruction[] = [];
  if (listing[0]?.line !== 0) {
    problems.push({
      line: listing[0]?.line ?? 1,
      problem: "the listing starts at address 0: fence it ` ```text start=0 `",
    });
  }
  listing.forEach(({ line, text }, address) => {
    const read = instruction(text);
    if (typeof read === "string") problems.push({ line, problem: read });
    else instructions.push(read);
    const last = address === listing.length - 1;
    if (typeof read !== "string" && (read.op === "FIM") !== last) {
      problems.push({
        line,
        problem: last
          ? "the listing ends with `FIM`"
          : "`FIM` goes only on the listing's last line",
      });
    }
  });
  if (problems.length > 0) return { problems };
  const memory = content.tables.find(({ columns }) => columns[0] === headers[content.lang].cell);
  return {
    program: {
      lang: content.lang,
      listing: instructions,
      displays: [
        ...new Set([0, ...instructions.flatMap((read) => ("k" in read ? [read.k] : []))]),
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
  const read = program.listing[i] ?? { op: "FIM" };
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
