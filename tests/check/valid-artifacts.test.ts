import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { parseFrontmatter } from "astro/markdown";
import { Window } from "happy-dom";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  checkTimeout,
  commitArtifacts,
  createFixtureRepo,
  headCommit,
  succeeds,
  type CheckRun,
  type CommandRun,
  type FixtureRepo,
} from "./fixture-repo.ts";

function artifact(frontmatter: string[], body: string[]): string {
  return ["---", ...frontmatter, "---", "", ...body, ""].join("\n");
}

function fields(id: string, title: string, subject: string, ...rest: string[]): string[] {
  return [
    `id: ${id}`,
    `title: ${title}`,
    `subject: ${subject}`,
    "lang: pt-BR",
    "published: 2026-10-15",
    ...rest,
  ];
}

const listing = [
  "const a = 1;",
  "const b = 2;",
  "const sum = a + b;",
  "// the product",
  "const product = a * b;",
  "console.log(sum, product);",
  "export { sum };",
];

const mathAndCode = {
  "artifacts/movimento-uniforme/index.mdx": artifact(
    fields("m0v1ment", "Movimento uniforme", "Mecânica"),
    [
      'import Stepper from "@artifactory/design-system/stepper";',
      "",
      "A velocidade média é $v_{\\text{média}} = \\frac{\\Delta s}{\\Delta t}$ e a entrada custa R\\$ 5.",
      "",
      "$$",
      "\\text{área} = \\pi r^2",
      "$$",
      "",
      "```python",
      "def area(r):",
      "    return 3.14 * r ** 2",
      "```",
      "",
      "```text start=0",
      "push 2",
      "add",
      "```",
      "",
      "```text start=10",
      "push 3",
      "print",
      "```",
      "",
      "```ts {3, 5-6}",
      ...listing,
      "```",
      "",
      "```ts",
      ...listing,
      "```",
      "",
      "```text start=0 {0}",
      "push 2",
      "push 3",
      "add",
      "```",
      "",
      '<Stepper lines={["0", "1-"]}>',
      "",
      "```text start=0",
      "push 2",
      "push 3",
      "add",
      "print",
      "```",
      "",
      "</Stepper>",
      "",
      '<Stepper captions={["Empilha.", "Soma.", "Imprime."]}>',
      "",
      "```text start=0",
      "push 2",
      "push 3",
      "```",
      "",
      "```pascal {2}",
      "x := 2;",
      "x := x + 3;",
      "writeln(x);",
      "```",
      "",
      "```ts",
      "console.log(2 + 3);",
      "```",
      "",
      "</Stepper>",
      "",
      "| t (s) | x (m) |",
      "| ----- | ----- |",
      "|     0 |     2 |",
    ],
  ),
  "artifacts/uniform-motion/index.mdx": artifact(
    [
      "id: un1f0rm1",
      "title: Uniform motion",
      "subject: Mecânica",
      "lang: en",
      "published: 2026-10-15",
    ],
    [
      "| t (s) | x (m) |",
      "| ----- | ----- |",
      "|     0 |     2 |",
      "",
      "| v (m/s) |",
      "| ------- |",
      "|       3 |",
    ],
  ),
};

const threeStepChain = "início -> meio -> fim\n";

const twoByTwoPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==",
  "base64",
);

const diagramsAndFigures = {
  "artifacts/celula/index.mdx": artifact(fields("c3lu1a01", "A célula", "Biologia"), [
    'import Diagram from "@artifactory/design-system/diagram";',
    'import Figure from "@artifactory/design-system/figure";',
    'import fluxo from "./fluxo.d2";',
    'import copia from "./copia.d2";',
    'import emElk from "./em-elk.d2";',
    'import emDagre from "./em-dagre.d2";',
    'import organelas from "./organelas.d2";',
    'import celula from "./celula.svg?raw";',
    "",
    '<Diagram src={fluxo} alt="Fluxo" />',
    "",
    '<Diagram src={copia} alt="Cópia do fluxo" />',
    "",
    '<Diagram src={emElk} alt="Fluxo em ELK" />',
    "",
    '<Diagram src={emDagre} alt="Fluxo em dagre" />',
    "",
    '<Diagram src={organelas} alt="O núcleo transcreve para o citoplasma" />',
    "",
    '<Figure src={celula} alt="Uma célula com núcleo" />',
    "",
    "![Uma foto](./foto.png)",
  ]),
  "artifacts/celula/fluxo.d2": threeStepChain,
  "artifacts/celula/copia.d2": threeStepChain,
  "artifacts/celula/em-elk.d2": `vars: { d2-config: { layout-engine: elk } }\n${threeStepChain}`,
  "artifacts/celula/em-dagre.d2": `vars: { d2-config: { layout-engine: dagre } }\n${threeStepChain}`,
  "artifacts/celula/organelas.d2": "célula: {\n  núcleo -> citoplasma: transcrição\n}\n",
  "artifacts/celula/celula.svg": [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80">',
    "  <title>Célula</title>",
    '  <ellipse cx="60" cy="40" rx="55" ry="35" class="fill-tint stroke-accent" />',
    '  <circle cx="60" cy="40" r="12" class="fill-accent" />',
    "</svg>",
    "",
  ].join("\n"),
  "artifacts/celula/foto.png": twoByTwoPng,
};

// D2 embeds each label face as a WOFF font, whose tables may be zlib-compressed. Offsets are from
// the WOFF 1.0 and OpenType specifications.
const woff = { tableCount: 12, directory: 44, directoryEntry: 20 };
const nameTable = { count: 2, stringsOffset: 4, records: 6, record: 12, windowsPlatform: 3 };
const typographicFamily = 16;
const family = 1;
const os2 = { weightClass: 4, fsSelection: 62, italicBit: 1 };

function woffTables(font: Buffer): Map<string, Buffer> {
  const tables = new Map<string, Buffer>();
  for (let index = 0; index < font.readUInt16BE(woff.tableCount); index++) {
    const entry = woff.directory + woff.directoryEntry * index;
    const offset = font.readUInt32BE(entry + 4);
    const compressed = font.subarray(offset, offset + font.readUInt32BE(entry + 8));
    const length = font.readUInt32BE(entry + 12);
    tables.set(
      font.toString("latin1", entry, entry + 4),
      compressed.length < length ? inflateSync(compressed) : compressed,
    );
  }
  return tables;
}

function table(tables: Map<string, Buffer>, tag: string): Buffer {
  const found = tables.get(tag);
  if (found === undefined) throw new Error(`the diagram font has no ${tag} table`);
  return found;
}

function familyName(name: Buffer): string {
  const strings = name.readUInt16BE(nameTable.stringsOffset);
  const end = nameTable.records + nameTable.record * name.readUInt16BE(nameTable.count);
  const windowsName = (id: number) => {
    for (let record = nameTable.records; record < end; record += nameTable.record) {
      const platform = name.readUInt16BE(record);
      if (platform !== nameTable.windowsPlatform || name.readUInt16BE(record + 6) !== id) continue;
      const start = strings + name.readUInt16BE(record + 10);
      const text = Buffer.from(name.subarray(start, start + name.readUInt16BE(record + 8)));
      return text.swap16().toString("utf16le");
    }
    return undefined;
  };
  return windowsName(typographicFamily) ?? windowsName(family) ?? "";
}

function diagramFaces(page: string): string[] {
  const faces = [...page.matchAll(/data:application\/font-woff;base64,([\w+/=]+)/g)].map(
    ([, data = ""]) => {
      const tables = woffTables(Buffer.from(data, "base64"));
      const metrics = table(tables, "OS/2");
      const weight = String(metrics.readUInt16BE(os2.weightClass));
      const italic = (metrics.readUInt16BE(os2.fsSelection) & os2.italicBit) !== 0 ? " italic" : "";
      return `${familyName(table(tables, "name"))} ${weight}${italic}`;
    },
  );
  return [...new Set(faces)].sort();
}

const stage = {
  "artifacts/arvore-geradora/index.mdx": artifact(fields("4rv0r3g1", "Árvore geradora", "Grafos"), [
    'import Stage from "@artifactory/design-system/stage";',
    'import triangulo from "./triangulo.svg?raw";',
    "",
    "Escolha um vértice.",
    "",
    "<Stage",
    '  build="prim"',
    '  choose={{ label: "Começar em", options: ["A", "B", "C"] }}',
    '  prompt="Escolha um vértice para começar."',
    "  figure={triangulo}",
    '  alt="Um triângulo de vértices A, B e C, com arestas de pesos 1, 2 e 3."',
    '  caption="O algoritmo de Prim a partir do vértice escolhido."',
    ">",
    "",
    "| Vértice | Chave | Pai |",
    "| ------- | ----: | --- |",
    "| A       |     ∞ | —   |",
    "| B       |     ∞ | —   |",
    "| C       |     ∞ | —   |",
    "",
    "</Stage>",
  ]),
  "artifacts/arvore-geradora/triangulo.svg": [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120">',
    '  <g data-part="A-B"><line x1="20" y1="100" x2="100" y2="20" class="stroke-text" /></g>',
    '  <g data-part="B-C"><line x1="100" y1="20" x2="180" y2="100" class="stroke-text" /></g>',
    '  <g data-part="A-C"><line x1="20" y1="100" x2="180" y2="100" class="stroke-text" /></g>',
    '  <g data-part="A"><circle cx="20" cy="100" r="12" class="fill-surface stroke-text" /></g>',
    '  <g data-part="B"><circle cx="100" cy="20" r="12" class="fill-surface stroke-text" /></g>',
    '  <g data-part="C"><circle cx="180" cy="100" r="12" class="fill-surface stroke-text" /></g>',
    "</svg>",
    "",
  ].join("\n"),
  "artifacts/arvore-geradora/prim.build.ts": [
    'import { defineBuild, type Step } from "@artifactory/design-system/stage-build";',
    "",
    "const vertices = ['A', 'B', 'C'];",
    "const order: Record<string, string[]> = { A: ['A', 'B', 'C'], B: ['B', 'A', 'C'], C: ['C', 'B', 'A'] };",
    "",
    "export default defineBuild({",
    "  steps(start) {",
    "    const entered: string[] = [];",
    "    return (order[start] ?? vertices).map((vertex): Step => {",
    "      entered.push(vertex);",
    "      return {",
    "        say: `Entra ${vertex} na árvore de Prim.`,",
    "        parts: { [vertex]: 'reversed', 'A-B': entered.length > 1 ? 'strong' : 'dashed' },",
    "        rows: { [vertex]: 'reversed' },",
    "        cells: [{ row: vertex, column: 'Chave', text: '0', mark: 'strong' }],",
    "      };",
    "    });",
    "  },",
    "});",
    "",
  ].join("\n"),
};

const secondStage = {
  "artifacts/caminho-minimo/index.mdx": artifact(fields("c4m1nh0s", "Caminho mínimo", "Grafos"), [
    'import Stage from "@artifactory/design-system/stage";',
    "",
    "<Stage",
    '  build="dijkstra"',
    '  choose={{ label: "Sair de", options: ["P", "Q"] }}',
    '  prompt="Escolha de onde sair."',
    ">",
    "",
    "| Vértice | Distância |",
    "| ------- | --------: |",
    "| P       |         ∞ |",
    "| Q       |         ∞ |",
    "",
    "</Stage>",
  ]),
  "artifacts/caminho-minimo/dijkstra.build.ts": [
    'import { defineBuild } from "@artifactory/design-system/stage-build";',
    "",
    "export default defineBuild({",
    "  steps: (start) => [",
    "    { say: `Sai de ${start} pelo caminho mais curto.`, rows: { [start]: 'reversed' } },",
    "  ],",
    "});",
    "",
  ].join("\n"),
};

