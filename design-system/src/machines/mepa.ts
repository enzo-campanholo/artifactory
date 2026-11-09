/**
 * MEPA, the stack machine Pascal-like languages compile to in Kowaltowski's textbook: the program
 * counter `i`, the stack top `s`, the display `D` and the memory `M`. Trace it in a Stage with
 * `input` whose content is the listing, a registers table and a memory table, with a build of a
 * few lines. This one works out a trapezoid's area, (a + b) × h div 2, in pt-BR, laid out as a
 * compiler lays out a program: a jump over the subroutines to the main program's start, and a
 * function, área(bases, altura), that the main program calls with a + b and h:
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
 * DSVS L1       ; salta a função
 * L2: ENPR 1    ; área(bases, altura)
 * CRVL 1,-5
 * CRVL 1,-4
 * MULT
 * CRCT 2
 * DIVI
 * ARMZ 1,-6     ; o valor de retorno
 * RTPR 1,2
 * L1: NADA
 * LEIT
 * ARMZ 0,0
 * LEIT
 * ARMZ 0,1
 * LEIT
 * ARMZ 0,2
 * AMEM 1        ; o valor de retorno
 * CRVL 0,0
 * CRVL 0,1
 * SOMA
 * CRVL 0,2
 * CHPR L2,1
 * IMPR
 * DMEM 3
 * PARA
 * FIM
 * ```
 *
 * | Registrador | Valor |
 * | ----------- | ----: |
 * | i           |    26 |
 * | s           |    −1 |
 * | D[0]        |     0 |
 * | D[1]        |     ? |
 * | entrada     |     — |
 * | saída       |    16 |
 *
 * | Célula | Dado | Papel | Desl. | Topo |
 * | ------ | ---: | ----- | ----: | ---- |
 * | M[0]   |    3 |       |       |      |
 * | M[1]   |    5 |       |       |      |
 * | M[2]   |    4 |       |       |      |
 * | M[3]   |   16 |       |       |      |
 * | M[4]   |    8 |       |       |      |
 * | M[5]   |    4 |       |       |      |
 * | M[6]   |   24 |       |       |      |
 * | M[7]   |    1 |       |       |      |
 * | M[8]   |    ? |       |       |      |
 * | M[9]   |   16 |       |       |      |
 * | M[10]  |    2 |       |       |      |
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
 *   labels: { L1: "o início do programa principal", L2: "o início de área" },
 *   subroutines: { L2: { params: ["bases", "altura"], returns: true } },
 *   roles: {
 *     1: ["base a", "base b", "altura h"],
 *     8: "a área",
 *     18: ["valor de retorno"],
 *     21: "parâmetro bases",
 *     22: "parâmetro altura",
 *   },
 *   after: { 25: "As variáveis a, b e h estão liberadas." },
 * });
 * ```
 *
 * The tables as written are what the first example's last step leaves, as for any Stage with
 * `input`: `PARA` keeps `i` on its own line, 26; `RTPR` gave `D[1]` back the value `ENPR` kept in
 * M[8], none; every cell is above `s`, so none shows a role, an offset or `← s`; and M[3] to M[10]
 * keep the last values the stack held there.
 *
 * **The listing** is the Stage's one code block, fenced ` ```text start=0 `, so address k is the
 * line the page shows as k: never type the addresses into it. Each line is an optional label
 * (`L1:`, a name of letters, digits and `_`, naming that line's address), an instruction with its
 * arguments and an optional `; comment`, and the last line is `FIM`:
 *
 * - `INPP` starts the program: `s` gets −1 and `D[0]` 0.
 * - `AMEM n` reserves n cells on the stack, and `DMEM n` frees n.
 * - `LEIT` reads the next field, in the order `reads` names them, onto the stack.
 * - `ARMZ k,n` stores the top in `M[D[k] + n]` and pops it; `CRVL k,n` pushes a copy of it. n may
 *   be negative: `CRVL 1,-5` reads a subroutine's parameter.
 * - `CRCT c` pushes the constant c.
 * - `SOMA`, `MULT` and `DIVI` replace the two cells at the top with their sum, product or quotient
 *   (`DIVI` drops the remainder, as Pascal's `div`).
 * - `DSVS L` jumps: `i` gets the address of the line labelled `L`. MEPA has no conditional jump
 *   yet, so a jump back to an earlier line repeats forever and runs past the Stage's 200 steps.
 * - `NADA` does nothing: it marks a place, usually labelled, for a jump to land on.
 * - `CHPR L,k` calls the subroutine at the label `L`, of level k: it pushes the return address,
 *   the next line's, and k, and jumps to `L`.
 * - `ENPR k` enters level k: it pushes `D[k]` and points `D[k]` at the next cell, the record's
 *   base, offset 0. The caller's arguments sit below the base, the last at −4, and a return value
 *   the caller reserved below the first.
 * - `RTPR k,n` returns from a subroutine with n parameters: `D[k]` gets back the value `ENPR`
 *   pushed, `i` the return address, and `s` drops by n + 3, leaving the return value on top.
 * - `IMPR` pops the top onto the output, and `PARA` stops the machine.
 *
 * **Failures**, each a `stage-run` failure of `pnpm check`. A listing the machine can't read is
 * refused, naming the line: an instruction MEPA doesn't have ("`PUSH 3` isn't a MEPA
 * instruction"), wrong arguments ("`CRVL 0` isn't `CRVL k,n`, with 2 whole numbers", "`DSVS 3`
 * isn't `DSVS L`, with a label"), a jump or call to a label no line has ("`DSVS L9` jumps to the
 * label `L9`, which the listing doesn't have: it has `L1`", "`CHPR L9,1` calls the label `L9`, …"),
 * a label on two lines ("the label `L1` is already on line 1"), a label with no instruction after
 * it, a fence without `start=0`, `FIM` anywhere but on the last line, and a Stage with no code block
 * or more than one. So is a `roles` or `after` note keyed to an address the listing doesn't have, a
 * `labels` note naming a label no line has ("`labels` names the label `L2`, which the listing
 * doesn't have: it has `L1`"), and a `subroutines` note on a label no `CHPR` calls ("`subroutines`
 * names the label `L2`, which no `CHPR` calls: the listing calls `L1`"). A run is refused, naming
 * the line, when it divides by zero, reads with no field left, drops the stack below its bottom,
 * runs before `INPP` sets `s`, reads a cell or `D[k]` with no value, returns to a cell with no
 * value, reaches a cell below `M[0]`, or reaches `FIM`. A table without a column the view writes
 * into fails as any Stage's does; only `Papel` (`Role`) and `Desl.` (`Offset`) may be left out.
 *
 * **The registers table** has the rows `i`, `s`, `D[0]` and every other `D[k]` an `ARMZ`, `CRVL`,
 * `ENPR` or `RTPR` names, then the input yet to be read and the output, each listing its values in
 * order, `—` when empty. Its headers and the last two rows' names follow the artifact's main
 * language. In pt-BR, as the example's, and in English, after the same run:
 *
 * | Register | Value |
 * | -------- | ----: |
 * | i        |    26 |
 * | s        |    −1 |
 * | D[0]     |     0 |
 * | D[1]     |     ? |
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
 * `Papel` (`Role`) and `Desl.` (`Offset`) are optional: leave one out and the view doesn't write
 * it. `Desl.` shows each cell of a subroutine's record its offset from the record's base, from its
 * return value and parameters, as `subroutines` gives them, up to the top: −6 for área's return
 * value, −5 and −4 for its parameters, −3 for the return address, −2 for the level, −1 for the
 * kept `D[k]`, then 0 up for its locals. A record holds its cells from its `ENPR` to its `RTPR`,
 * and the topmost record holding a cell gives its offset; a cell outside every record shows none.
 * A cell above `s` is `muted` and shows no role or offset, `← s` marks the top, and a cell with no
 * value shows `?`. The cells each step writes are `strong`, even when one already held that value.
 *
 * **The lines:** the instruction that ran is `reversed`, and the one `i` points at next is
 * `dashed` until the machine stops.
 *
 * **Notes**, besides `reads`, in the artifact's language: `labels`, by label, the place each label
 * names (`L1: "o início de main"`), said beside the label when a jump lands there ("Desvia para L1,
 * o início de main: i recebe 3."), when a call goes there ("Chama L2, o início de div: …") and when
 * the run passes its `NADA` ("Passa por L1, o início de main, e não faz nada."); a label without
 * one is said alone. `subroutines`, by the label `CHPR` calls, the subroutine's parameters, first
 * to last, and whether it returns a value (`L2: { params: ["a", "b"], returns: true }`): they give
 * `Desl.` its offsets, and `ENPR` says where each parameter and the return value sit ("Os
 * parâmetros a e b estão em M[3] e M[4], nos deslocamentos menos 5 e menos 4."), as `RTPR` says
 * the value it leaves on top. `roles`, by address, the role of the cell that instruction writes
 * (`11: "lido"`), or for an `AMEM n` a list of n roles, one per cell it reserves
 * (`1: ["x, global", "y, global"]`), and for a `CHPR` a list of 2. A cell an `ARMZ` writes keeps
 * its role unless the note gives one. Without one, `CHPR`'s cells are the return address and the
 * level ("endereço de retorno", "nível 1") and `ENPR`'s the kept display ("D[1] guardado"), and any
 * other write has no role. `after`, by address, a sentence added to that instruction's step
 * (`14: "As globais x e y estão liberadas."`).
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
  | { op: "ARMZ" | "CRVL" | "RTPR"; k: number; n: number }
  | { op: "ENPR"; k: number }
  | { op: "DSVS"; label: string; to: number }
  | { op: "CHPR"; label: string; to: number; level: number };

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
  CHPR: ["L", "k"],
  ENPR: ["k"],
  RTPR: ["k", "n"],
};

interface Subroutine {
  params: readonly string[];
  returns: boolean;
}

interface Notes {
  labels?: Readonly<Record<string, string>>;
  subroutines?: Readonly<Record<string, Subroutine>>;
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
  offsetColumn: boolean;
  notes: Notes;
}

// A subroutine's activation: the label `CHPR` called and, once its `ENPR` has run, the record's
// base, the `D[k]` its offsets count from.
interface Call {
  label: string;
  base: number | undefined;
}

interface State {
  program: Program;
  i: number;
  s: number | undefined;
  D: (number | undefined)[];
  M: (number | undefined)[];
  roles: string[];
  calls: Call[];
  input: (number | undefined)[];
  output: number[];
  ran: number | undefined;
  // A write of the value a cell already held changes no text, so the view marks it itself.
  wrote: number[];
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
    offset: "Desl.",
    top: "Topo",
  },
  en: {
    value: "Value",
    input: "input",
    output: "output",
    cell: "Cell",
    data: "Data",
    role: "Role",
    offset: "Offset",
    top: "Top",
  },
};

interface Written {
  cell: string;
  value: string;
}

const plural = (count: number, one: string, many: string) =>
  `${String(count)} ${count === 1 ? one : many}`;

const joined = (items: readonly string[], and: string) =>
  items.length < 2
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} ${and} ${String(items.at(-1))}`;

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
    calls: (place: string, back: Written, level: Written, s: string, i: string) =>
      `Chama ${place}: ${back.cell} recebe ${back.value}, o endereço de retorno, ${level.cell} recebe ${level.value}, o nível, s recebe ${s} e i recebe ${i}.`,
    enters: (
      place: string | undefined,
      k: number,
      s: string,
      kept: { cell: string; value: string | undefined },
      base: string,
    ) =>
      `Entra ${place === undefined ? "" : `em ${place}, `}no nível ${String(k)}: s recebe ${s}, ${kept.cell} guarda D[${String(k)}], ${kept.value === undefined ? "ainda sem valor" : `que é ${kept.value}`}, e D[${String(k)}] recebe ${base}.`,
    params: (names: string[], cells: string[], offsets: string[]) =>
      names.length === 1
        ? `O parâmetro ${joined(names, "e")} está em ${joined(cells, "e")}, no deslocamento ${joined(offsets, "e")}.`
        : `Os parâmetros ${joined(names, "e")} estão em ${joined(cells, "e")}, nos deslocamentos ${joined(offsets, "e")}.`,
    returnsIn: (cell: string, offset: string) =>
      `O valor de retorno vai em ${cell}, no deslocamento ${offset}.`,
    returns: (k: number, restored: string | undefined, i: string, s: string) =>
      `Retorna: ${restored === undefined ? `D[${String(k)}] volta a não ter valor` : `D[${String(k)}] recebe ${restored}`}, i recebe ${i} e s recebe ${s}.`,
    returned: (value: string, cell: string) =>
      `O valor de retorno, ${value}, fica no topo, em ${cell}.`,
    returnAddress: "endereço de retorno",
    level: (k: string) => `nível ${k}`,
    kept: (k: number) => `D[${String(k)}] guardado`,
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
    calls: (place: string, back: Written, level: Written, s: string, i: string) =>
      `Calls ${place}: ${back.cell} gets ${back.value}, the return address, ${level.cell} gets ${level.value}, the level, s gets ${s} and i gets ${i}.`,
    enters: (
      place: string | undefined,
      k: number,
      s: string,
      kept: { cell: string; value: string | undefined },
      base: string,
    ) =>
      `Enters ${place === undefined ? "" : `${place}, `}at level ${String(k)}: s gets ${s}, ${kept.cell} keeps D[${String(k)}], ${kept.value === undefined ? "which has no value yet" : `which is ${kept.value}`}, and D[${String(k)}] gets ${base}.`,
    params: (names: string[], cells: string[], offsets: string[]) =>
      names.length === 1
        ? `The parameter ${joined(names, "and")} is in ${joined(cells, "and")}, at offset ${joined(offsets, "and")}.`
        : `The parameters ${joined(names, "and")} are in ${joined(cells, "and")}, at offsets ${joined(offsets, "and")}.`,
    returnsIn: (cell: string, offset: string) =>
      `The return value goes in ${cell}, at offset ${offset}.`,
    returns: (k: number, restored: string | undefined, i: string, s: string) =>
      `Returns: ${restored === undefined ? `D[${String(k)}] has no value again` : `D[${String(k)}] gets ${restored}`}, i gets ${i} and s gets ${s}.`,
    returned: (value: string, cell: string) =>
      `The return value, ${value}, is left on top, in ${cell}.`,
    returnAddress: "return address",
    level: (k: string) => `level ${k}`,
    kept: (k: number) => `saved D[${String(k)}]`,
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
  if (op === "DSVS" || op === "CHPR") {
    const [target = "", level = "0"] = args;
    const to = labels.get(target);
    if (to === undefined) {
      return `\`${written}\` ${op === "DSVS" ? "jumps to" : "calls"} the label \`${target}\`, which the listing doesn't have: ${listedLabels(labels)}`;
    }
    return op === "DSVS"
      ? { op, label: target, to }
      : { op, label: target, to, level: Number(level) };
  }
  const [k = 0, n = 0] = args.map(Number);
  if (op === "ARMZ" || op === "CRVL" || op === "RTPR") return { op, k, n };
  if (op === "ENPR") return { op, k };
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
  const called = new Set(lines.flatMap(({ read }) => (read.op === "CHPR" ? [read.label] : [])));
  for (const label of Object.keys(notes.subroutines ?? {})) {
    if (called.has(label)) continue;
    const calls =
      called.size === 0
        ? "the listing calls no label"
        : `the listing calls ${[...called].map((name) => `\`${name}\``).join(", ")}`;
    problems.push({
      line: undefined,
      problem: `\`subroutines\` names the label \`${label}\`, which no \`CHPR\` calls: ${calls}`,
    });
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
      offsetColumn: memory?.columns.includes(headers[content.lang].offset) ?? false,
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
    calls: [],
    input,
    output: [],
    ran: undefined,
    wrote: [],
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
    calls: [...state.calls],
    input: [...state.input],
    output: [...state.output],
    ran: i,
    wrote: [],
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
    next.wrote = [s + 1];
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
      next.wrote = [to];
      if (role !== undefined) next.roles[to] = roleOf(0);
      return moved(say.stores(cellName(to), spoken(value), spoken(next.s)));
    }
    case "IMPR": {
      const values = popped(1);
      if (!Array.isArray(values)) return fault(values);
      next.output.push(...values);
      return moved(say.writes(spoken(values[0]), spoken(next.s)));
    }
    case "CHPR": {
      next.M[s + 1] = i + 1;
      next.M[s + 2] = read.level;
      next.roles[s + 1] = role === undefined ? say.returnAddress : roleOf(0);
      next.roles[s + 2] = role === undefined ? say.level(shownNumber(read.level)) : roleOf(1);
      next.wrote = [s + 1, s + 2];
      next.s = s + 2;
      next.i = read.to;
      next.calls.push({ label: read.label, base: undefined });
      return moved(
        say.calls(
          placed(read.label, name(read.label)),
          { cell: cellName(s + 1), value: spoken(i + 1) },
          { cell: cellName(s + 2), value: spoken(read.level) },
          spoken(s + 2),
          spoken(read.to),
        ),
      );
    }
    case "ENPR": {
      const kept = state.D[read.k];
      const base = s + 2;
      next.M[s + 1] = kept;
      next.roles[s + 1] = role === undefined ? say.kept(read.k) : roleOf(0);
      next.wrote = [s + 1];
      next.s = s + 1;
      next.D[read.k] = base;
      const call = next.calls.at(-1);
      const entered = call?.base === undefined ? call : undefined;
      if (entered !== undefined) next.calls[next.calls.length - 1] = { ...entered, base };
      const subroutine =
        entered === undefined ? undefined : program.notes.subroutines?.[entered.label];
      const sentences = [
        say.enters(
          entered === undefined ? undefined : placed(entered.label, name(entered.label)),
          read.k,
          spoken(s + 1),
          { cell: cellName(s + 1), value: kept === undefined ? undefined : spoken(kept) },
          spoken(base),
        ),
      ];
      if (subroutine !== undefined) {
        const { params, returns } = subroutine;
        const offsets = params.map((_, at) => at - params.length - 3);
        if (params.length > 0) {
          sentences.push(
            say.params(
              [...params],
              offsets.map((offset) => cellName(base + offset)),
              offsets.map((offset) => spoken(offset)),
            ),
          );
        }
        const returnOffset = -params.length - 4;
        if (returns) {
          sentences.push(say.returnsIn(cellName(base + returnOffset), spoken(returnOffset)));
        }
      }
      return moved(sentences.join(" "));
    }
    case "RTPR": {
      const after = s - (read.n + 3);
      if (after < -1) return fault(faults.belowBottom);
      const back = state.M[s - 2];
      if (back === undefined) return fault(faults.noValue(cellName(s - 2)));
      const restored = state.M[s];
      next.D[read.k] = restored;
      next.i = back;
      next.s = after;
      const call = next.calls.pop();
      const returned =
        call?.base !== undefined && program.notes.subroutines?.[call.label]?.returns === true;
      const sentence = say.returns(
        read.k,
        restored === undefined ? undefined : spoken(restored),
        spoken(back),
        spoken(after),
      );
      return moved(
        returned ? `${sentence} ${say.returned(spoken(next.M[after]), cellName(after))}` : sentence,
      );
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
      next.wrote = [s - 1];
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

// Each cell's offset in the topmost record that holds it: a record runs from its return value, or
// its first parameter, up to the stack top, and a call's record holds the arguments its caller
// pushed. Without a `subroutines` entry, it starts at the return address, 3 below its base.
function recordOffsets({ program, calls }: State, top: number): (number | undefined)[] {
  const offsets: (number | undefined)[] = [];
  for (const { label, base } of calls) {
    if (base === undefined) continue;
    const subroutine = program.notes.subroutines?.[label];
    const below =
      subroutine === undefined ? 3 : subroutine.params.length + 3 + (subroutine.returns ? 1 : 0);
    for (let address = base - below; address <= top; address++) {
      offsets[address] = address - base;
    }
  }
  return offsets;
}

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
  const offsets = recordOffsets(state, top);
  for (let address = 0; address < Math.max(program.cells, top + 1); address++) {
    const row = cellName(address);
    const mark: Mark | undefined = address > top ? "muted" : undefined;
    const offset = offsets[address];
    const columns: [string, string][] = [
      [named.cell, row],
      [named.data, shownNumber(state.M[address])],
      ...(program.roleColumn
        ? [[named.role, mark === undefined ? (state.roles[address] ?? "") : ""] as [string, string]]
        : []),
      ...(program.offsetColumn
        ? [
            [
              named.offset,
              mark === undefined && offset !== undefined ? shownNumber(offset) : "",
            ] as [string, string],
          ]
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
          (column === named.data && state.wrote.includes(address)
            ? ("strong" as const)
            : undefined),
      })),
    );
  }
  return { lines, cells };
}

const mepa: Machine<Program, State, Notes> = { parse, start, step, view };

export default mepa;
