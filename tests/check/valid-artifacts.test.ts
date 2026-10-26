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

const mathAndCode = {
  "artifacts/movimento-uniforme/index.mdx": artifact(
    fields("m0v1ment", "Movimento uniforme", "Mecânica"),
    [
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