const typedStage = {
  "artifacts/maximo-divisor/index.mdx": artifact(fields("mdc48i18", "Máximo divisor", "Cálculo"), [
    'import Stage from "@artifactory/design-system/stage";',
    "",
    "<Stage",
    '  build="mdc"',
    "  input={{",
    '    label: "Calcular mdc(a, b)",',
    "    fields: [",
    '      { name: "a", min: 1, max: 9999 },',
    '      { name: "b", label: "o divisor b", min: 0, max: 9999 },',
    "    ],",
    "    examples: [{ a: 48, b: 18 }, { a: 18, b: 48 }, { a: 7, b: 0 }, { a: 9999, b: 0 }],",
    "  }}",
    '  prompt="Digite dois números e comece."',
    '  caption="O algoritmo de Euclides, linha por linha."',
    ">",
    "",
    "```python",
    "def mdc(a, b):",
    "    while b != 0:",
    "        a, b = b, a % b",
    "    return a",
    "```",
    "",
    "| Variável | Valor |",
    "| -------- | ----: |",
    "| a        |     6 |",
    "| b        |     0 |",
    "",
    "</Stage>",
  ]),
  // `COMPONENTS.md`'s Stage entry shows this build, as written here, so the reference's own passes.
  "artifacts/maximo-divisor/mdc.build.ts": [
    'import { defineBuild, type CellChange, type Step } from "@artifactory/design-system/stage-build";',
    "",
    "export default defineBuild<{ a: number; b: number }>({",
    "  steps(input) {",
    "    let { a, b } = input;",
    '    const values = (mark?: "strong"): CellChange[] => [',
    '      { row: "a", column: "Valor", text: String(a), mark },',
    '      { row: "b", column: "Valor", text: String(b), mark },',
    "    ];",
    "    const steps: Step[] = [",
    "      {",
    "        say: `mdc recebe a valendo ${String(a)} e b valendo ${String(b)}.`,",
    '        lines: { 1: "reversed" },',
    '        cells: values("strong"),',
    "      },",
    "    ];",
    "    while (b !== 0) {",
    "      steps.push({",
    "        say: `b vale ${String(b)}, não zero: o laço roda.`,",
    '        lines: { 2: "reversed" },',
    "        cells: values(),",
    "      });",
    "      const say = `a passa a ${String(b)} e b ao resto de ${String(a)} por ${String(b)}, ${String(a % b)}.`;",
    "      [a, b] = [b, a % b];",
    '      steps.push({ say, lines: { 3: "reversed" }, cells: values("strong") });',
    "    }",
    '    steps.push({ say: "b vale 0: o laço acaba.", lines: { 2: "reversed" }, cells: values() });',
    "    steps.push({",
    "      say: `Devolve a: o mdc é ${String(a)}.`,",
    '      lines: { 4: "reversed" },',
    '      rows: { a: "reversed" },',
    "      cells: values(),",
    "    });",
    "    return steps;",
    "  },",
    "});",
    "",
  ].join("\n"),
};

const rewrittenStage = {
  "artifacts/teste-de-mesa/index.mdx": artifact(fields("f4t0r14l", "Teste de mesa", "Cálculo"), [
    'import Stage from "@artifactory/design-system/stage";',
    "",
    "<Stage",
    '  build="fatorial"',
    "  input={{",
    '    label: "Calcular fatorial(n)",',
    '    fields: [{ name: "n", min: 0, max: 12 }],',
    "    examples: [{ n: 4 }, { n: 0 }, { n: 12 }],",
    "  }}",
    '  prompt="Digite um número e comece."',
    '  caption="O teste de mesa de fatorial(n), uma linha por passagem do laço."',
    ">",
    "",
    "```python",
    "def fatorial(n):",
    "    f = 1",
    "    while n > 1:",
    "        f = f * n",
    "        n = n - 1",
    "    return f",
    "```",
    "",
    "| Passagem |  n |  f |",
    "| -------- | -: | -: |",
    "| início   |  4 |  1 |",
    "| 1        |  3 |  4 |",
    "| 2        |  2 | 12 |",
    "| 3        |  1 | 24 |",
    "",
    "</Stage>",
  ]),
  // `COMPONENTS.md`'s Stage entry shows this build, as written here, so the reference's own passes.
  "artifacts/teste-de-mesa/fatorial.build.ts": [
    'import { defineBuild, type Step } from "@artifactory/design-system/stage-build";',
    "",
    "export default defineBuild<{ n: number }>({",
    "  steps(input) {",
    "    let { n } = input;",
    "    let f = 1;",
    '    let row = "início";',
    "    const body = [[row, String(n), String(f)]];",
    "    const steps: Step[] = [];",
    '    const step = (line: number, say: string, wrote?: "n" | "f") => {',
    "      steps.push({",
    "        say,",
    '        lines: { [line]: "reversed" },',
    "        // A copy: the loop goes on changing `body` after this step.",
    "        body: body.map((cells) => [...cells]),",
    '        cells: wrote === undefined ? [] : [{ row, column: wrote, mark: "strong" }],',
    "      });",
    "    };",
    '    step(2, `f começa em 1, e n vale ${String(n)}.`, "f");',
    "    while (n > 1) {",
    "      step(3, `n vale ${String(n)}, mais que 1: o laço roda.`);",
    "      const was = f;",
    "      f = f * n;",
    "      row = String(body.length);",
    "      const cells = [row, String(n), String(f)];",
    "      body.push(cells);",
    '      step(4, `f passa a ${String(f)}, ${String(was)} vezes ${String(n)}.`, "f");',
    "      n = n - 1;",
    "      cells[1] = String(n);",
    '      step(5, `n passa a ${String(n)}.`, "n");',
    "    }",
    "    step(3, `n vale ${String(n)}, não mais que 1: o laço acaba.`);",
    "    steps.push({",
    "      say: `Devolve f: o fatorial é ${String(f)}.`,",
    '      lines: { 6: "reversed" },',
    "      body,",
    '      rows: { [row]: "reversed" },',
    "    });",
    "    return steps;",
    "  },",
    "});",
    "",
  ].join("\n"),
};

// "aabba" has two b's, so the automaton ends in q0 and accepts it. The second Stage opens on the
// empty word, which it reads as ε, with no symbol read.
const wordStage = {
  "artifacts/automato-par/index.mdx": artifact(fields("aut0mat0", "Autômato par", "Cálculo"), [
    'import Stage from "@artifactory/design-system/stage";',
    "",
    "<Stage",
    '  build="automato"',
    "  input={{",
    '    label: "Aceita w?",',
    '    fields: [{ name: "w", kind: "text", alphabet: ["a", "b"], maxLength: 12 }],',
    '    examples: [{ w: "aabba" }, { w: "" }, { w: "bbbb" }, { w: "b" }],',
    "  }}",
    '  prompt="Digite uma palavra e comece."',
    '  caption="Um autômato que aceita as palavras com um número par de b."',
    ">",
    "",
    "| Variável | Valor |",
    "| -------- | ----- |",
    "| lido     | aabba |",
    "| estado   | q0    |",
    "| aceita   | sim   |",
    "",
    "</Stage>",
    "",
    "<Stage",
    '  build="tamanho"',
    "  input={{",
    '    label: "Contar |w|",',
    "    fields: [",
    '      { name: "w", label: "a palavra w", kind: "text", alphabet: ["0", "1"], minLength: 0, maxLength: 8 },',
    "    ],",
    '    examples: [{ w: "" }, { w: "0110" }],',
    "  }}",
    '  prompt="Digite uma palavra e comece."',
    ">",
    "",
    "| Variável | Valor |",
    "| -------- | ----: |",
    "| lido     |     ε |",
    "| tamanho  |     0 |",
    "",
    "</Stage>",
  ]),
  // `COMPONENTS.md`'s Stage entry shows this build, as written here, so the reference's own passes.
  "artifacts/automato-par/automato.build.ts": [
    'import { defineBuild, type CellChange, type Step } from "@artifactory/design-system/stage-build";',
    "",
    "export default defineBuild<{ w: string }>({",
    "  steps(input) {",
    "    const symbols = [...input.w];",
    '    let state = "q0";',
    '    const values = (read: number, accepts = "—"): CellChange[] => [',
    '      { row: "lido", column: "Valor", text: read === 0 ? "ε" : symbols.slice(0, read).join("") },',
    '      { row: "estado", column: "Valor", text: state },',
    '      { row: "aceita", column: "Valor", text: accepts },',
    "    ];",
    '    const steps: Step[] = [{ say: "Começa em q0, sem ter lido nada.", cells: values(0) }];',
    "    symbols.forEach((symbol, index) => {",
    "      const from = state;",
    '      if (symbol === "b") state = state === "q0" ? "q1" : "q0";',
    "      steps.push({",
    "        say: `Lê ${symbol}: de ${from} vai a ${state}.`,",
    '        rows: { estado: "strong" },',
    "        cells: values(index + 1),",
    "      });",
    "    });",
    '    const accepts = state === "q0";',
    "    steps.push({",
    "      say:",
    "        symbols.length === 0",
    '          ? "A palavra vazia acaba em q0: aceita."',
    '          : `A palavra acaba em ${state}: ${accepts ? "aceita" : "rejeita"}.`,',
    '      rows: { aceita: "reversed" },',
    '      cells: values(symbols.length, accepts ? "sim" : "não"),',
    "    });",
    "    return steps;",
    "  },",
    "});",
    "",
  ].join("\n"),
  "artifacts/automato-par/tamanho.build.ts": [
    'import { defineBuild, type CellChange } from "@artifactory/design-system/stage-build";',
    "",
    "export default defineBuild<{ w: string }>({",
    "  steps({ w }) {",
    "    const symbols = [...w];",
    "    const values = (read: number): CellChange[] => [",
    '      { row: "lido", column: "Valor", text: read === 0 ? "ε" : symbols.slice(0, read).join("") },',
    '      { row: "tamanho", column: "Valor", text: String(read) },',
    "    ];",
    "    return [",
    '      { say: "Ainda não leu nenhum símbolo.", cells: values(0) },',
    "      ...symbols.map((symbol, index) => ({ say: `Lê ${symbol}.`, cells: values(index + 1) })),",
    "    ];",
    "  },",
    "});",
    "",
  ].join("\n"),
};

// The code points of "olá mundo" sum to 1023 (111, 108, 225, 32, 109, 117, 110, 100 and 111), and
// 1023 = 146 × 7 + 1, so h is 1.
const textAndNumberStage = {
  "artifacts/hash-modular/index.mdx": artifact(fields("h4shm0d7", "Hash modular", "Cálculo"), [
    'import Stage from "@artifactory/design-system/stage";',
    "",
    "<Stage",
    '  build="hash"',
    "  input={{",
    '    label: "Calcular h(t, m)",',
    "    fields: [",
    '      { name: "t", kind: "text", maxLength: 40 },',
    '      { name: "m", min: 1, max: 997 },',
    "    ],",
    '    examples: [{ t: "olá mundo", m: 7 }, { t: "", m: 7 }, { t: "fim ", m: 2 }],',
    "  }}",
    '  prompt="Digite um texto e um módulo e comece."',
    ">",
    "",
    "| Variável | Valor     |",
    "| -------- | --------- |",
    "| t        | olá mundo |",
    "| lidos    | 9         |",
    "| soma     | 1023      |",
    "| h        | 1         |",
    "",
    "</Stage>",
  ]),
  "artifacts/hash-modular/hash.build.ts": [
    'import { defineBuild, type CellChange, type Step } from "@artifactory/design-system/stage-build";',
    "",
    "export default defineBuild<{ t: string; m: number }>({",
    "  steps({ t, m }) {",
    "    const symbols = [...t];",
    "    let sum = 0;",
    '    const values = (read: number, h = "—"): CellChange[] => [',
    '      { row: "t", column: "Valor", text: t },',
    '      { row: "lidos", column: "Valor", text: String(read) },',
    '      { row: "soma", column: "Valor", text: String(sum) },',
    '      { row: "h", column: "Valor", text: h },',
    "    ];",
    '    const steps: Step[] = [{ say: "A soma começa em 0.", cells: values(0) }];',
    "    symbols.forEach((symbol, index) => {",
    "      sum += symbol.codePointAt(0) ?? 0;",
    "      steps.push({",
    "        say: `Soma o código do símbolo ${String(index + 1)}: ${String(sum)}.`,",
    "        cells: values(index + 1),",
    "      });",
    "    });",
    "    steps.push({",
    "      say: `h é o resto de ${String(sum)} por ${String(m)}, ${String(sum % m)}.`,",
    '      rows: { h: "reversed" },',
    "      cells: values(symbols.length, String(sum % m)),",
    "    });",
    "    return steps;",
    "  },",
    "});",
    "",
  ].join("\n"),
};

// A star from B: breadth-first and depth-first visit it in the same order from B, and differently
// from A or C, which every combination of the two groups runs.
const groupsStage = {
  "artifacts/busca-em-grafo/index.mdx": artifact(fields("bu5c4gr4", "Busca em grafo", "Grafos"), [
    'import Stage from "@artifactory/design-system/stage";',
    'import caminho from "./caminho.svg?raw";',
    "",
    "<Stage",
    '  build="busca"',
    "  choose={[",
    '    { name: "inicio", label: "Começar em", options: ["A", "B", "C"] },',
    '    { name: "busca", label: "Buscar em", options: ["largura", "profundidade"] },',
    "  ]}",
    '  prompt="Escolha um vértice e uma busca para começar."',
    "  figure={caminho}",
    '  alt="Um caminho de três vértices, A, B e C."',
    ">",
    "",
    "| Vértice | Ordem |",
    "| ------- | ----: |",
    "| A       |     — |",
    "| B       |     — |",
    "| C       |     — |",
    "",
    "</Stage>",
  ]),
  "artifacts/busca-em-grafo/caminho.svg": [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60">',
    '  <g data-part="A"><circle cx="20" cy="30" r="12" class="fill-surface stroke-text" /></g>',
    '  <g data-part="B"><circle cx="100" cy="30" r="12" class="fill-surface stroke-text" /></g>',
    '  <g data-part="C"><circle cx="180" cy="30" r="12" class="fill-surface stroke-text" /></g>',
    "</svg>",
    "",
  ].join("\n"),
  "artifacts/busca-em-grafo/busca.build.ts": [
    'import { defineBuild, type Step } from "@artifactory/design-system/stage-build";',
    "",
    "const neighbours: Record<string, string[]> = { A: ['B'], B: ['A', 'C'], C: ['B'] };",
    "",
    "export default defineBuild<{ inicio: string; busca: string }>({",
    "  steps({ inicio, busca }) {",
    "    const order: string[] = [];",
    "    const waiting = [inicio];",
    "    while (waiting.length > 0) {",
    "      const vertex = (busca === 'largura' ? waiting.shift() : waiting.pop()) ?? inicio;",
    "      if (order.includes(vertex)) continue;",
    "      order.push(vertex);",
    "      waiting.push(...(neighbours[vertex] ?? []));",
    "    }",
    "    return order.map((vertex, index): Step => ({",
    "      say: `Visita ${vertex}, o ${String(index + 1)}º da busca em ${busca}.`,",
    "      parts: { [vertex]: 'reversed' },",
    "      cells: order",
    "        .slice(0, index + 1)",
    "        .map((visited, at) => ({ row: visited, column: 'Ordem', text: String(at + 1) })),",
    "    }));",
    "  },",
    "});",
    "",
  ].join("\n"),
};

const steppedFigures = {
  "artifacts/orbita/index.mdx": artifact(fields("0rb1t4s1", "Órbita", "Mecânica"), [
    'import Stepper from "@artifactory/design-system/stepper";',
    'import quadro from "./quadro.svg?raw";',
    'import orbita from "./orbita.svg?raw";',
    'import troca from "./troca.svg?raw";',
    "",
    '<Stepper figure={quadro} alt="Um quadrado, depois um círculo dentro dele." captions={["O quadrado.", "O círculo."]} />',
    "",
    '<Stepper figure={orbita} alt="Um ponto dando a volta num centro, apontado por uma seta." />',
    "",
    '<Stepper figure={troca} alt="Um ponto que pula para a direita." captions={["Antes.", "Depois."]} />',
  ]),
  "artifacts/orbita/quadro.svg": [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">',
    '  <rect x="4" y="4" width="32" height="32" class="fill-tint stroke-text" />',
    '  <circle data-step="2-" cx="20" cy="20" r="8" class="fill-text" />',
    '  <circle data-step="1, 2" cx="20" cy="20" r="2" class="fill-surface" />',
    "</svg>",
    "",
  ].join("\n"),
  "artifacts/orbita/orbita.svg": [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">',
    "  <defs>",
    '    <marker id="seta" viewBox="0 0 6 6" refX="6" refY="3" markerWidth="6" markerHeight="6" orient="auto">',
    '      <path d="M0 0 L6 3 L0 6 z" class="fill-text" />',
    "    </marker>",
    "  </defs>",
    '  <circle id="centro" cx="30" cy="30" r="4" class="fill-text" />',
    '  <line x1="2" y1="2" x2="26" y2="26" marker-end="url(#seta)" class="stroke-text" />',
    '  <circle data-step="1" cx="50" cy="30" r="3" class="fill-text" />',
    '  <circle data-step="2" cx="30" cy="50" r="3" class="fill-text" />',
    '  <circle data-step="3" cx="10" cy="30" r="3" class="fill-text" />',
    '  <use data-step="2-" href="#centro" x="0" y="0" />',
    "</svg>",
    "",
  ].join("\n"),
  "artifacts/orbita/troca.svg": [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20">',
    '  <circle data-step="1" cx="10" cy="10" r="4" class="fill-text" />',
    '  <circle data-step="2" cx="20" cy="10" r="4" class="fill-text" />',
    '  <text x="2" y="4">pilha</text>',
    '  <text data-step="1" x="10" y="18" class="font-code">push</text>',
    '  <text data-step="2" x="20" y="18" class="font-code">pop</text>',
    "</svg>",
    "",
  ].join("\n"),
};

const colouring = {
  "artifacts/coloracao/index.mdx": artifact(fields("c0l0r4c4", "Coloração", "Grafos"), [
    'import Figure from "@artifactory/design-system/figure";',
    'import Stage from "@artifactory/design-system/stage";',
    'import hexagono from "./hexagono.svg?raw";',
    'import aresta from "./aresta.svg?raw";',
    'import marcas from "./marcas.svg?raw";',
    'import vazio from "./vazio.svg?raw";',
    "",
    '<Figure src={hexagono} alt="Seis vértices, um de cada cor, de 1 a 6." />',
    "",
    "Uma aresta da cor Vm liga um vértice da cor Az a um vértice sem cor.",
    "",
    '<Figure src={aresta} alt="Um vértice Az, ligado por uma aresta Vm a um vértice sem cor." colours={["Az", "Vm"]} />',
    "",
    '<Figure src={hexagono} alt="Os mesmos seis vértices outra vez." />',
    "",
    "<Stage",
    '  build="cores"',
    '  choose={{ label: "Começar em", options: ["1", "2"] }}',
    '  prompt="Escolha um vértice para começar."',
    "  figure={hexagono}",
    '  alt="Seis vértices, um de cada cor, de 1 a 6."',
    ">",
    "",
    "| Vértice | Cor |",
    "| ------- | --: |",
    "| 1       |   1 |",
    "| 2       |   2 |",
    "",
    "</Stage>",
    "",
    "<Stage",
    '  build="marcas"',
    '  choose={{ label: "Começar em", options: ["a"] }}',
    '  prompt="Escolha um vértice para começar."',
    "  figure={marcas}",
    '  alt="Um vértice Az, ligado por uma aresta Vm a uma região Vm."',
    '  colours={["Az", "Vm"]}',
    "/>",
    "",
    "<Stage",
    '  build="pinta"',
    '  choose={{ label: "Começar em", options: ["a"] }}',
    '  prompt="Escolha um vértice para começar."',
    "  figure={vazio}",
    '  alt="Um vértice a, ligado por uma aresta ab a uma região b, todos sem cor."',
    '  colours={["Az", "Vm"]}',
    "/>",
  ]),
  "artifacts/coloracao/vazio.svg": [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 60">',
    '  <g data-part="ab">',
    '    <line x1="30" y1="30" x2="170" y2="30" class="stroke-text" stroke-width="2" />',
    '    <text x="100" y="30" data-swatch=""></text>',
    "  </g>",
    '  <g data-part="a">',
    '    <circle cx="30" cy="30" r="22" class="fill-surface stroke-text" stroke-width="2" />',
    '    <text x="30" y="30" data-swatch=""></text>',
    "  </g>",
    '  <g data-part="b">',
    '    <rect x="170" y="8" width="44" height="44" class="fill-surface" />',
    '    <text x="192" y="30" data-swatch=""></text>',
    "  </g>",
    "</svg>",
    "",
  ].join("\n"),
  // The colour is computed as a `number`, and b, drawn without an outline or a colour, takes
  // `dashed` on the step that colours it.
  "artifacts/coloracao/pinta.build.ts": [
    'import { defineBuild } from "@artifactory/design-system/stage-build";',
    "",
    "export default defineBuild({",
    "  steps(start) {",
    "    const vm: number = [start, start].length;",
    "    return [",
    "      { say: 'O vértice a fica Az.', colours: { a: 1 }, parts: { a: 'reversed' } },",
    "      {",
    "        say: 'A aresta ab e a região b ficam Vm.',",
    "        colours: { a: 1, ab: vm, b: vm },",
    "        parts: { b: 'dashed' },",
    "      },",
    "      { say: 'O vértice a volta a ficar sem cor.', colours: { a: null, ab: vm, b: vm } },",
    "    ];",
    "  },",
    "});",
    "",
  ].join("\n"),
  "artifacts/coloracao/marcas.svg": [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 60">',
    '  <g data-part="ab">',
    '    <line x1="30" y1="30" x2="170" y2="30" class="stroke-text" stroke-width="2" />',
    '    <text x="100" y="30" data-swatch="2">Vm</text>',
    "  </g>",
    '  <g data-part="a">',
    '    <circle cx="30" cy="30" r="22" class="fill-swatch-1 stroke-text" stroke-width="2" />',
    '    <text x="30" y="30" data-swatch="1">Az</text>',
    "  </g>",
    '  <g data-part="b">',
    '    <rect x="170" y="8" width="44" height="44" class="fill-swatch-2" />',
    '    <text x="192" y="30" data-swatch="2">Vm</text>',
    "  </g>",
    "</svg>",
    "",
  ].join("\n"),
  "artifacts/coloracao/marcas.build.ts": [
    'import { defineBuild } from "@artifactory/design-system/stage-build";',
    "",
    "export default defineBuild({",
    "  steps: () =>",
    '    (["strong", "dashed", "muted", "reversed"] as const).map((mark) => ({',
    "      say: `O vértice a, a aresta ab e a região b ficam ${mark}.`,",
    "      parts: { a: mark, ab: mark, b: mark },",
    "    })),",
    "});",
    "",
  ].join("\n"),
  "artifacts/coloracao/hexagono.svg": [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 60">',
    ...[1, 2, 3, 4, 5, 6].map((swatch) => {
      const x = String(swatch * 45 - 15);
      return [
        `  <g data-part="${String(swatch)}">`,
        `    <circle cx="${x}" cy="30" r="22" class="fill-swatch-${String(swatch)} stroke-text" stroke-width="2" />`,
        `    <text x="${x}" y="30" data-swatch="${String(swatch)}">${String(swatch)}</text>`,
        "  </g>",
      ].join("\n");
    }),
    "</svg>",
    "",
  ].join("\n"),
  "artifacts/coloracao/aresta.svg": [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60">',
    "  <g>",
    '    <line x1="30" y1="30" x2="170" y2="30" class="stroke-text" stroke-width="2" />',
    '    <text x="100" y="30" data-swatch="2">Vm</text>',
    "  </g>",
    "  <g>",
    '    <circle cx="30" cy="30" r="22" class="fill-swatch-1 stroke-text" stroke-width="2" />',
    '    <text x="30" y="30" data-swatch="1">Az</text>',
    "  </g>",
    '  <circle cx="170" cy="30" r="22" class="fill-surface stroke-text" stroke-width="2" />',
    "</svg>",
    "",
  ].join("\n"),
  "artifacts/coloracao/cores.build.ts": [
    'import { defineBuild } from "@artifactory/design-system/stage-build";',
    "",
    "export default defineBuild({",
    "  steps: (start) => [{ say: `Começa no vértice ${start}.`, parts: { [start]: 'strong' } }],",
    "});",
    "",
  ].join("\n"),
};

// The first example worked by hand: x = −4 and y = 2 leave (−4 + 2) × 2 div 3, which is −1, in
// M[2] and the output, the stack back below its bottom and every cell freed. In the second, the
// jump skips printing 9, so x = 6 is stored in M[0], copied to M[1] and printed alone.
// `divisao` calls div(7, 2): the return value is reserved in M[2], a and b copied to M[3] and M[4],
// CHPR keeps the return address 18 and the level 1 in M[5] and M[6], and ENPR keeps D[1], which has
// no value yet, in M[7] and sets D[1] to 8, so a sits at offset −5 and the return value at −6.
// The quotient 3 goes from M[8] to M[2], RTPR gives D[1] back its lack of value, returns to 18 and
// leaves s on M[2], and IMPR prints it, leaving s on the globals. `dobro` stops inside dobro(6),
// with its record live: base D[1] = 6, so M[1] to M[6] are offsets −5 to 0, and d = 12.
const machineTrace = {
  "artifacts/maquina-de-pilha/index.mdx": artifact(
    fields("m3p4p1l4", "Máquina de pilha", "Cálculo"),
    [
      'import Stage from "@artifactory/design-system/stage";',
      "",
      "<Stage",
      '  build="exemplo"',
      "  input={{",
      '    label: "Rodar",',
      '    fields: [{ name: "x", min: -9, max: 9 }, { name: "y", min: -9, max: 9 }],',
      "    examples: [{ x: -4, y: 2 }, { x: 4, y: 5 }],",
      "  }}",
      '  prompt="Digite x e y e rode o programa."',
      ">",
      "",
      "```text start=0",
      "INPP",
      "AMEM 2       ; x e y",
      "LEIT",
      "ARMZ 0,0",
      "LEIT",
      "ARMZ 0,1",
      "CRVL 0,0",
      "CRVL 0,1",
      "SOMA",
      "CRCT 2",
      "MULT",
      "CRCT 3",
      "DIVI",
      "IMPR",
      "DMEM 2",
      "PARA",
      "FIM",
      "```",
      "",
      "| Registrador | Valor |",
      "| ----------- | ----: |",
      "| i           |    15 |",
      "| s           |    −1 |",
      "| D[0]        |     0 |",
      "| entrada     |     — |",
      "| saída       |    −1 |",
      "",
      "| Célula | Dado | Papel | Topo |",
      "| ------ | ---: | ----- | ---- |",
      "| M[0]   |   −4 |       |      |",
      "| M[1]   |    2 |       |      |",
      "| M[3]   |    3 |       |      |",
      "| M[2]   |   −1 |       |      |",
      "",
      "</Stage>",
      "",
      "<Stage",
      '  build="salto"',
      "  input={{",
      '    label: "Rodar",',
      '    fields: [{ name: "x", min: 0, max: 9 }],',
      "    examples: [{ x: 6 }],",
      "  }}",
      '  prompt="Digite x e rode o programa."',
      ">",
      "",
      "```text start=0",
      "INPP",
      "AMEM 1",
      "LEIT",
      "ARMZ 0,0",
      "DSVS L1",
      "CRCT 9",
      "IMPR",
      "L1: NADA     ; a cópia",
      "CRVL 0,0",
      "IMPR",
      "DMEM 1",
      "PARA",
      "FIM",
      "```",
      "",
      "| Registrador | Valor |",
      "| ----------- | ----: |",
      "| i           |    11 |",
      "| s           |    −1 |",
      "| D[0]        |     0 |",
      "| entrada     |     — |",
      "| saída       |     6 |",
      "",
      "| Célula | Dado | Topo |",
      "| ------ | ---: | ---- |",
      "| M[0]   |    6 |      |",
      "| M[1]   |    6 |      |",
      "",
      "</Stage>",
      "",
      "<Stage",
      '  build="divisao"',
      "  input={{",
      '    label: "Rodar",',
      '    fields: [{ name: "x", min: 0, max: 9 }, { name: "y", min: 1, max: 9 }],',
      "    examples: [{ x: 7, y: 2 }],",
      "  }}",
      '  prompt="Digite x e y e rode o programa."',
      ">",
      "",
      "```text start=0",
      "INPP",
      "AMEM 2       ; x e y",
      "DSVS L1",
      "L2: ENPR 1   ; div(a, b)",
      "CRVL 1,-5",
      "CRVL 1,-4",
      "DIVI",
      "ARMZ 1,-6",
      "RTPR 1,2",
      "L1: NADA",
      "LEIT",
      "ARMZ 0,0",
      "LEIT",
      "ARMZ 0,1",
      "AMEM 1",
      "CRVL 0,0",
      "CRVL 0,1",
      "CHPR L2,1",
      "IMPR",
      "PARA",
      "FIM",
      "```",
      "",
      "| Registrador | Valor |",
      "| ----------- | ----: |",
      "| i           |    19 |",
      "| s           |     1 |",
      "| D[0]        |     0 |",
      "| D[1]        |     ? |",
      "| entrada     |     — |",
      "| saída       |     3 |",
      "",
      "| Célula | Dado | Papel     | Desl. | Topo |",
      "| ------ | ---: | --------- | ----: | ---- |",
      "| M[0]   |    7 | x, global |       |      |",
      "| M[1]   |    2 | y, global |       | ← s  |",
      "| M[2]   |    3 |           |       |      |",
      "| M[3]   |    7 |           |       |      |",
      "| M[4]   |    2 |           |       |      |",
      "| M[5]   |   18 |           |       |      |",
      "| M[6]   |    1 |           |       |      |",
      "| M[7]   |    ? |           |       |      |",
      "| M[8]   |    3 |           |       |      |",
      "| M[9]   |    2 |           |       |      |",
      "",
      "</Stage>",
      "",
      "<Stage",
      '  build="dobro"',
      "  input={{",
      '    label: "Rodar",',
      '    fields: [{ name: "x", min: 0, max: 9 }],',
      "    examples: [{ x: 6 }],",
      "  }}",
      '  prompt="Digite x e rode o programa."',
      ">",
      "",
      "```text start=0",
      "INPP",
      "AMEM 1       ; x",
      "DSVS L1",
      "L2: ENPR 1   ; dobro(a)",
      "AMEM 1       ; d",
      "CRVL 1,-4",
      "CRCT 2",
      "MULT",
      "ARMZ 1,0",
      "CRVL 1,0",
      "ARMZ 1,-5",
      "PARA         ; para antes de retornar",
      "DMEM 1",
      "RTPR 1,1",
      "L1: NADA",
      "LEIT",
      "ARMZ 0,0",
      "AMEM 1",
      "CRVL 0,0",
      "CHPR L2,1",
      "IMPR",
      "PARA",
      "FIM",
      "```",
      "",
      "| Registrador | Valor |",
      "| ----------- | ----: |",
      "| i           |    11 |",
      "| s           |     6 |",
      "| D[0]        |     0 |",
      "| D[1]        |     6 |",
      "| entrada     |     — |",
      "| saída       |     — |",
      "",
      "| Célula | Dado | Papel               | Desl. | Topo |",
      "| ------ | ---: | ------------------- | ----: | ---- |",
      "| M[0]   |    6 | x, global           |       |      |",
      "| M[1]   |   12 | valor de retorno    |    −5 |      |",
      "| M[2]   |    6 | parâmetro a         |    −4 |      |",
      "| M[3]   |   20 | endereço de retorno |    −3 |      |",
      "| M[4]   |    1 | nível 1             |    −2 |      |",
      "| M[5]   |    ? | D[1] guardado       |    −1 |      |",
      "| M[6]   |   12 | d                   |     0 | ← s  |",
      "| M[7]   |   12 |                     |       |      |",
      "| M[8]   |    2 |                     |       |      |",
      "",
      "</Stage>",
    ],
  ),
  "artifacts/maquina-de-pilha/exemplo.build.ts": [
    'import { trace } from "@artifactory/design-system/stage-build";',
    'import mepa from "@artifactory/design-system/machines/mepa";',
    "",
    "export default trace(mepa, {",
    '  reads: ["x", "y"],',
    '  roles: { 1: ["x, global", "y, global"], 2: "lido", 4: "lido" },',
    '  after: { 14: "As globais x e y estão liberadas." },',
    "});",
    "",
  ].join("\n"),
  "artifacts/maquina-de-pilha/salto.build.ts": [
    'import { trace } from "@artifactory/design-system/stage-build";',
    'import mepa from "@artifactory/design-system/machines/mepa";',
    "",
    'export default trace(mepa, { reads: ["x"], labels: { L1: "a cópia de x" } });',
    "",
  ].join("\n"),
  "artifacts/maquina-de-pilha/divisao.build.ts": [
    'import { trace } from "@artifactory/design-system/stage-build";',
    'import mepa from "@artifactory/design-system/machines/mepa";',
    "",
    "export default trace(mepa, {",
    '  reads: ["x", "y"],',
    '  labels: { L1: "o início de main", L2: "o início de div" },',
    '  subroutines: { L2: { params: ["a", "b"], returns: true } },',
    "  roles: {",
    '    1: ["x, global", "y, global"],',
    '    14: ["valor de retorno"],',
    '    15: "parâmetro a",',
    '    16: "parâmetro b",',
    "  },",
    "});",
    "",
  ].join("\n"),
  "artifacts/maquina-de-pilha/dobro.build.ts": [
    'import { trace } from "@artifactory/design-system/stage-build";',
    'import mepa from "@artifactory/design-system/machines/mepa";',
    "",
    "export default trace(mepa, {",
    '  reads: ["x"],',
    '  labels: { L2: "o início de dobro" },',
    '  subroutines: { L2: { params: ["a"], returns: true } },',
    '  roles: { 1: ["x, global"], 4: ["d"], 17: ["valor de retorno"], 18: "parâmetro a" },',
    "});",
    "",
  ].join("\n"),
};

const renamedTwiceAndBack = {
  "artifacts/derivadas/index.mdx": artifact(
    fields("d3r1v4d4", "Derivadas", "Cálculo", "formerSlugs: [derivadas-velhas]"),
    [
      'import SingleChoice from "@artifactory/design-system/single-choice";',
      "",
      '<SingleChoice id="regra-da-potencia" answer={2}>',
      "",
      "Qual é a derivada de $x^2$?",
      "",
      "1. $x$",
      "2. $2x$",
      "",
      "</SingleChoice>",
      "",
      "Volte para [a regra](/derivadas/#q-regra-da-potencia) quando precisar.",
    ],
  ),
  "artifacts/derivadas-de-ordem-superior/index.mdx": artifact(
    fields("d3r1v4d5", "Derivadas de ordem superior", "Cálculo"),
    ["Derivar duas vezes."],
  ),
  "artifacts/limites/index.mdx": artifact(fields("l1m1t3s1", "Limites", "Cálculo"), [
    "Veja [as derivadas](/derivadas/), [a regra](/derivadas/#q-regra-da-potencia), [de novo](../derivadas/) e [por referência][derivadas].",
    "",
    "Depois vêm [as de ordem superior](/derivadas-de-ordem-superior/).",
    "",
    "[derivadas]: /derivadas",
  ]),
};

const statementsAndCitations = {
  "artifacts/valor-medio/index.mdx": artifact(fields("v4l0rm3d", "Valor médio", "Cálculo"), [
    'import Proof from "@artifactory/design-system/proof";',
    'import Ref from "@artifactory/design-system/ref";',
    'import Statement from "@artifactory/design-system/statement";',
    "",
    'O <Ref to="valor-medio" /> liga dois pontos de uma função à sua derivada.',
    "",
    "## Continuidade",
    "",
    "Uma função contínua não salta.",
    "",
    '<Statement kind="definition" id="derivavel" name="Função derivável">',
    "",
    "Uma função $f$ é **derivável** em $(a, b)$ quando $f'(x)$ existe para todo $x$ do intervalo.",
    "",
    "</Statement>",
    "",
    "### Extremos",
    "",
    "Um extremo interior tem derivada nula.",
    "",
    '<Statement kind="lemma" id="fermat">',
    "",
    "Se $f$ tem um extremo em $c \\in (a, b)$ e é derivável em $c$, então $f'(c) = 0$.",
    "",
    "</Statement>",
    "",
    "## O teorema",
    "",
    '<Statement kind="theorem" id="valor-medio" name="Valor médio">',
    "",
    "Se $f$ é contínua em $[a, b]$ e derivável em $(a, b)$, então existe $c$ com",
    "",
    "$$",
    "f'(c) = \\frac{f(b) - f(a)}{b - a}.",
    "$$",
    "",
    "</Statement>",
    "",
    '<Proof of="valor-medio">',
    "",
    "A função $g(x) = f(x) - \\frac{f(b) - f(a)}{b - a}(x - a)$ tem $g(a) = g(b)$.",
    "",
    "Num extremo $c$ de $g$, $g'(c) = 0$.",
    "",
    "</Proof>",
    "",
    'A prova usa o <Ref to="fermat" /> e a <Ref to="derivavel" />.',
    "",
    '<Statement kind="corollary" id="constante">',
    "",
    "Uma função com derivada nula em $(a, b)$ é constante em $[a, b]$.",
    "",
    "</Statement>",
    "",
    '<Statement kind="lemma" id="troca" name="Troca">',
    "",
    "Trocar $a$ por $b$ não muda $f(b) - f(a)$ de módulo.",
    "",
    "</Statement>",
    "",
    '<Statement kind="corollary" id="troca-name">',
    "",
    "O teorema vale com $a > b$.",
    "",
    "</Statement>",
    "",
    'Pelo <Ref to="troca-name" />, a ordem dos extremos não importa.',
    "",
    '<Proof of="fermat">',
    "",
    "Num máximo em $c$, o quociente de Newton é $\\le 0$ à direita e $\\ge 0$ à esquerda, logo",
    "",
    "$$",
    "f'(c) = 0.",
    "$$",
    "",
    "</Proof>",
    "",
    '<Statement kind="example" id="seno" name="Seno">',
    "",
    "Onde a derivada do seno se anula em (0, π)?",
    "",
    "---",
    "",
    'O seno vale 0 em 0 e em π, então o <Ref to="valor-medio" /> dá um ponto com derivada nula:',
    "",
    "$$",
    "\\cos c = 0.",
    "$$",
    "",
    "É o ponto π/2.",
    "",
    "</Statement>",
    "",
    '<Statement kind="corollary" id="cosseno">',
    "",
    "O cosseno se anula em algum ponto de (0, π).",
    "",
    "</Statement>",
    "",
    'O <Ref to="seno" /> usa um teorema já provado.',
  ]),
  "artifacts/mean-value/index.mdx": artifact(
    ["id: m34nv4lu", "title: Mean value", "subject: Cálculo", "lang: en", "published: 2026-10-15"],
    [
      'import Proof from "@artifactory/design-system/proof";',
      'import Ref from "@artifactory/design-system/ref";',
      'import Statement from "@artifactory/design-system/statement";',
      "",
      "## Rolle",
      "",
      '<Statement kind="theorem" id="rolle" name="Rolle">',
      "",
      "If $f$ is continuous on $[a, b]$, differentiable on $(a, b)$ and $f(a) = f(b)$, then $f'(c) = 0$ for some $c$.",
      "",
      "</Statement>",
      "",
      '<Proof of="rolle">',
      "",
      "A continuous $f$ has an extremum on $[a, b]$; where it is interior, $f'(c) = 0$.",
      "",
      "</Proof>",
      "",
      'By <Ref to="rolle" />, the tangent is flat somewhere.',
      "",
      '<Statement kind="definition" id="secant">',
      "",
      "- The **secant** through two points of a graph is the line through both.",
      "",
      "</Statement>",
      "",
      "## Consequences",
      "",
      '<Statement kind="lemma" id="sign">',
      "",
      "A positive derivative on an interval makes every secant over it rise.",
      "",
      "</Statement>",
      "",
      '<Statement kind="corollary" id="increasing" name="Increasing functions">',
      "",
      "A function whose derivative is positive on $(a, b)$ is increasing on $[a, b]$.",
      "",
      "</Statement>",
      "",
      '<Ref to="increasing" /> follows from <Ref to="secant" />.',
      "",
      '<Proof of="sign">',
      "",
      "A secant's slope over $[x, y]$ is $f'(c)$ for some $c \\in (x, y)$, and $f'(c) > 0$.",
      "",
      "</Proof>",
      "",
      '<Statement kind="example" id="cube">',
      "",
      "Is the cube function increasing on (−1, 1)?",
      "",
      "---",
      "",
      "$$",
      "f'(x) = 3x^2",
      "$$",
      "",
      'Its derivative is positive on (0, 1), so by <Ref to="sign" /> every secant over it rises.',
      "",
      "</Statement>",
    ],
  ),
  "artifacts/arvores/index.mdx": artifact(fields("4rv0r3s0", "Árvores", "Grafos"), [
    'import Proof from "@artifactory/design-system/proof";',
    'import Statement from "@artifactory/design-system/statement";',
    "",
    "## Árvores",
    "",
    '<Statement kind="lemma" id="folhas">',
    "",
    "Toda árvore com dois vértices ou mais tem duas folhas.",
    "",
    "</Statement>",
    "",
    '<Statement kind="theorem" id="arestas">',
    "",
    "Uma árvore com $n$ vértices tem $n - 1$ arestas.",
    "",
    "</Statement>",
    "",
    '<Proof of="folhas">',
    "",
    "Num caminho mais longo da árvore:",
    "",
    "- o primeiro vértice é uma folha;",
    "- o último também.",
    "",
    "</Proof>",
    "",
    '<Proof of="arestas">',
    "",
    "$$",
    "|E| = |V| - 1",
    "$$",
    "",
    "Vale por indução, tirando uma folha.",
    "",
    "</Proof>",
    "",
    '<Statement kind="corollary" id="sem-folha">',
    "",
    "Tirar uma folha de uma árvore deixa uma árvore.",
    "",
    "</Statement>",
    "",
    '<Proof of="sem-folha">',
    "",
    "- O grafo continua conexo.",
    "- Não ganha ciclos.",
    "",
    "</Proof>",
  ]),
};

const draft = {
  "artifacts/ciclo-de-krebs/index.mdx": artifact(
    fields("k7rebs01", "Ciclo de Krebs", "Bioquímica", "draft: true"),
    ["O ciclo começa com o acetil-CoA."],
  ),
};

describe("a repo of valid artifacts, one renamed twice and back, and two just scaffolded by pnpm new", () => {
  let repo: FixtureRepo;
  let run: CheckRun;
  let scaffolds: CommandRun[];
  let refusals: CommandRun[];
  let today: Date;
  let lastPassed: string;

  beforeAll(async () => {
    repo = await createFixtureRepo({
      ...mathAndCode,
      ...diagramsAndFigures,
      ...stage,
      ...secondStage,
      ...typedStage,
      ...rewrittenStage,
      ...wordStage,
      ...textAndNumberStage,
      ...groupsStage,
      ...machineTrace,
      ...steppedFigures,
      ...colouring,
      ...renamedTwiceAndBack,
      ...statementsAndCitations,
      ...draft,
    });
    await commitArtifacts(repo);
    lastPassed = await headCommit(repo);
    await succeeds(repo.run("pnpm", ["rename", "derivadas", "derivada"]));
    await succeeds(repo.run("pnpm", ["rename", "derivada", "calculo-de-derivadas"]));
    await succeeds(repo.run("pnpm", ["rename", "calculo-de-derivadas", "derivada"]));
    // pnpm new stamps the owner's day in São Paulo, whatever the machine's time zone.
    today = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }));
    scaffolds = [
      await repo.run("pnpm", ["new", "termodinamica", "--subject", "Física", "--lang", "pt-BR"]),
      await repo.run("pnpm", [
        "new",
        "krebs-cycle",
        "--subject",
        "Bioquímica",
        "--lang",
        "en",
        "--draft",
      ]),
    ];
    refusals = [
      await repo.run("pnpm", ["new", "termodinamica", "--subject", "Física", "--lang", "pt-BR"]),
      await repo.run("pnpm", ["new", "entropia", "--subject", "fisica", "--lang", "pt-BR"]),
    ];
    run = await repo.check(["--last-passed", lastPassed]);
  }, checkTimeout);

  afterAll(() => repo.remove());

  function builtPage(slug: string): Promise<string> {
    return readFile(join(repo.root, `dist/${slug}/index.html`), "utf8");
  }

  it("passes with no failures", () => {
    expect(run.summary).toEqual(["pnpm check: 0 failures"]);
    expect(run.exitCode).toBe(0);
  });

  it("skips Vitest when only artifacts changed since the last commit that passed", () => {
    expect(run.output).toContain(
      `pnpm check: skipped Vitest: every file changed since ${lastPassed} is under artifacts/, .scratch/ or docs/, which no test reads`,
    );
    expect(run.output).not.toContain("pnpm check: Vitest passed");
  });

  describe("math and code", () => {
    it("renders $…$ as inline MathML and $$…$$ as display MathML", async () => {
      const page = await builtPage("movimento-uniforme");
      expect(page).toContain("A velocidade média é <math>");
      expect(page).toMatch(/<math display="block"[^>]*>(?:(?!<\/math>)[\s\S])*área/);
      expect(page).not.toContain("$v_");
      expect(page).not.toContain("$$");
    });

    it("keeps accented pt-BR words inside math intact", async () => {
      const page = await builtPage("movimento-uniforme");
      expect(page).toContain("<mtext>média</mtext>");
      expect(page).toContain("<mtext>área</mtext>");
    });

    it("writes \\$ as a literal dollar sign", async () => {
      expect(await builtPage("movimento-uniforme")).toContain("e a entrada custa R$ 5.");
    });

    it("highlights code with colours that are all token variables", async () => {
      const page = await builtPage("movimento-uniforme");
      const codeBlock =
        /<pre[^>]*data-language="python"[^>]*>[\s\S]*?<\/pre>/.exec(page)?.[0] ?? "";
      expect(codeBlock).toMatch(/<span style="color:var\(--[\w-]+\)">def<\/span>/);
      const colours = [...codeBlock.matchAll(/(?:color|background-color):([^;"]+)/g)].map(
        ([, colour]) => colour,
      );
      expect(colours.length).toBeGreaterThan(2);
      for (const colour of colours) expect(colour).toMatch(/^var\(--[\w-]+\)$/);
    });

    it("gives each code line the number the page shows for it, from the fence's `start` or else from 1", async () => {
      const page = new new Window().DOMParser().parseFromString(
        await builtPage("movimento-uniforme"),
        "text/html",
      ) as unknown as Document;
      expect(
        [...page.querySelectorAll("main pre > code")]
          .filter((code) => code.closest("artifact-stepper") === null)
          .map((code) =>
            [...code.querySelectorAll(":scope > .line")].map((line) => [
              line.getAttribute("data-line"),
              line.textContent,
            ]),
          ),
      ).toEqual([
        [
          ["1", "def area(r):"],
          ["2", "    return 3.14 * r ** 2"],
        ],
        [
          ["0", "push 2"],
          ["1", "add"],
        ],
        [
          ["10", "push 3"],
          ["11", "print"],
        ],
        ...[1, 2].map(() => listing.map((text, index) => [String(index + 1), text])),
        [
          ["0", "push 2"],
          ["1", "push 3"],
          ["2", "add"],
        ],
      ]);
    });

    it("marks the lines a fence's `{…}` names, by the number the page shows, and greys none in a fence without it", async () => {
      const page = new new Window().DOMParser().parseFromString(
        await builtPage("movimento-uniforme"),
        "text/html",
      ) as unknown as Document;
      expect(
        [...page.querySelectorAll("main pre")]
          .filter((pre) => pre.closest("artifact-stepper") === null)
          .map((pre) => [
            pre.hasAttribute("data-marks"),
            [...pre.querySelectorAll("code > .line:not([data-off])")].map((line) =>
              line.getAttribute("data-line"),
            ),
          ]),
      ).toEqual([
        [false, ["1", "2"]],
        [false, ["0", "1"]],
        [false, ["10", "11"]],
        [true, ["3", "5", "6"]],
        [false, ["1", "2", "3", "4", "5", "6", "7"]],
        [true, ["0"]],
      ]);
    });

    it("writes a block marked with `{…}` as it writes the same block without it, but for the marks", async () => {
      const page = new new Window().DOMParser().parseFromString(
        await builtPage("movimento-uniforme"),
        "text/html",
      ) as unknown as Document;
      const [marked, unmarked] = [...page.querySelectorAll("main pre")]
        .filter((pre) => pre.textContent.startsWith(listing[0] ?? ""))
        .map((pre) => pre.cloneNode(true) as Element);
      expect(marked?.querySelectorAll("[data-off]")).toHaveLength(4);
      for (const line of marked?.querySelectorAll("[data-off]") ?? []) {
        line.removeAttribute("data-off");
      }
      marked?.removeAttribute("data-marks");
      expect(marked?.outerHTML).toBe(unmarked?.outerHTML);
    });

    it("steps and prints a one-block Stepper's lines by the number the page shows, from the fence's `start`", async () => {
      const page = new new Window().DOMParser().parseFromString(
        await builtPage("movimento-uniforme"),
        "text/html",
      ) as unknown as Document;
      const stepper = page.querySelector("artifact-stepper");
      expect(
        [...(stepper?.querySelectorAll(".stepper-code .line") ?? [])].map((line) => [
          line.getAttribute("data-line"),
          line.getAttribute("data-in-steps"),
        ]),
      ).toEqual([
        ["0", "1"],
        ["1", "2"],
        ["2", "2"],
        ["3", "2"],
      ]);
      expect(
        [...(stepper?.querySelectorAll(".stepper-steps > li") ?? [])].map((step) =>
          [step.querySelector(".stepper-step-number"), step.querySelector('[data-lang="pt"]')]
            .map((part) => part?.textContent)
            .join(" "),
        ),
      ).toEqual(["1 (linha 0)", "2 (linhas 1–3)"]);
    });

    it("puts each of a Stepper's code blocks in its own step, under its number and caption, with its own numbers and marks", async () => {
      const page = new new Window().DOMParser().parseFromString(
        await builtPage("movimento-uniforme"),
        "text/html",
      ) as unknown as Document;
      const stepper = page.querySelectorAll("artifact-stepper")[1];
      expect(stepper?.getAttribute("data-count")).toBe("3");
      expect(stepper?.querySelector(".stepper-code")).toBeNull();
      expect(
        [...(stepper?.querySelectorAll("[data-in-steps]:has(> pre)") ?? [])].map((step) => {
          const pre = step.querySelector(":scope > pre");
          return {
            step: step.getAttribute("data-in-steps"),
            shown: !step.hasAttribute("data-off"),
            heading: step.querySelector(":scope > .stepper-step")?.textContent,
            marks: pre?.hasAttribute("data-marks"),
            lines: [...(pre?.querySelectorAll("code > .line") ?? [])].map((line) => [
              line.getAttribute("data-line"),
              line.hasAttribute("data-off") ? "grey" : "ink",
            ]),
          };
        }),
      ).toEqual([
        {
          step: "1",
          shown: true,
          heading: "1. Empilha.",
          marks: false,
          lines: [
            ["0", "ink"],
            ["1", "ink"],
          ],
        },
        {
          step: "2",
          shown: false,
          heading: "2. Soma.",
          marks: true,
          lines: [
            ["1", "grey"],
            ["2", "ink"],
            ["3", "grey"],
          ],
        },
        {
          step: "3",
          shown: false,
          heading: "3. Imprime.",
          marks: false,
          lines: [["1", "ink"]],
        },
      ]);
    });

    it("wraps each table in a group Tab reaches, named in the artifact's main language", async () => {
      for (const [slug, expected] of [
        ["movimento-uniforme", [["group", "Tabela", "0", "t (s)"]]],
        [
          "uniform-motion",
          [
            ["group", "Table", "0", "t (s)"],
            ["group", "Table", "0", "v (m/s)"],
          ],
        ],
      ] as const) {
        const page = new new Window().DOMParser().parseFromString(
          await builtPage(slug),
          "text/html",
        ) as unknown as Document;
        const wrappers = [...page.querySelectorAll("main table")].map((table) => {
          const wrapper = table.parentElement;
          return [
            wrapper?.getAttribute("role"),
            wrapper?.getAttribute("aria-label"),
            wrapper?.getAttribute("tabindex"),
            table.querySelector("th")?.textContent,
          ];
        });
        expect(wrappers).toEqual(expected);
      }
    });
  });

  describe("diagrams, figures and images", () => {
    function svgElements(page: string): string[] {
      return [...page.matchAll(/<svg[^>]*role="img"[^>]*>/g)].map(([tag]) => tag);
    }

    function viewBoxOf(page: string, label: string): string | undefined {
      const tag = svgElements(page).find((element) => element.includes(`aria-label="${label}"`));
      return /viewBox="([^"]*)"/.exec(tag ?? "")?.[1];
    }

    it("inlines each diagram and figure as an SVG image labelled by its alt, with its inner nodes hidden", async () => {
      const page = await builtPage("celula");
      const labels = svgElements(page).map((tag) => /aria-label="([^"]*)"/.exec(tag)?.[1]);
      expect(labels).toEqual([
        "Fluxo",
        "Cópia do fluxo",
        "Fluxo em ELK",
        "Fluxo em dagre",
        "O núcleo transcreve para o citoplasma",
        "Uma célula com núcleo",
      ]);
      const hiddenGroups = page.match(/role="img"[^>]*>\s*<g aria-hidden="true"/g) ?? [];
      expect(hiddenGroups).toHaveLength(6);
      expect(page).toContain("início");
      expect(page).toContain('class="fill-tint stroke-accent"');
      expect(page, "a page whose drawings use no swatches").not.toContain("<pattern");
    });

    it("lays diagrams out with ELK unless the D2 file chooses another engine", async () => {
      const page = await builtPage("celula");
      expect(viewBoxOf(page, "Fluxo")).toBeDefined();
      expect(viewBoxOf(page, "Fluxo")).toBe(viewBoxOf(page, "Fluxo em ELK"));
      expect(viewBoxOf(page, "Fluxo")).not.toBe(viewBoxOf(page, "Fluxo em dagre"));
    });

    it("gives identical diagrams on one page distinct IDs", async () => {
      const page = await builtPage("celula");
      const ids = [...page.matchAll(/\sid="([^"]*)"/g)].map(([, id]) => id);
      expect(ids.length).toBeGreaterThan(4);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("paints diagrams with colours that are all token variables", async () => {
      const page = await builtPage("celula");
      const themeRules = [
        ...page.matchAll(/\.(?:fill|stroke|color|background-color)-[A-Z]+\d\{[\w-]+:([^;}]+);?\}/g),
      ].map(([, colour]) => colour);
      expect(themeRules.length).toBeGreaterThan(2);
      for (const colour of themeRules) expect(colour).toMatch(/^var\(--color-[\w-]+\)$/);
    });

    it("draws diagram boxes with square corners", async () => {
      const page = await builtPage("celula");
      const shapes = [...page.matchAll(/<g class="shape" >(.*?)<\/g>/g)].map(
        ([, shape = ""]) => shape,
      );
      expect(shapes.length).toBeGreaterThan(2);
      for (const shape of shapes) {
        expect(shape).toContain("<rect");
        expect(shape).not.toMatch(/\s(?:rx|ry)="/);
      }
    });

    it("sets diagram labels in the frame's face, Archivo, at 500 or 700", async () => {
      expect(diagramFaces(await builtPage("celula"))).toEqual([
        "Archivo 500",
        "Archivo 500 italic",
        "Archivo 700",
      ]);
    });

    it("gives each drawing that uses swatches its hatchings, a Stage's also muted, wiped and both for its marks and hover, which its swatches reach and no other drawing on the page repeats", async () => {
      const page = new new Window().DOMParser().parseFromString(
        await builtPage("coloracao"),
        "text/html",
      ) as unknown as Document;
      const ids = [...page.querySelectorAll("[id]")].map((element) => element.id);
      expect(new Set(ids).size).toBe(ids.length);
      const drawings = [...page.querySelectorAll('svg[role="img"]')];
      expect(drawings).toHaveLength(6);
      for (const drawing of drawings) {
        const hatchings = [...drawing.outerHTML.matchAll(/url\(#([^)]+)\)/g)].map(([, id]) => id);
        const states = drawing.closest(".stage-figure") === null ? 1 : 4;
        expect(new Set(hatchings).size).toBe(6 * states);
        for (const id of hatchings) {
          expect(drawing.querySelector(`pattern[id="${id ?? ""}"]`)).not.toBeNull();
        }
      }
    });

    it("draws each colour label on a square ground plate centred on it, in a Stage as wide as the longest name a step can give it", async () => {
      const page = new new Window().DOMParser().parseFromString(
        await builtPage("coloracao"),
        "text/html",
      ) as unknown as Document;
      const labels = [...page.querySelectorAll("text[data-swatch]")];
      expect(labels.map((label) => label.textContent)).toEqual([
        ...["1", "2", "3", "4", "5", "6"],
        ...["Vm", "Az"],
        ...["1", "2", "3", "4", "5", "6"],
        ...["1", "2", "3", "4", "5", "6"],
        ...["Vm", "Az", "Vm"],
        ...["", "", ""],
      ]);
      expect(
        labels.slice(-3).map((label) => label.previousElementSibling?.getAttribute("width")),
      ).toEqual(["24", "24", "24"]);
      for (const label of labels) {
        const plate = label.previousElementSibling;
        const side = Number(plate?.getAttribute("width"));
        expect(plate?.tagName.toLowerCase()).toBe("rect");
        expect(plate?.getAttribute("class")).toBe("fill-surface");
        expect(Number(plate?.getAttribute("height"))).toBe(side);
        expect(side).toBeGreaterThan(0);
        expect(Number(plate?.getAttribute("x")) + side / 2).toBe(Number(label.getAttribute("x")));
        expect(Number(plate?.getAttribute("y")) + side / 2).toBe(Number(label.getAttribute("y")));
      }
    });

    describe("figure Steppers in print", () => {
      async function steppers(): Promise<Element[]> {
        const page = new new Window().DOMParser().parseFromString(
          await builtPage("orbita"),
          "text/html",
        ) as unknown as Document;
        return [...page.querySelectorAll("artifact-stepper")];
      }

      // A printed step is a copy of the drawing that no screen reader meets, under its own heading.
      function printedSteps(stepper: Element | undefined) {
        return [...(stepper?.querySelectorAll("svg") ?? [])]
          .filter((svg) => !svg.hasAttribute("role") && svg.closest("button") === null)
          .map((svg) => ({
            svg,
            heading: svg.parentElement?.querySelector(":scope > .stepper-step")?.textContent,
          }));
      }

      function part(element: Element): string {
        if (element.localName === "use") return "use";
        const x = element.getAttribute("cx") ?? element.getAttribute("x1");
        const y = element.getAttribute("cy") ?? element.getAttribute("y1");
        return `${element.localName} ${x ?? ""},${y ?? ""}`;
      }

      function shownParts(svg: Element): string[] {
        return [...svg.querySelectorAll("circle, line, use")]
          .filter((element) => element.closest("[data-off]") === null)
          .map(part);
      }

      function references(svg: Element): string[] {
        return [svg, ...svg.querySelectorAll("*")].flatMap((element) =>
          element.getAttributeNames().flatMap((name) => {
            const value = element.getAttribute(name) ?? "";
            if (name === "href" || name === "xlink:href")
              return value.startsWith("#") ? [value.slice(1)] : [];
            return [...value.matchAll(/url\(#([^)]+)\)/g)].map(([, id = ""]) => id);
          }),
        );
      }

      it("prints a figure whose parts all reach its last step once, with its captions listed under it", async () => {
        const [quadro] = await steppers();
        expect(printedSteps(quadro)).toEqual([]);
        expect(
          [...(quadro?.querySelectorAll(".stepper-steps > li") ?? [])].map((step) =>
            [step.querySelector(".stepper-step-number"), step.querySelector('[data-lang="pt"]')]
              .map((part) => part?.textContent)
              .join(" "),
          ),
        ).toEqual(["1. O quadrado.", "2. O círculo."]);
      });

      it("prints every step of a figure with a part that leaves, each with that step's parts and the unstepped ones, in the drawing's full frame, under its number and caption", async () => {
        const [, orbita, troca] = await steppers();
        expect(
          printedSteps(orbita).map(({ svg, heading }) => ({
            heading,
            frame: svg.getAttribute("viewBox"),
            parts: shownParts(svg),
          })),
        ).toEqual([
          {
            heading: "1. ",
            frame: "0 0 60 60",
            parts: ["circle 30,30", "line 2,2", "circle 50,30"],
          },
          {
            heading: "2. ",
            frame: "0 0 60 60",
            parts: ["circle 30,30", "line 2,2", "circle 30,50", "use"],
          },
          {
            heading: "3. ",
            frame: "0 0 60 60",
            parts: ["circle 30,30", "line 2,2", "circle 10,30", "use"],
          },
        ]);
        expect(
          printedSteps(troca).map(({ svg, heading }) => ({ heading, parts: shownParts(svg) })),
        ).toEqual([
          { heading: "1. Antes.", parts: ["circle 10,10"] },
          { heading: "2. Depois.", parts: ["circle 20,10"] },
        ]);
        for (const stepper of [orbita, troca]) {
          expect(stepper?.querySelector(".stepper-steps")).toBeNull();
        }
      });

      it("sets a figure's code-face labels in the code face in every printed step, beside its other labels in the frame face", async () => {
        const [, , troca] = await steppers();
        expect(
          printedSteps(troca).map(({ svg }) => ({
            wrapper: svg.parentElement?.classList.contains("figure"),
            labels: [...svg.querySelectorAll("text")]
              .filter((text) => text.closest("[data-off]") === null)
              .map((text) => `${text.textContent} ${text.getAttribute("class") ?? "frame"}`),
          })),
        ).toEqual([
          { wrapper: true, labels: ["pilha frame", "push font-code"] },
          { wrapper: true, labels: ["pilha frame", "pop font-code"] },
        ]);
      });

      it("gives every printed step ids of its own, which its markers and uses resolve to", async () => {
        const all = await steppers();
        const ids = all.flatMap((stepper) =>
          [...stepper.querySelectorAll("[id]")].map((element) => element.id),
        );
        expect(ids.length).toBe(2 * 4);
        expect(new Set(ids).size).toBe(ids.length);
        for (const { svg } of printedSteps(all[1])) {
          const resolved = references(svg).map(
            (id) => svg.querySelector(`[id="${id}"]`)?.localName,
          );
          expect(resolved).toEqual(["marker", "circle"]);
        }
      });

      it("labels each figure Stepper once, with its alt, and keeps its printed steps from screen readers and the figures' series", async () => {
        const all = await steppers();
        expect(
          all.map((stepper) =>
            [...stepper.querySelectorAll("[aria-label]")].map((labelled) =>
              labelled.getAttribute("aria-label"),
            ),
          ),
        ).toEqual([
          ["Um quadrado, depois um círculo dentro dele."],
          ["Um ponto dando a volta num centro, apontado por uma seta."],
          ["Um ponto que pula para a direita."],
        ]);
        const steps = all.flatMap(printedSteps);
        expect(steps).toHaveLength(5);
        for (const { svg } of steps) {
          expect(svg.closest('[aria-hidden="true"]')).not.toBeNull();
          expect(svg.closest("figure")).toBeNull();
          expect(svg.closest("[data-in-steps]")).toBeNull();
          expect(svg.querySelector("[data-in-steps]")).toBeNull();
        }
      });
    });

    it("renders an image next to the entry, optimized", async () => {
      expect(await builtPage("celula")).toMatch(
        /<img src="\/_astro\/foto\.[\w-]+\.webp"[^>]* alt="Uma foto"/,
      );
    });
  });

  describe("stages", () => {
    function parsed(html: string): Document {
      return new new Window().DOMParser().parseFromString(html, "text/html") as unknown as Document;
    }

    it("holds a Stage's content as written, numbered as a figure, with its controls hidden and no example named", async () => {
      const page = parsed(await builtPage("arvore-geradora"));
      const stage = page.querySelector("artifact-stage");
      const rows = [...(stage?.querySelectorAll("tbody tr") ?? [])].map((row) =>
        [...row.children].map((cell) => cell.textContent.trim()),
      );
      expect(rows).toEqual([
        ["A", "∞", "—"],
        ["B", "∞", "—"],
        ["C", "∞", "—"],
      ]);
      expect(stage?.querySelector(".stage-figure svg")?.getAttribute("aria-label")).toBe(
        "Um triângulo de vértices A, B e C, com arestas de pesos 1, 2 e 3.",
      );
      expect(stage?.querySelectorAll("[data-part]")).toHaveLength(6);
      expect(stage?.querySelectorAll("[data-mark]")).toHaveLength(0);
      const controls = stage?.querySelector(".stage-controls");
      expect(controls?.hasAttribute("hidden")).toBe(true);
      expect(stage?.querySelector(".stage-example")).toBeNull();
      const options = [...(controls?.querySelectorAll('input[type="radio"]') ?? [])];
      expect(options.map((option) => option.getAttribute("value"))).toEqual(["A", "B", "C"]);
      expect(controls?.textContent).toContain("Escolha um vértice para começar.");
      expect(stage?.querySelector("figure.figure > figcaption")?.textContent).toContain(
        "O algoritmo de Prim a partir do vértice escolhido.",
      );
    });

    it("holds a Stage with choice groups as a labelled row of options per group, in the order written, each its own radio group, none chosen, its controls hidden and no example named", async () => {
      const stage = parsed(await builtPage("busca-em-grafo")).querySelector("artifact-stage");
      const controls = stage?.querySelector(".stage-controls");
      expect(controls?.hasAttribute("hidden")).toBe(true);
      const groups = [...(controls?.querySelectorAll("fieldset") ?? [])].map((group) => {
        const options = [...group.querySelectorAll('input[type="radio"]')];
        return {
          label: group.querySelector("legend")?.textContent,
          options: options.map((option) => option.getAttribute("value")),
          names: [...new Set(options.map((option) => option.getAttribute("name")))].length,
          checked: options.filter((option) => option.hasAttribute("checked")).length,
        };
      });
      expect(groups).toEqual([
        { label: "Começar em", options: ["A", "B", "C"], names: 1, checked: 0 },
        { label: "Buscar em", options: ["largura", "profundidade"], names: 1, checked: 0 },
      ]);
      const [start, search] = [...(controls?.querySelectorAll("fieldset") ?? [])].map((group) =>
        group.querySelector("input")?.getAttribute("name"),
      );
      expect(start).not.toBe(search);
      expect(controls?.querySelector(".stage-counter")?.hasAttribute("hidden")).toBe(true);
      expect(controls?.querySelector(".stage-say")?.textContent).toBe(
        "Escolha um vértice e uma busca para começar.",
      );
      expect(stage?.querySelector(".stage-example")).toBeNull();
      expect(stage?.querySelectorAll("[data-mark]")).toHaveLength(0);
    });

    it("holds a typed Stage's fields filled with its first example, a line after them naming that example's values, and its tables as that example's result", async () => {
      const stage = parsed(await builtPage("maximo-divisor")).querySelector("artifact-stage");
      const rows = [...(stage?.querySelectorAll("tbody tr") ?? [])].map((row) =>
        [...row.children].map((cell) => cell.textContent.trim()),
      );
      expect(rows).toEqual([
        ["a", "6"],
        ["b", "0"],
      ]);
      const controls = stage?.querySelector(".stage-controls");
      expect(controls?.hasAttribute("hidden")).toBe(true);
      const fields = [...(controls?.querySelectorAll(".stage-field") ?? [])].map((field) => [
        field.textContent.trim(),
        field.querySelector("input")?.getAttribute("name"),
        field.querySelector("input")?.getAttribute("value"),
      ]);
      expect(fields).toEqual([
        ["a", "a", "48"],
        ["o divisor b", "b", "18"],
      ]);
      expect(controls?.querySelector("legend")?.textContent).toBe("Calcular mdc(a, b)");
      expect(controls?.querySelector('button[type="submit"]')?.textContent).toContain("Começar");
      expect(controls?.querySelectorAll('input[type="radio"]')).toHaveLength(0);
      expect(stage?.querySelector(".stage-controls + .stage-example")?.textContent).toBe(
        "Calcular mdc(a, b) a = 48, b = 18",
      );
    });

    it("holds a text field filled with its first example's text, with no case, correction, spelling or length help, and names that example's text bare in the code face, the empty word as ε", async () => {
      const textFields = (stage: Element | undefined) =>
        [...(stage?.querySelectorAll(".stage-field") ?? [])].map((field) => {
          const input = field.querySelector("input");
          return {
            label: field.textContent.trim(),
            name: input?.getAttribute("name"),
            value: input?.getAttribute("value"),
            autocapitalize: input?.getAttribute("autocapitalize"),
            autocorrect: input?.getAttribute("autocorrect"),
            spellcheck: input?.getAttribute("spellcheck"),
            maxlength: input?.getAttribute("maxlength"),
            inputmode: input?.getAttribute("inputmode"),
          };
        });
      const named = (stage: Element | undefined) => {
        const example = stage?.querySelector(".stage-controls + .stage-example");
        return [
          example?.textContent,
          [...(example?.querySelectorAll("code") ?? [])].map((code) => code.textContent),
        ];
      };
      const off = { autocapitalize: "off", autocorrect: "off", spellcheck: "false" };
      const [word, empty] = [
        ...parsed(await builtPage("automato-par")).querySelectorAll("artifact-stage"),
      ];
      expect(textFields(word)).toEqual([
        { label: "w", name: "w", value: "aabba", ...off, maxlength: null, inputmode: null },
      ]);
      expect(named(word)).toEqual(["Aceita w? w = aabba", ["aabba"]]);
      expect(textFields(empty)).toEqual([
        { label: "a palavra w", name: "w", value: "", ...off, maxlength: null, inputmode: null },
      ]);
      expect(named(empty)).toEqual(["Contar |w| w = ε", ["ε"]]);
      const [mixed] = parsed(await builtPage("hash-modular")).querySelectorAll("artifact-stage");
      expect(textFields(mixed)).toEqual([
        { label: "t", name: "t", value: "olá mundo", ...off, maxlength: null, inputmode: null },
        {
          label: "m",
          name: "m",
          value: "7",
          autocapitalize: null,
          autocorrect: "off",
          spellcheck: "false",
          maxlength: null,
          inputmode: "numeric",
        },
      ]);
      expect(named(mixed)).toEqual(["Calcular h(t, m) t = olá mundo, m = 7", ["olá mundo"]]);
    });

    it("holds a Stage whose build uses `body` with every row as written shown and its controls hidden", async () => {
      const stage = parsed(await builtPage("teste-de-mesa")).querySelector("artifact-stage");
      const rows = [...(stage?.querySelectorAll("tbody tr") ?? [])].map((row) => [
        row.className,
        row.hasAttribute("hidden"),
        ...[...row.children].map((cell) => cell.textContent.trim()),
      ]);
      expect(rows).toEqual([
        ["", false, "início", "4", "1"],
        ["", false, "1", "3", "4"],
        ["", false, "2", "2", "12"],
        ["", false, "3", "1", "24"],
      ]);
      expect(stage?.querySelectorAll("[data-mark]")).toHaveLength(0);
      const controls = stage?.querySelector(".stage-controls");
      expect(controls?.hasAttribute("hidden")).toBe(true);
      expect(controls?.querySelector('input[name="n"]')?.getAttribute("value")).toBe("4");
    });

    it("holds a Stage's code block highlighted as written, a line per line of code and no line marked", async () => {
      const stage = parsed(await builtPage("maximo-divisor")).querySelector("artifact-stage");
      const code = stage?.querySelector(".stage-content pre.astro-code > code");
      expect(
        [...(code?.querySelectorAll(":scope > .line") ?? [])].map((line) => line.textContent),
      ).toEqual(["def mdc(a, b):", "    while b != 0:", "        a, b = b, a % b", "    return a"]);
      expect(code?.querySelector(".line span[style]")).not.toBeNull();
      expect(code?.querySelectorAll("[data-mark]")).toHaveLength(0);
    });

    it("ships each Stage's build to its own page alone, from a file of its own loaded on demand", async () => {
      const assets = join(repo.root, "dist/_astro");
      const scripts = (await readdir(assets)).filter((file) => file.endsWith(".js"));
      const holding = async (text: string) => {
        const files = [];
        for (const file of scripts) {
          if ((await readFile(join(assets, file), "utf8")).includes(text)) files.push(file);
        }
        return files;
      };
      const [prim, ...otherPrims] = await holding("na árvore de Prim");
      const [dijkstra, ...otherDijkstras] = await holding("pelo caminho mais curto");
      expect([prim, dijkstra]).not.toContain(undefined);
      expect([...otherPrims, ...otherDijkstras]).toEqual([]);
      const namedBy = async (slug: string) => {
        const named = new Set<string>();
        const reach = async (text: string) => {
          for (const [file = ""] of text.matchAll(/[\w.-]+\.js\b/g)) {
            if (!scripts.includes(file) || named.has(file)) continue;
            named.add(file);
            await reach(await readFile(join(assets, file), "utf8"));
          }
        };
        await reach(await builtPage(slug));
        return named;
      };
      const stagePage = await builtPage("arvore-geradora");
      expect(stagePage).not.toContain("na árvore de Prim");
      expect(stagePage).not.toMatch(new RegExp(`(?:src|href)="[^"]*${prim ?? ""}"`));
      const primPage = await namedBy("arvore-geradora");
      const dijkstraPage = await namedBy("caminho-minimo");
      expect([primPage.has(prim ?? ""), primPage.has(dijkstra ?? "")]).toEqual([true, false]);
      expect([dijkstraPage.has(dijkstra ?? ""), dijkstraPage.has(prim ?? "")]).toEqual([
        true,
        false,
      ]);
      for (const slug of ["celula", "movimento-uniforme"]) {
        const page = await namedBy(slug);
        expect([page.has(prim ?? ""), page.has(dijkstra ?? "")]).toEqual([false, false]);
      }
    });
  });

  describe("renaming", () => {
    it("rewrites every link to the renamed artifact to its current slug", async () => {
      const linking = await readFile(join(repo.root, "artifacts/limites/index.mdx"), "utf8");
      expect(linking.split("\n").slice(8)).toEqual([
        "Veja [as derivadas](/derivada/), [a regra](/derivada/#q-regra-da-potencia), [de novo](../derivada/) e [por referência][derivadas].",
        "",
        "Depois vêm [as de ordem superior](/derivadas-de-ordem-superior/).",
        "",
        "[derivadas]: /derivada",
        "",
      ]);
    });

    it("redirects every former slug straight to the current slug, and the slug renamed back to not at all", async () => {
      const redirects = await readFile(join(repo.root, "dist/_redirects"), "utf8");
      expect(redirects.split("\n")).toEqual([
        "/calculo-de-derivadas /derivada/ 301",
        "/calculo-de-derivadas/ /derivada/ 301",
        "/derivadas /derivada/ 301",
        "/derivadas/ /derivada/ 301",
        "/derivadas-velhas /derivada/ 301",
        "/derivadas-velhas/ /derivada/ 301",
        "",
      ]);
    });
  });

  describe("scaffolding with pnpm new", () => {
    it("scaffolds each artifact with a new ID, today's published date and the given subject, language and draft flag", async () => {
      const frontmatterOf = async (slug: string) =>
        parseFrontmatter(await readFile(join(repo.root, `artifacts/${slug}/index.mdx`), "utf8"))
          .frontmatter;
      const { id: termodinamicaId, ...termodinamica } = await frontmatterOf("termodinamica");
      const { id: krebsCycleId, ...krebsCycle } = await frontmatterOf("krebs-cycle");
      expect(scaffolds.map(({ exitCode }) => exitCode)).toEqual([0, 0]);
      expect(termodinamicaId).toMatch(/^[a-z0-9]{8}$/);
      expect(krebsCycleId).toMatch(/^[a-z0-9]{8}$/);
      expect(krebsCycleId).not.toBe(termodinamicaId);
      expect(termodinamica).toEqual({
        title: "Termodinamica",
        subject: "Física",
        lang: "pt-BR",
        published: today,
        draft: false,
      });
      expect(krebsCycle).toEqual({
        title: "Krebs cycle",
        subject: "Bioquímica",
        lang: "en",
        published: today,
        draft: true,
      });
    });

    it("prints the subjects already in use and points the agent to the artifact skill", () => {
      const [termodinamica, krebsCycle] = scaffolds.map(({ stdout }) => stdout.split("\n"));
      expect(termodinamica).toContain(
        "Subjects already in use: Biologia, Bioquímica, Cálculo, Grafos, Mecânica",
      );
      expect(krebsCycle).toContain(
        "Subjects already in use: Biologia, Bioquímica, Cálculo, Física, Grafos, Mecânica",
      );
      for (const lines of [termodinamica, krebsCycle]) {
        expect(lines).toContain(
          "Use the `artifact` skill to write the artifact, then run `pnpm check`.",
        );
      }
    });

    it("refuses a slug whose folder exists and a subject that differs only in case or accents from one in use", () => {
      const [existingFolder, respelledSubject] = refusals;
      expect(existingFolder?.exitCode).toBe(1);
      expect(existingFolder?.output).toContain("pnpm new: artifacts/termodinamica/ already exists");
      expect(respelledSubject?.exitCode).toBe(1);
      expect(respelledSubject?.output).toContain(
        "pnpm new: the subject `fisica` differs only in case or accents from `Física`, which is in use; use that spelling",
      );
      expect(respelledSubject?.output).toContain(
        "Subjects already in use: Biologia, Bioquímica, Cálculo, Física, Grafos, Mecânica",
      );
    });

    it("renders every pattern the starter entry shows, in each main language", async () => {
      for (const [slug, otherLang] of [
        ["termodinamica", "en"],
        ["krebs-cycle", "pt-BR"],
      ] as const) {
        const page = await builtPage(slug);
        expect(page).toContain("<math>");
        expect(page).toContain('<math display="block"');
        expect(page.match(/<pre\b/g), "a code block and a code stepper").toHaveLength(2);
        expect(page.match(/role="img"/g), "a diagram and a figure").toHaveLength(2);
        expect(page).toContain('data-question-kind="single-choice"');
        expect(page).toContain('data-question-kind="open-question"');
        expect(page).toContain(`<span lang="${otherLang}">`);
      }
    });
  });

  describe("statements and citations", () => {
    async function main(slug: string): Promise<Element> {
      const page = new new Window().DOMParser().parseFromString(
        await builtPage(slug),
        "text/html",
      ) as unknown as Document;
      const found = page.querySelector("main");
      if (found === null) throw new Error(`dist/${slug}/index.html has no main`);
      return found;
    }

    function onlyWithId(page: Element, id: string): Element | null {
      const found = page.querySelectorAll(`[id="${id}"]`);
      return found.length === 1 ? (found[0] ?? null) : null;
    }

    // What a reader of a page in `lang` sees: the page hides the other language's labels.
    function shown(element: Element | null, lang: "en" | "pt"): string {
      const copy = element?.cloneNode(true) as Element | undefined;
      for (const other of copy?.querySelectorAll(`[data-lang]:not([data-lang="${lang}"])`) ?? []) {
        other.remove();
      }
      return (copy?.textContent ?? "").replace(/[ \t\n]+/g, " ").trim();
    }

    it("numbers each statement as the next clause of its section, after its paragraphs and h3s but not an example's solution, in a group named by its label in the artifact's language", async () => {
      for (const [slug, lang, expected] of [
        [
          "valor-medio",
          "pt",
          [
            ["S-derivavel", "group", "Definição 1.2 (Função derivável)"],
            ["S-fermat", "group", "Lema 1.5"],
            ["S-valor-medio", "group", "Teorema 2.1 (Valor médio)"],
            ["S-constante", "group", "Corolário 2.3"],
            ["S-troca", "group", "Lema 2.4 (Troca)"],
            ["S-troca-name", "group", "Corolário 2.5"],
            ["S-seno", "group", "Exemplo 2.7 (Seno)"],
            ["S-cosseno", "group", "Corolário 2.8"],
          ],
        ],
        [
          "mean-value",
          "en",
          [
            ["S-rolle", "group", "Theorem 1.1 (Rolle)"],
            ["S-secant", "group", "Definition 1.3"],
            ["S-sign", "group", "Lemma 2.1"],
            ["S-increasing", "group", "Corollary 2.2 (Increasing functions)"],
            ["S-cube", "group", "Example 2.4"],
          ],
        ],
      ] as const) {
        const page = await main(slug);
        const statements = [...page.querySelectorAll(".statement")].map((statement) => [
          statement.id,
          statement.getAttribute("role"),
          (statement.getAttribute("aria-labelledby") ?? "")
            .split(" ")
            .map((id) => shown(onlyWithId(page, id), lang))
            .join(" "),
        ]);
        expect(statements).toEqual(expected);
      }
    });

    it("prints each citation as its statement's label and number in the artifact's language, linking to the statement", async () => {
      for (const [slug, lang, expected] of [
        [
          "valor-medio",
          "pt",
          [
            ["#S-valor-medio", "Teorema 2.1"],
            ["#S-fermat", "Lema 1.5"],
            ["#S-derivavel", "Definição 1.2"],
            ["#S-troca-name", "Corolário 2.5"],
            ["#S-valor-medio", "Teorema 2.1"],
            ["#S-seno", "Exemplo 2.7"],
          ],
        ],
        [
          "mean-value",
          "en",
          [
            ["#S-rolle", "Theorem 1.1"],
            ["#S-increasing", "Corollary 2.2"],
            ["#S-secant", "Definition 1.3"],
            ["#S-sign", "Lemma 2.1"],
          ],
        ],
      ] as const) {
        const page = await main(slug);
        const citations = [...page.querySelectorAll("a.citation")].map((link) => [
          link.getAttribute("href"),
          shown(link, lang),
        ]);
        expect(citations).toEqual(expected);
        for (const [href] of citations) {
          expect(onlyWithId(page, (href ?? "").slice(1))?.className).toBe("statement");
        }
      }
    });

    it("shows an example's solution openly inside it, after a run-in label in a paragraph of its own, with its equations in the statement's column", async () => {
      for (const [slug, lang, expected] of [
        [
          "valor-medio",
          "pt",
          [
            ["p", "Exemplo 2.7 (Seno). Onde a derivada do seno se anula em (0, π)?"],
            [
              "p",
              "Solução. O seno vale 0 em 0 e em π, então o Teorema 2.1 dá um ponto com derivada nula:",
            ],
            ["div.equation", null],
            ["p", "É o ponto π/2."],
          ],
        ],
        [
          "mean-value",
          "en",
          [
            ["p", "Example 2.4. Is the cube function increasing on (−1, 1)?"],
            ["p", "Solution."],
            ["div.equation", null],
            [
              "p",
              "Its derivative is positive on (0, 1), so by Lemma 2.1 every secant over it rises.",
            ],
          ],
        ],
      ] as const) {
        const page = await main(slug);
        const examples = page.querySelectorAll('.statement[data-statement-kind="example"]');
        expect(examples).toHaveLength(1);
        const children = [...(examples[0]?.children ?? [])].map((child) => {
          const tag = [child.localName, ...child.classList].join(".");
          return [tag, tag === "p" ? shown(child, lang) : null];
        });
        expect(children).toEqual(expected);
        expect(
          examples[0]?.querySelectorAll("[data-statement-id], [data-proof-of], [hidden], details"),
        ).toHaveLength(0);
      }
    });

    it("opens a proof right after its statement plainly and any other proof with its statement's label and number, linked, and ends each with the end square", async () => {
      for (const [slug, lang, expected] of [
        [
          "valor-medio",
          "pt",
          [
            ["Demonstração.", null, "Fim da demonstração."],
            ["Demonstração do Lema 1.5.", "#S-fermat", "Fim da demonstração."],
          ],
        ],
        [
          "mean-value",
          "en",
          [
            ["Proof.", null, "End of proof."],
            ["Proof of Lemma 2.1.", "#S-sign", "End of proof."],
          ],
        ],
      ] as const) {
        const page = await main(slug);
        const proofs = [...page.querySelectorAll(".proof")].map((proof) => [
          shown(proof.querySelector(".proof-label"), lang),
          proof.querySelector(".proof-label a")?.getAttribute("href") ?? null,
          shown(proof.querySelector(":scope > :last-child > .proof-end:last-child"), lang),
        ]);
        expect(proofs).toEqual(expected);
      }
    });

    it("marks only a proof right after its statement as following it, opens one after another statement with its own, and ends a proof that closes with a list in its last item", async () => {
      const page = await main("arvores");
      const proofs = [...page.querySelectorAll(".proof")].map((proof) => {
        const end = proof.querySelector(".proof-end");
        return [
          shown(proof.querySelector(":scope > p:first-child > .proof-label"), "pt"),
          proof.hasAttribute("data-follows-statement"),
          end?.parentElement?.tagName.toLowerCase(),
          end?.previousSibling?.textContent?.trim() ?? null,
          end?.nextSibling ?? null,
        ];
      });
      expect(proofs).toEqual([
        ["Demonstração do Lema 1.1.", false, "li", "o último também.", null],
        ["Demonstração do Teorema 1.2.", false, "p", "Vale por indução, tirando uma folha.", null],
        ["Demonstração.", true, "li", "Não ganha ciclos.", null],
      ]);
    });
  });

  it("renders a draft at its slug, in the design system's layout, in its main language", async () => {
    const page = await builtPage("ciclo-de-krebs");
    expect(page).toMatch(/^<!DOCTYPE html><html lang="pt-BR"/);
    expect(page).toMatch(/<h1[^>]*>(?:<[^>]+>)*Ciclo de Krebs(?:<\/[^>]+>)*<\/h1>/);
    expect(page).toContain("<p>O ciclo começa com o acetil-CoA.</p>");
  });

  it("holds an artifact page's first paint until its scripts have run, and not the Library's", async () => {
    function parsed(html: string): Document {
      return new new Window().DOMParser().parseFromString(html, "text/html") as unknown as Document;
    }
    const isModule = (element: Element) =>
      element.localName === "script" && element.getAttribute("type") === "module";

    const artifactPage = parsed(await builtPage("termodinamica"));
    const head = [...artifactPage.head.children];
    const firstModule = head.findIndex(isModule);
    expect(firstModule).not.toBe(-1);
    const held = head.slice(firstModule);
    expect(held.every(isModule)).toBe(true);
    expect(held.map((script) => script.getAttribute("blocking"))).toEqual(held.map(() => "render"));
    expect(artifactPage.body.querySelectorAll('script[type="module"]')).toHaveLength(0);

    const library = parsed(await readFile(join(repo.root, "dist/index.html"), "utf8"));
    expect(library.body.querySelectorAll('script[type="module"]')).not.toHaveLength(0);
    expect(library.querySelectorAll("script[blocking]")).toHaveLength(0);
  });
});
