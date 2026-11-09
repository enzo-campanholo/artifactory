import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  checkTimeout,
  createFixtureRepo,
  succeeds,
  type CheckRun,
  type FixtureRepo,
} from "./fixture-repo.ts";

function artifact(frontmatter: string[], body = ["Texto."]): string {
  return ["---", ...frontmatter, "---", "", ...body, ""].join("\n");
}

function fields(id: string, subject: string, ...rest: string[]): string[] {
  return [
    `id: ${id}`,
    "title: Um artefato",
    `subject: ${subject}`,
    "lang: pt-BR",
    "published: 2026-10-15",
    ...rest,
  ];
}

const artifactCheckRules = [
  "artifact-id",
  "slug",
  "subject",
  "import",
  "content-only",
  "artifact-file",
  "build-import",
  "build-input",
  "stage-run",
  "public",
];

function linesFor(run: CheckRun, ruleId: string): string[] {
  return run.summary.filter((line) => line.includes(` error ${ruleId}: `));
}

const sharedIdsSlugsAndSubjects = {
  "artifacts/limites/index.mdx": artifact(fields("l1m1t3s1", "Cálculo", "formerSlugs: [limite]")),
  "artifacts/limites-copia/index.mdx": artifact(fields("l1m1t3s1", "Cálculo")),
  "artifacts/derivadas/index.mdx": artifact(
    fields("d3r1v4d4", "calculo", "formerSlugs:", "  - limite", "  - api", "  - Derivada_Antiga"),
  ),
  "artifacts/integrais/index.mdx": artifact(
    fields("1nt3gr41", "Física", "formerSlugs: [derivadas, integrais]"),
  ),
  "artifacts/cdn-cgi/index.mdx": artifact(fields("cdnc9101", "Física")),
  "artifacts/Bad_Slug/index.mdx": artifact(fields("b4ds1ug1", "Física")),
};

const formerSlugsOfAShared = Array.from(
  { length: 24 },
  (_, index) => `  - compartilhado-${String(index + 1)}`,
);

const tooManyPublicPaths = {
  "artifacts/compartilhado/index.mdx": artifact(
    fields("c0mp4rt1", "Física", "public: true", "formerSlugs:", ...formerSlugsOfAShared),
  ),
};

const twoByTwoPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==",
  "base64",
);

const circleSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" /></svg>\n';

const contentAndOtherFiles = {
  "artifacts/celula/index.mdx": artifact(fields("c3lu1a01", "Biologia"), [
    'import Diagram from "@artifactory/design-system/diagram";',
    'import Figure from "@artifactory/design-system/figure";',
    'import Stepper from "@artifactory/design-system/stepper";',
    'import fluxo from "./fluxo.d2";',
    'import etapas from "./etapas.d2?steps";',
    'import celula from "./celula.svg?raw";',
    'import divisao from "./divisao.svg?raw";',
    "",
    "{/* As figuras vêm da aula 3. */}",
    "",
    '<Diagram src={fluxo} alt="Um fluxo de três etapas" />',
    "",
    '<Stepper diagram={etapas} alt="O fluxo, uma etapa por vez" />',
    "",
    '<Figure src={celula} alt="Uma célula" />',
    "",
    '<Stepper figure={divisao} alt="Uma célula se dividindo" captions={["Uma célula.", "Duas células."]} />',
    "",
    "![Uma foto](./foto.png)",
  ]),
  "artifacts/celula/fluxo.d2": "início -> meio -> fim\n",
  "artifacts/celula/etapas.d2": "início\n\nsteps: {\n  1: { início -> fim }\n}\n",
  "artifacts/celula/celula.svg": circleSvg,
  "artifacts/celula/divisao.svg": [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 20">',
    '  <circle data-step="1" cx="20" cy="10" r="8" />',
    '  <circle data-step="2" cx="10" cy="10" r="6" />',
    '  <circle data-step="2" cx="30" cy="10" r="6" />',
    "</svg>",
    "",
  ].join("\n"),
  "artifacts/celula/foto.png": twoByTwoPng,
  "artifacts/codigo/index.mdx": artifact(fields("c0d1g0a1", "Biologia"), [
    'import Diagram from "@artifactory/design-system/diagram";',
    'import { check } from "@artifactory/design-system/scoring";',
    'import ArtifactLayout from "@artifactory/design-system/artifact-layout";',
    'import outro from "../celula/fluxo.d2";',
    'import Orbita from "./orbita.svg";',
    "export const total = 2;",
    "",
    "<style>{`p { color: red; }`}</style>",
    "",
    "Dois mais dois é {1 + 1}.",
    "",
    "<Orbita />",
    "",
    '<Diagram src={outro} alt={["Um", "fluxo"].join(" ")} />',
    "",
    '<p style="color: red" onClick={() => check}>Vermelho.</p>',
    "",
    '<span {...{ lang: "en" }}>Hello</span>',
    "",
    '<script>{"console.log(ArtifactLayout)"}</script>',
  ]),
  "artifacts/codigo/orbita.svg": circleSvg,
  "artifacts/codigo/figura.svg": [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" onload="alert(1)">',
    "  <style>circle { fill: red; }</style>",
    '  <circle cx="10" cy="10" r="8" />',
    "  <script>alert(2)</script>",
    '  <a href="#topo"><text y="18">topo</text></a>',
    "</svg>",
    "",
  ].join("\n"),
  "artifacts/codigo/notas.txt": "Notas.\n",
  "artifacts/codigo/estilo.css": "p { color: red; }\n",
  "artifacts/codigo/extra/foto.png": twoByTwoPng,
  "artifacts/LEIAME.md": "Leia-me.\n",
};

function stage(build: string, options: string[], content: string[]): string[] {
  return [
    "<Stage",
    `  build="${build}"`,
    `  choose={{ label: "Começar em", options: [${options.map((option) => `"${option}"`).join(", ")}] }}`,
    '  prompt="Escolha um vértice."',
    "  figure={pontos}",
    '  alt="Dois pontos, A e B."',
    ">",
    "",
    ...content,
    "",
    "</Stage>",
    "",
  ];
}

function typedStage(build: string, examples: string, content: string[]): string[] {
  return [
    "<Stage",
    `  build="${build}"`,
    "  input={{",
    '    label: "Calcular",',
    '    fields: [{ name: "a", min: 1, max: 9999 }, { name: "b", min: 0, max: 9999 }],',
    `    examples: ${examples},`,
    "  }}",
    '  prompt="Digite dois números."',
    ">",
    "",
    ...content,
    "",
    "</Stage>",
    "",
  ];
}

const vertexTable = ["| Vértice | Chave |", "| ------- | ----: |", "| A       |     ∞ |"];

const mdcCode = [
  "```python",
  "def mdc(a, b):",
  "    while b != 0:",
  "        a, b = b, a % b",
  "    return a",
  "```",
];

const passTable = [
  "| Passagem |  a |  b |",
  "| -------- | -: | -: |",
  "| início   | 48 | 18 |",
  "| 1        | 18 | 12 |",
];

function build(...lines: string[]): string {
  return [
    'import { defineBuild } from "@artifactory/design-system/stage-build";',
    "",
    ...lines,
    "",
  ].join("\n");
}

const oneStep = "export default defineBuild({ steps: () => [{ say: 'Começa.' }] });";

const registersTable = [
  "| Register | Value |",
  "| -------- | ----: |",
  "| i        |     2 |",
  "| s        |    −1 |",
  "| D[0]     |     0 |",
  "| input    |  7, 2 |",
  "| output   |     — |",
];

const memoryTable = [
  "| Cell | Data | Role | Top |",
  "| ---- | ---: | ---- | --- |",
  "| M[0] |    ? |      |     |",
];

function machineStage(
  build: string,
  listing: string[],
  {
    fence = "```text start=0",
    examples = "[{ x: 7, y: 2 }]",
    tables = [...registersTable, "", ...memoryTable],
  } = {},
): string[] {
  return [
    "<Stage",
    `  build="${build}"`,
    "  input={{",
    '    label: "Run",',
    '    fields: [{ name: "x", min: 0, max: 9 }, { name: "y", min: 0, max: 9 }],',
    `    examples: ${examples},`,
    "  }}",
    '  prompt="Type x and y and run the program."',
    ">",
    "",
    fence,
    ...listing,
    "```",
    "",
    ...tables,
    "",
    "</Stage>",
    "",
  ];
}

function machineBuild(notes = 'reads: ["x", "y"]'): string {
  return [
    'import { trace } from "@artifactory/design-system/stage-build";',
    'import mepa from "@artifactory/design-system/machines/mepa";',
    "",
    `export default trace(mepa, { ${notes} });`,
    "",
  ].join("\n");
}

// Each Stage below refuses every run, except `unroled`'s, whose tables are its one example's
// result, worked out by hand: x = 7 is stored in M[0], and y = 2 is pushed to M[1] and printed.
const unfitMachineStages = [
  ...machineStage("unknown", ["INPP", "PUSH 3", "PARA", "FIM"]),
  ...machineStage("arguments", ["INPP", "AMEM", "CRVL 0", "ARMZ 0,x", "DSVS 3", "PARA", "FIM"], {
    examples: "[{ x: 7, y: 2 }, { x: 1, y: 1 }]",
  }),
  ...machineStage("from-one", ["INPP", "PARA", "FIM"], { fence: "```text" }),
  ...machineStage("no-input", ["INPP", "LEIT", "LEIT", "LEIT", "PARA", "FIM"]),
  ...machineStage("bottom", ["INPP", "DMEM 1", "PARA", "FIM"]),
  ...machineStage("not-started", ["AMEM 1", "PARA", "FIM"]),
  ...machineStage("no-value", ["INPP", "AMEM 1", "CRVL 0,0", "PARA", "FIM"]),
  ...machineStage("no-display", ["INPP", "CRVL 1,0", "PARA", "FIM"]),
  ...machineStage("below-zero", ["INPP", "CRVL 0,-1", "PARA", "FIM"]),
  ...machineStage("no-para", ["INPP", "FIM"]),
  ...machineStage("notes", ["INPP", "PARA", "FIM"]),
  ...machineStage("jumps", ["INPP", "DSVS L9", "L1: NADA", "PARA", "FIM"]),
  ...machineStage("labelled", ["INPP", "L1: NADA", "L1: NADA", "L2:", "PARA", "FIM"]),
  ...machineStage("labels", ["INPP", "PARA", "FIM"]),
  ...machineStage("calls", ["INPP", "CHPR L9,1", "CHPR L1", "L1: NADA", "PARA", "FIM"]),
  ...machineStage("subroutines", [
    "INPP",
    "AMEM 1",
    "CHPR L1,1",
    "PARA",
    "L1: ENPR 1",
    "RTPR 1,0",
    "L2: NADA",
    "FIM",
  ]),
  ...machineStage("reads", ["INPP", "PARA", "FIM"]),
  ...machineStage("no-registers", ["INPP", "PARA", "FIM"], { tables: memoryTable }),
  ...machineStage("no-top", ["INPP", "PARA", "FIM"], {
    tables: [
      ...registersTable,
      "",
      "| Cell | Data | Role |",
      "| ---- | ---: | ---- |",
      "| M[0] |    ? |      |",
    ],
  }),
  ...machineStage(
    "unroled",
    ["INPP", "AMEM 1", "LEIT", "ARMZ 0,0", "LEIT", "IMPR", "DMEM 1", "PARA", "FIM"],
    {
      tables: [
        "| Register | Value |",
        "| -------- | ----: |",
        "| i        |     7 |",
        "| s        |    −1 |",
        "| D[0]     |     0 |",
        "| input    |     — |",
        "| output   |     2 |",
        "",
        "| Cell | Data | Top |",
        "| ---- | ---: | --- |",
        "| M[0] |    7 |     |",
        "| M[1] |    2 |     |",
      ],
    },
  ),
];

const unfitMachineBuilds = {
  ...Object.fromEntries(
    [
      "unknown",
      "arguments",
      "from-one",
      "no-input",
      "bottom",
      "not-started",
      "no-value",
      "no-display",
      "below-zero",
      "no-para",
      "jumps",
      "labelled",
      "calls",
      "no-registers",
      "no-top",
      "unroled",
    ].map((name) => [`artifacts/stack-machine/${name}.build.ts`, machineBuild()]),
  ),
  "artifacts/stack-machine/notes.build.ts": machineBuild(
    'reads: ["x", "y"], roles: { 7: "x" }, after: { 9: "Done." }',
  ),
  "artifacts/stack-machine/reads.build.ts": machineBuild('reads: ["x", "z"]'),
  "artifacts/stack-machine/labels.build.ts": machineBuild(
    'reads: ["x", "y"], labels: { L2: "the end" }',
  ),
  "artifacts/stack-machine/subroutines.build.ts": machineBuild(
    'reads: ["x", "y"], subroutines: { L1: { params: ["a"], returns: false }, L2: { params: [], returns: true } }',
  ),
};

const customBuilds = {
  "artifacts/construcoes/index.mdx": artifact(fields("c0nstru1", "Biologia"), [
    'import Stage from "@artifactory/design-system/stage";',
    'import pontos from "./pontos.svg?raw";',
    'import cores from "./cores.svg?raw";',
    "",
    ...stage("importa", ["A"], vertexTable),
    ...stage("alcanca", ["A"], vertexTable),
    ...stage("lanca", ["A", "B"], vertexTable),
    ...stage("vazia", ["A"], vertexTable),
    ...stage("forma", ["A", "B", "C"], vertexTable),
    ...stage("marca", ["A"], vertexTable),
    "<Stage",
    '  build="colore"',
    '  choose={{ label: "Começar em", options: ["A"] }}',
    '  prompt="Escolha um vértice."',
    "  figure={cores}",
    '  alt="Um vértice A sem cor, ligado a um vértice B da cor R."',
    '  colours={["R", "G", "B"]}',
    "/>",
    "",
    ...stage("demais", ["A"], vertexTable),
    ...stage("trava", ["A", "B"], vertexTable),
    ...stage("dupla", ["A"], vertexTable),
    ...stage("dupla", ["A"], vertexTable),
    ...stage(
      "muda",
      ["A"],
      [...vertexTable, "", "| Vértice | Grau |", "| ------- | ---: |", "| A       |    1 |"],
    ),
    ...typedStage("escrita", "[{ a: 48, b: 18 }, { b: 0, a: 7 }]", [
      "| Variável | Valor |",
      "| -------- | ----: |",
      "| a        |     6 |",
      "| b        |    12 |",
      "",
      "| Contagem  | Total |",
      "| --------- | ----: |",
      "| passagens |     2 |",
    ]),
    ...typedStage("tipo", "[{ a: 48, b: 18 }]", ["Soma."]),
    ...typedStage("falta", "[{ a: 48, b: 18 }]", ["Soma."]),
    ...typedStage("literal", "[{ a: 48, b: 18 }]", ["Soma."]),
    ...typedStage("opcional", "[{ a: 48, b: 18 }]", ["Soma."]),
    ...typedStage("indice", "[{ a: 48, b: 18 }]", ["Soma."]),
    ...typedStage("uniao", "[{ a: 48, b: 18 }]", ["Soma."]),
    "<Stage",
    '  build="palavra-tipo"',
    "  input={{",
    '    label: "Aceita w?",',
    '    fields: [{ name: "w", kind: "text", alphabet: ["a", "b"], maxLength: 12 }],',
    '    examples: [{ w: "aabba" }],',
    "  }}",
    '  prompt="Digite uma palavra."',
    ">",
    "",
    "Lê.",
    "",
    "</Stage>",
    "",
    "<Stage",
    '  build="modulo-tipo"',
    "  input={{",
    '    label: "Calcular h(t, m)",',
    '    fields: [{ name: "t", kind: "text", maxLength: 40 }, { name: "m", min: 1, max: 997 }],',
    '    examples: [{ t: "olá mundo", m: 7 }],',
    "  }}",
    '  prompt="Digite um texto e um módulo."',
    ">",
    "",
    "Lê.",
    "",
    "</Stage>",
    "",
    ...stage("texto", ["A"], vertexTable),
    ...typedStage("linhas", "[{ a: 48, b: 18 }]", mdcCode),
    ...stage("desde-zero", ["A"], ["```python start=0", ...mdcCode.slice(1)]),
    ...stage("sem-codigo", ["A"], vertexTable),
    ...stage("dois-codigos", ["A"], [...mdcCode, "", ...mdcCode]),
    ...stage("uma-linha", ["A"], ["```python", "print(1)", "```"]),
    ...stage("uma-coluna", ["A"], ["| Passagem |", "| -------- |", "| início   |"]),
    ...stage("sem-tabela", ["A"], ["Soma."]),
    ...stage("duas-tabelas", ["A"], [...passTable, "", ...vertexTable]),
    ...stage("so-cabecalho", ["A"], ["| Passagem | a | b |", "| -------- | -: | -: |"]),
    ...stage("linhas-novas", ["A"], passTable),
    ...typedStage("mesa-cresce", "[{ a: 48, b: 18 }]", passTable),
    ...typedStage("mesa-encolhe", "[{ a: 48, b: 18 }]", passTable),
    ...typedStage(
      "mesa-lacunas",
      "[{ a: 48, b: 18 }, { a: 1, b: 0 }, { a: 2, b: 0 }, { a: 3, b: 0 }]",
      passTable,
    ),
    ...stage("mesa-volta", ["A"], passTable),
    ...typedStage("conteudo", "[{ a: 48, b: 18 }, { a: 7, b: 0 }]", [
      "```text start=0",
      "push a",
      "  add ; soma",
      "```",
      "",
      "| Lido   | Texto |",
      "| ------ | ----- |",
      "| código | —     |",
      "| tabela | —     |",
      "| língua | —     |",
    ]),
    ...typedStage("mepa-campos", "[{ a: 48, b: 18 }]", [
      "```text start=0",
      "INPP",
      "PARA",
      "FIM",
      "```",
      "",
      "| Registrador | Valor |",
      "| ----------- | ----: |",
      "| i           |     1 |",
      "| s           |    −1 |",
      "| D[0]        |     0 |",
      "| entrada     |    48 |",
      "| saída       |     — |",
    ]),
  ]),
  // The first example worked by hand: 7 div 2 leaves 3 in M[2], not the 4 the table has, and the
  // second divides by zero at line 8.
  "artifacts/stack-machine/index.mdx": artifact(
    [
      "id: st4ckm4c",
      "title: A stack machine",
      "subject: Compilers",
      "lang: en",
      "published: 2026-10-15",
    ],
    [
      'import Stage from "@artifactory/design-system/stage";',
      "",
      "<Stage",
      '  build="divide"',
      "  input={{",
      '    label: "Run",',
      '    fields: [{ name: "x", min: 0, max: 9 }, { name: "y", min: 0, max: 9 }],',
      "    examples: [{ x: 7, y: 2 }, { x: 7, y: 0 }],",
      "  }}",
      '  prompt="Type x and y and run the program."',
      ">",
      "",
      "```text start=0",
      "INPP",
      "AMEM 2",
      "LEIT",
      "ARMZ 0,0",
      "LEIT",
      "ARMZ 0,1",
      "CRVL 0,0",
      "CRVL 0,1",
      "DIVI",
      "IMPR",
      "DMEM 2",
      "PARA",
      "FIM",
      "```",
      "",
      "| Register | Value |",
      "| -------- | ----: |",
      "| i        |    11 |",
      "| s        |    −1 |",
      "| D[0]     |     0 |",
      "| input    |     — |",
      "| output   |     3 |",
      "",
      "| Cell | Data | Role | Top |",
      "| ---- | ---: | ---- | --- |",
      "| M[0] |    7 |      |     |",
      "| M[1] |    2 |      |     |",
      "| M[2] |    4 |      |     |",
      "| M[3] |    2 |      |     |",
      "",
      "</Stage>",
      "",
      ...unfitMachineStages,
    ],
  ),
  ...unfitMachineBuilds,
  "artifacts/stack-machine/divide.build.ts": [
    'import { trace } from "@artifactory/design-system/stage-build";',
    'import mepa from "@artifactory/design-system/machines/mepa";',
    "",
    'export default trace(mepa, { reads: ["x", "y"], roles: { 1: ["x", "y"] } });',
    "",
  ].join("\n"),
  "artifacts/construcoes/mepa-campos.build.ts": [
    'import { trace } from "@artifactory/design-system/stage-build";',
    'import mepa from "@artifactory/design-system/machines/mepa";',
    "",
    'export default trace(mepa, { reads: ["a"] });',
    "",
  ].join("\n"),
  "artifacts/construcoes/pontos.svg": [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40">',
    '  <circle data-part="A" cx="20" cy="20" r="10" class="stroke-text" />',
    '  <circle data-part="B" cx="80" cy="20" r="10" class="stroke-text" />',
    '  <circle data-part="D" cx="50" cy="20" r="4" class="fill-muted" />',
    "</svg>",
    "",
  ].join("\n"),
  "artifacts/construcoes/cores.svg": [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40">',
    '  <line data-part="AB" x1="20" y1="20" x2="80" y2="20" class="stroke-text" />',
    '  <g data-part="A">',
    '    <circle cx="20" cy="20" r="12" class="fill-surface stroke-text" />',
    '    <text x="20" y="20" data-swatch=""></text>',
    "  </g>",
    '  <g data-part="B">',
    '    <circle cx="80" cy="20" r="12" class="fill-swatch-1 stroke-text" />',
    '    <text x="80" y="20" data-swatch="1">R</text>',
    "  </g>",
    "</svg>",
    "",
  ].join("\n"),
  "artifacts/construcoes/colore.build.ts": build(
    "export default defineBuild({",
    "  steps: () => [",
    "    { say: 'A fica G e B fica sem cor.', colours: { A: 2, B: null } },",
    "    { say: 'AB fica R.', colours: { AB: 1 } },",
    "    { say: 'Z fica R.', colours: { Z: 1 } },",
    "    { say: 'A fica com a cor 4.', colours: { A: 4 } },",
    "    { say: 'A fica com a cor 7.', colours: { A: 7 } },",
    "    { say: 'A fica com a cor 1,5.', colours: { A: 1.5 } },",
    "    { say: 'A fica com a cor 0.', colours: { A: 0 } },",
    "    { say: 'A fica sem lista.', colours: ['A'] as never },",
    "  ],",
    "});",
  ),
  "artifacts/construcoes/importa.build.ts": build(
    'import { readFileSync } from "node:fs";',
    "",
    "export default defineBuild({ steps: () => [{ say: String(readFileSync) }] });",
  ),
  "artifacts/construcoes/alcanca.build.ts": build(
    oneStep,
    "",
    "export const alcance = () => [document, window, fetch, localStorage, process];",
  ),
  "artifacts/construcoes/lanca.build.ts": build(
    "export default defineBuild({",
    "  steps(start) {",
    "    if (start === 'B') throw new Error('B não tem vizinhos');",
    "    return [{ say: `Começa em ${start}.` }];",
    "  },",
    "});",
  ),
  "artifacts/construcoes/vazia.build.ts": build("export default defineBuild({ steps: () => [] });"),
  "artifacts/construcoes/forma.build.ts": build(
    "export default defineBuild({",
    "  steps(start) {",
    "    if (start === 'A') return { say: 'Começa.' } as never;",
    "    if (start === 'B') return [{ say: 2, parts: { A: 'negrito' } }] as never;",
    "    return [{ say: `Começa em ${start}.` }];",
    "  },",
    "});",
  ),
  "artifacts/construcoes/marca.build.ts": build(
    "export default defineBuild({ steps: () => [{ say: 'Marca D.', parts: { D: 'dashed' } }] });",
  ),
  "artifacts/construcoes/demais.build.ts": build(
    "export default defineBuild({",
    "  steps: () => Array.from({ length: 201 }, (_, step) => ({ say: `Passo ${String(step)}.` })),",
    "});",
  ),
  "artifacts/construcoes/trava.build.ts": build(
    "export default defineBuild({",
    "  steps() {",
    "    for (;;);",
    "  },",
    "});",
  ),
  "artifacts/construcoes/dupla.build.ts": build(oneStep),
  "artifacts/construcoes/escrita.build.ts": build(
    "export default defineBuild<{ a: number; b: number }>({",
    "  steps(input) {",
    "    if (input.b === 0) throw new Error('b é zero');",
    "    let { a, b } = input;",
    "    let passes = 0;",
    "    for (; b !== 0; passes++) [a, b] = [b, a % b];",
    "    const values = [String(a), String(b)];",
    "    const cells = ['a', 'b'].map((row, at) => ({ row, column: 'Valor', text: values[at] ?? '' }));",
    "    return [{ say: 'Acaba.', cells: [...cells, { row: 'passagens', column: 'Total', text: String(passes) }] }];",
    "  },",
    "});",
  ),
  "artifacts/construcoes/tipo.build.ts": build(
    "export default defineBuild<{ a: number; c: number }>({ steps: (input) => [{ say: `Soma ${String(input.a + input.c)}.` }] });",
  ),
  "artifacts/construcoes/falta.build.ts": build(
    "export default defineBuild<{ a: number }>({ steps: (input) => [{ say: `Soma ${String(input.a)}.` }] });",
  ),
  "artifacts/construcoes/literal.build.ts": build(
    "export default defineBuild<{ a: number; b: 7 }>({ steps: (input) => [{ say: `Soma ${String(input.a + input.b)}.` }] });",
  ),
  "artifacts/construcoes/opcional.build.ts": build(
    "export default defineBuild<{ a: number; b?: number }>({ steps: (input) => [{ say: `Soma ${String(input.a)}.` }] });",
  ),
  "artifacts/construcoes/indice.build.ts": build(
    "export default defineBuild<{ a: number; b: number; [name: string]: number }>({ steps: (input) => [{ say: `Soma ${String(input.a)}.` }] });",
  ),
  "artifacts/construcoes/uniao.build.ts": build(
    "export default defineBuild<{ a: number; b: number } | { a: number; b: number; c: number }>({ steps: (input) => [{ say: `Soma ${String(input.a)}.` }] });",
  ),
  "artifacts/construcoes/palavra-tipo.build.ts": build(
    "export default defineBuild<{ w: number }>({ steps: (input) => [{ say: `Lê ${String(input.w)}.` }] });",
  ),
  "artifacts/construcoes/modulo-tipo.build.ts": build(
    "export default defineBuild<{ t: string; m: string }>({ steps: (input) => [{ say: `Lê ${input.t} ${input.m}.` }] });",
  ),
  "artifacts/construcoes/texto.build.ts": build(
    "export default defineBuild<{ a: number }>({ steps: (input) => [{ say: `Começa em ${String(input.a)}.` }] });",
  ),
  "artifacts/construcoes/linhas.build.ts": build(
    "export default defineBuild<{ a: number; b: number }>({",
    "  steps: () => [",
    "    { say: 'Recebe a e b.', lines: { 1: 'reversed', 4: 'muted' } },",
    "    { say: 'Devolve a.', lines: { 9: 'reversed' } },",
    "    { say: 'Roda o laço.', lines: { 2: 'reversed', 3: 'reversed' } },",
    "    { say: 'Marca.', lines: { 0: 'strong', 2: 'negrito' } } as never,",
    "  ],",
    "});",
  ),
  "artifacts/construcoes/desde-zero.build.ts": build(
    "export default defineBuild({",
    "  steps: () => [",
    "    { say: 'Recebe a e b.', lines: { 0: 'reversed', 3: 'muted' } },",
    "    { say: 'Devolve a.', lines: { 4: 'reversed' } },",
    "  ],",
    "});",
  ),
  "artifacts/construcoes/sem-codigo.build.ts": build(
    "export default defineBuild({ steps: () => [{ say: 'Começa.', lines: { 1: 'reversed' } }] });",
  ),
  "artifacts/construcoes/dois-codigos.build.ts": build(
    "export default defineBuild({ steps: () => [{ say: 'Começa.', lines: { 1: 'reversed' } }] });",
  ),
  "artifacts/construcoes/uma-coluna.build.ts": build(
    "export default defineBuild({ steps: () => [{ say: 'Começa.', body: [['início', '48']] }] });",
  ),
  "artifacts/construcoes/uma-linha.build.ts": build(
    "export default defineBuild({ steps: () => [{ say: 'Começa.', lines: { 2: 'reversed' } }] });",
  ),
  "artifacts/construcoes/sem-tabela.build.ts": build(
    "export default defineBuild({ steps: () => [{ say: 'Começa.', body: [['início', '48', '18']] }] });",
  ),
  "artifacts/construcoes/duas-tabelas.build.ts": build(
    "export default defineBuild({ steps: () => [{ say: 'Começa.', body: [['início', '48', '18']] }] });",
  ),
  "artifacts/construcoes/so-cabecalho.build.ts": build(
    "export default defineBuild({ steps: () => [{ say: 'Começa.', body: [['início', '48', '18']] }] });",
  ),
  "artifacts/construcoes/linhas-novas.build.ts": build(
    "export default defineBuild({",
    "  steps: () => [",
    "    { say: 'Começa.', body: [['início', '48', '18'], ['1', '18'], ['2', '12', '6', '0'], ['3']] },",
    "    { say: 'Marca.', body: [['início', '48', '18']], rows: { 1: 'strong' } },",
    "    { say: 'Muda.', body: [['início', '48', '18']], cells: [{ row: '1', column: 'a', mark: 'strong' }] },",
    "    { say: 'Forma.', body: [['início', 48]] } as never,",
    "    { say: 'Cresce.', body: [['início', '48', '18'], ['1', '18', '12'], ['2', '12', '6']], rows: { 2: 'reversed' }, cells: [{ row: '2', column: 'b', text: '6', mark: 'strong' }] },",
    "  ],",
    "});",
  ),
  "artifacts/construcoes/mesa-cresce.build.ts": build(
    "export default defineBuild<{ a: number; b: number }>({",
    "  steps: () => [{ say: 'Acaba.', body: [['início', '48', '18'], ['1', '18', '12'], ['2', '12', '6']] }],",
    "});",
  ),
  "artifacts/construcoes/mesa-encolhe.build.ts": build(
    "export default defineBuild<{ a: number; b: number }>({",
    "  steps: () => [{ say: 'Acaba.', body: [['início', '48', '18']] }],",
    "});",
  ),
  "artifacts/construcoes/mesa-lacunas.build.ts": build(
    "const passes = [['início', '48', '18'], ['1', '18', '12']];",
    "",
    "export default defineBuild<{ a: number; b: number }>({",
    "  steps: ({ a }) => [",
    "    a === 1 ? { say: 'Começa.' } : { say: 'Começa.', body: [] },",
    "    a === 2 ? { say: 'Passa.' } : { say: 'Passa.', body: passes.slice(0, 1).map((cells) => [...cells]) },",
    "    a === 3 ? { say: 'Acaba.' } : { say: 'Acaba.', body: passes.map((cells) => [...cells]) },",
    "  ],",
    "});",
  ),
  "artifacts/construcoes/mesa-volta.build.ts": build(
    "export default defineBuild({",
    "  steps: () => [{ say: 'Começa.', body: [['início', '48', '18']] }, { say: 'Volta.' }],",
    "});",
  ),
  "artifacts/construcoes/conteudo.build.ts": build(
    "export default defineBuild<{ a: number; b: number }>({",
    "  steps(_input, { lang, code, tables }) {",
    "    const [lines = []] = code;",
    "    const [table] = tables;",
    "    if (lines.length !== 2 || table?.rows[0]?.[1] !== '—') throw new Error('o conteúdo mudou');",
    "    const seen = [",
    "      lines.map(({ line, text }) => `${String(line)}:${text}`).join('|'),",
    "      `${table.columns.join('/')} ${(table.rows[1] ?? []).join('/')}`,",
    "      lang,",
    "    ];",
    "    code.length = 0;",
    "    for (const row of table.rows) row.fill('mudou');",
    "    return [{ say: 'Lê.', cells: ['código', 'tabela', 'língua'].map((row, at) => ({ row, column: 'Texto', text: seen[at] ?? '' })) }];",
    "  },",
    "});",
  ),
  "artifacts/construcoes/sobra.build.ts": build(oneStep),
  "artifacts/construcoes/muda.build.ts": build(
    "export default defineBuild({",
    "  steps: () => [",
    "    { say: 'Começa.', parts: { A: 'reversed', C: 'strong' } },",
    "    { say: ' ', rows: { B: 'muted' } },",
    "    { say: 'Muda.', rows: { A: 'reversed' }, cells: [{ row: 'A', column: 'Peso', text: '2' }] },",
    "  ],",
    "});",
  ),
};

const brokenHtml = {
  "artifacts/quimica/index.mdx": artifact(fields("qu1m1ca1", "Química"), [
    'import Diagram from "@artifactory/design-system/diagram";',
    'import reacao from "./reacao.d2";',
    "",
    "A energia é $E = mc^2$ e a velocidade média é $v_{\\text{média}} = \\frac{\\Delta s}{\\Delta t}$.",
    "",
    '<Diagram src={reacao} alt="Reagentes viram produtos" />',
    "",
    "### Detalhes",
    "",
    '<p id="nota">Primeira nota.</p>',
    "",
    '<p id="nota">Segunda nota.</p>',
    "",
    "Veja [](https://example.com) também.",
  ]),
  "artifacts/quimica/reacao.d2": "reagentes -> produtos: calor\n",
  "src/pages/404.astro": [
    "---",
    'const title: typeof Astro.locals.fixtureTitle = "Not found";',
    "---",
    "",
    "<!doctype html>",
    '<html lang="en">',
    "  <head>",
    '    <meta charset="utf-8" />',
    "    <title>Not found</title>",
    "  </head>",
    "  <body>",
    "    <main>",
    "      <h3>{title}</h3>",
    "    </main>",
    "  </body>",
    "</html>",
    "",
  ].join("\n"),
};

describe.each([
  { scope: "full", args: [], fullScope: true },
  { scope: "artifacts only", args: ["--artifacts-only"], fullScope: false },
])(
  "a repo whose artifacts break the artifact checks and whose built pages break HTML rules ($scope)",
  ({ args, fullScope }) => {
    let repo: FixtureRepo;
    let run: CheckRun;

    beforeAll(async () => {
      repo = await createFixtureRepo({
        ...sharedIdsSlugsAndSubjects,
        ...tooManyPublicPaths,
        ...contentAndOtherFiles,
        ...customBuilds,
        ...brokenHtml,
      });
      const configFile = join(repo.root, "astro.config.ts");
      const config = await readFile(configFile, "utf8");
      await writeFile(
        configFile,
        config.replace(
          "integrations: [",
          'integrations: [{ name: "fixture-types", hooks: { "astro:config:done": ({ injectTypes }) => { injectTypes({ filename: "fixture.d.ts", content: "declare namespace App { interface Locals { fixtureTitle: number; } }" }); } } },',
        ),
      );
      await succeeds(repo.run("pnpm", ["exec", "prettier", "--write", "astro.config.ts"]));
      run = await repo.check(args);
    }, checkTimeout);

    afterAll(() => repo.remove());

    if (fullScope) {
      it("checks Astro pages against integration-provided types after a successful build", () => {
        expect(run.output).toContain("pnpm check: astro build passed");
        expect(run.output).toContain("pnpm check: astro check failed");
        expect(linesFor(run, "TS2322").filter((line) => line.startsWith("src/"))).toEqual([
          "src/pages/404.astro:2:7 error TS2322: Type 'string' is not assignable to type 'number'. (artifact skill: Platform changes)",
        ]);
      });
    } else {
      it("qualifies the selected checks at startup and beside the result, without passing omitted checks", () => {
        const qualification =
          "pnpm check: artifact scope (--artifacts-only): restricted artifact and catalog build TSC still runs; omitted: Astro template check, root and Worker TSC, ESLint, Prettier, Vitest. Full-scope checking is required before publication.";
        expect(run.output.split(qualification)).toHaveLength(3);
        expect(run.output.indexOf(qualification)).toBeLessThan(
          run.output.indexOf("pnpm check: astro build"),
        );
        expect(run.output).toContain(`${qualification}\n\npnpm check: 131 failures\n`);
        expect(run.output).toContain("pnpm check: restricted build tsc failed");
        expect(run.output).not.toMatch(
          /pnpm check: (astro check|tsc|ESLint|Prettier|Vitest) (passed|failed)/,
        );
        expect(run.output).not.toContain("pnpm check: running Vitest:");
        expect(run.output).not.toContain("pnpm check: skipped Vitest:");
        expect(linesFor(run, "TS2322").filter((line) => line.startsWith("src/"))).toEqual([]);
      });
    }

    describe("IDs, slugs and subjects across artifacts", () => {
      it("fails a copied artifact ID at every artifact that uses it", () => {
        expect(run.exitCode).toBe(1);
        expect(linesFor(run, "artifact-id")).toEqual([
          "artifacts/limites-copia/index.mdx:2:1 error artifact-id: the artifact ID `l1m1t3s1` is also used by artifacts/limites/index.mdx (artifact skill: Frontmatter)",
          "artifacts/limites/index.mdx:2:1 error artifact-id: the artifact ID `l1m1t3s1` is also used by artifacts/limites-copia/index.mdx (artifact skill: Frontmatter)",
        ]);
      });

      it("fails slugs and former slugs that aren't kebab-case, take a platform route or clash", () => {
        expect(linesFor(run, "slug")).toEqual([
          "artifacts/Bad_Slug/index.mdx:1:1 error slug: the slug `Bad_Slug` isn't lowercase ASCII kebab-case (artifact skill: Slugs)",
          "artifacts/cdn-cgi/index.mdx:1:1 error slug: the slug `cdn-cgi` is a platform route (artifact skill: Slugs)",
          "artifacts/derivadas/index.mdx:1:1 error slug: the slug `derivadas` is also a former slug of artifacts/integrais/index.mdx (artifact skill: Slugs)",
          "artifacts/derivadas/index.mdx:8:1 error slug: the former slug `limite` is also a former slug of artifacts/limites/index.mdx (artifact skill: Slugs)",
          "artifacts/derivadas/index.mdx:9:1 error slug: the former slug `api` is a platform route (artifact skill: Slugs)",
          "artifacts/derivadas/index.mdx:10:1 error slug: the former slug `Derivada_Antiga` isn't lowercase ASCII kebab-case (artifact skill: Slugs)",
          "artifacts/integrais/index.mdx:1:1 error slug: the slug `integrais` is also a former slug of this artifact (artifact skill: Slugs)",
          "artifacts/integrais/index.mdx:7:1 error slug: the former slug `derivadas` is also the slug of artifacts/derivadas/index.mdx (artifact skill: Slugs)",
          "artifacts/integrais/index.mdx:7:1 error slug: the former slug `integrais` is also this artifact's slug (artifact skill: Slugs)",
          "artifacts/limites/index.mdx:7:1 error slug: the former slug `limite` is also a former slug of artifacts/derivadas/index.mdx (artifact skill: Slugs)",
        ]);
      });

      it("fails subjects that differ only in case or accents, naming each spelling and its artifacts", () => {
        expect(linesFor(run, "subject")).toEqual([
          "artifacts/derivadas/index.mdx:4:1 error subject: the subject `calculo` (artifacts/derivadas/index.mdx) differs only in case or accents from `Cálculo` (artifacts/limites-copia/index.mdx, artifacts/limites/index.mdx) (artifact skill: Frontmatter)",
          "artifacts/limites-copia/index.mdx:4:1 error subject: the subject `Cálculo` (artifacts/limites-copia/index.mdx, artifacts/limites/index.mdx) differs only in case or accents from `calculo` (artifacts/derivadas/index.mdx) (artifact skill: Frontmatter)",
        ]);
      });

      it("fails public artifacts whose paths need more destinations than one Access app holds", () => {
        expect(linesFor(run, "public")).toEqual([
          "artifacts/compartilhado/index.mdx:7:1 error public: public artifacts need 52 Access destinations, and one Access app holds 50; ask the owner which to make private (artifact skill: Frontmatter)",
        ]);
      });
    });

    describe("content only", () => {
      it("accepts components, diagrams, figures, images and MDX comments", () => {
        expect(run.summary.filter((line) => line.startsWith("artifacts/celula/"))).toEqual([]);
      });

      it("fails imports other than components and the diagrams and figures beside the entry", () => {
        expect(linesFor(run, "import")).toEqual([
          "artifacts/codigo/index.mdx:10:23 error import: `@artifactory/design-system/scoring` isn't a component an artifact can import (artifact skill: Content only)",
          "artifacts/codigo/index.mdx:11:28 error import: `@artifactory/design-system/artifact-layout` isn't a component an artifact can import (artifact skill: Content only)",
          "artifacts/codigo/index.mdx:12:19 error import: `../celula/fluxo.d2` isn't a design system component or a diagram or figure beside the entry (artifact skill: Content only)",
          "artifacts/codigo/index.mdx:13:20 error import: `./orbita.svg` is imported without `?raw` (artifact skill: Content only)",
        ]);
      });

      it("fails styles, scripts and JavaScript other than imports, in the MDX and in SVG files, and links in SVG files", () => {
        expect(linesFor(run, "content-only")).toEqual([
          "artifacts/codigo/figura.svg:1:61 error content-only: `onload` attributes aren't content (artifact skill: Content only)",
          "artifacts/codigo/figura.svg:2:3 error content-only: `<style>` elements aren't content (artifact skill: Content only)",
          "artifacts/codigo/figura.svg:4:3 error content-only: `<script>` elements aren't content (artifact skill: Content only)",
          "artifacts/codigo/figura.svg:5:3 error content-only: `<a>` elements aren't content (artifact skill: Content only)",
          "artifacts/codigo/index.mdx:14:1 error content-only: `export const total = 2;` is JavaScript, not an import (artifact skill: Content only)",
          "artifacts/codigo/index.mdx:16:1 error content-only: `<style>` elements aren't content (artifact skill: Content only)",
          "artifacts/codigo/index.mdx:18:18 error content-only: `{1 + 1}` is JavaScript, not content (artifact skill: Content only)",
          'artifacts/codigo/index.mdx:22:22 error content-only: the `alt` value `{["Um", "fluxo"].join(" ")}` is JavaScript, not data (artifact skill: Content only)',
          "artifacts/codigo/index.mdx:24:4 error content-only: `style` attributes aren't content (artifact skill: Content only)",
          "artifacts/codigo/index.mdx:24:23 error content-only: `onClick` attributes aren't content (artifact skill: Content only)",
          'artifacts/codigo/index.mdx:26:7 error content-only: `{...{ lang: "en" }}` is JavaScript, not content (artifact skill: Content only)',
          "artifacts/codigo/index.mdx:28:1 error content-only: `<script>` elements aren't content (artifact skill: Content only)",
        ]);
      });

      it("fails files beside the entry that aren't diagrams, figures, images or the build of one Stage, and loose files", () => {
        expect(linesFor(run, "artifact-file")).toEqual([
          "artifacts/codigo/estilo.css:1:1 error artifact-file: `estilo.css` isn't a diagram, figure, image or custom build (artifact skill: Artifact files)",
          "artifacts/codigo/extra:1:1 error artifact-file: `extra/` isn't a diagram, figure, image or custom build (artifact skill: Artifact files)",
          "artifacts/codigo/notas.txt:1:1 error artifact-file: `notas.txt` isn't a diagram, figure, image or custom build (artifact skill: Artifact files)",
          "artifacts/construcoes/dupla.build.ts:1:1 error artifact-file: `dupla.build.ts` is the build of 2 Stages; give each Stage its own build (artifact skill: Artifact files)",
          "artifacts/construcoes/sobra.build.ts:1:1 error artifact-file: `sobra.build.ts` is a custom build that no Stage in the entry names (artifact skill: Artifact files)",
          "artifacts/LEIAME.md:1:1 error artifact-file: `LEIAME.md` isn't an artifact folder (artifact skill: Artifact files)",
        ]);
      });
    });

    describe("custom builds", () => {
      const customBuildLines = () =>
        run.summary.filter((line) => line.endsWith("(artifact skill: Custom builds)"));

      it("accepts a Stage's build beside its entry and nothing else from it", () => {
        expect(
          run.summary.filter(
            (line) =>
              line.startsWith("artifacts/construcoes/index.mdx") ||
              line.startsWith("artifacts/construcoes/pontos.svg") ||
              line.startsWith("artifacts/construcoes/cores.svg"),
          ),
        ).toEqual([]);
      });

      it("fails a build that imports anything but the build contract, at the import", () => {
        expect(linesFor(run, "build-import")).toEqual([
          "artifacts/construcoes/importa.build.ts:3:30 error build-import: `node:fs` isn't `@artifactory/design-system/stage-build` or a machine under `@artifactory/design-system/machines/`, the only modules a build may import (artifact skill: Custom builds)",
        ]);
      });

      it("fails a build that reaches for the DOM, the network, storage or Node, at each name", () => {
        expect(
          customBuildLines().filter((line) => line.startsWith("artifacts/construcoes/alcanca")),
        ).toEqual([
          "artifacts/construcoes/alcanca.build.ts:5:31 error TS2584: Cannot find name 'document'. Do you need to change your target library? Try changing the 'lib' compiler option to include 'dom'. (artifact skill: Custom builds)",
          "artifacts/construcoes/alcanca.build.ts:5:41 error TS2304: Cannot find name 'window'. (artifact skill: Custom builds)",
          "artifacts/construcoes/alcanca.build.ts:5:49 error TS2304: Cannot find name 'fetch'. (artifact skill: Custom builds)",
          "artifacts/construcoes/alcanca.build.ts:5:56 error TS2304: Cannot find name 'localStorage'. (artifact skill: Custom builds)",
          "artifacts/construcoes/alcanca.build.ts:5:70 error TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig. (artifact skill: Custom builds)",
        ]);
      });

      it("fails a build whose input type isn't what its Stage gives it, at the type", () => {
        expect(linesFor(run, "build-input")).toEqual([
          "artifacts/construcoes/falta.build.ts:3:28 error build-input: `steps` takes `{ a: number }`, but the Stage's fields give it `{ a: number; b: number }`: write `defineBuild<{ a: number; b: number }>` (artifact skill: Custom builds)",
          "artifacts/construcoes/indice.build.ts:3:28 error build-input: `steps` takes `{ [name: string]: number; a: number; b: number }`, but the Stage's fields give it `{ a: number; b: number }`: write `defineBuild<{ a: number; b: number }>` (artifact skill: Custom builds)",
          "artifacts/construcoes/literal.build.ts:3:28 error build-input: `steps` takes `{ a: number; b: 7 }`, but the Stage's fields give it `{ a: number; b: number }`: write `defineBuild<{ a: number; b: number }>` (artifact skill: Custom builds)",
          "artifacts/construcoes/mepa-campos.build.ts:4:16 error build-input: `steps` takes `{ a: number }`, but the Stage's fields give it `{ a: number; b: number }`: name exactly the Stage's fields in `reads` (artifact skill: Custom builds)",
          "artifacts/construcoes/modulo-tipo.build.ts:3:28 error build-input: `steps` takes `{ t: string; m: string }`, but the Stage's fields give it `{ t: string; m: number }`: write `defineBuild<{ t: string; m: number }>` (artifact skill: Custom builds)",
          "artifacts/construcoes/opcional.build.ts:3:28 error build-input: `steps` takes `{ a: number; b?: number }`, but the Stage's fields give it `{ a: number; b: number }`: write `defineBuild<{ a: number; b: number }>` (artifact skill: Custom builds)",
          "artifacts/construcoes/palavra-tipo.build.ts:3:28 error build-input: `steps` takes `{ w: number }`, but the Stage's fields give it `{ w: string }`: write `defineBuild<{ w: string }>` (artifact skill: Custom builds)",
          "artifacts/construcoes/texto.build.ts:3:28 error build-input: `steps` takes `{ a: number }`, but the Stage's options give it text: write `defineBuild` without a type (artifact skill: Custom builds)",
          "artifacts/construcoes/tipo.build.ts:3:28 error build-input: `steps` takes `{ a: number; c: number }`, but the Stage's fields give it `{ a: number; b: number }`: write `defineBuild<{ a: number; b: number }>` (artifact skill: Custom builds)",
          "artifacts/construcoes/uniao.build.ts:3:28 error build-input: `steps` takes `{ a: number; b: number } | { a: number; b: number; c: number }`, but the Stage's fields give it `{ a: number; b: number }`: write `defineBuild<{ a: number; b: number }>` (artifact skill: Custom builds)",
          "artifacts/stack-machine/reads.build.ts:4:16 error build-input: `steps` takes `{ x: number; z: number }`, but the Stage's fields give it `{ x: number; y: number }`: name exactly the Stage's fields in `reads` (artifact skill: Custom builds)",
        ]);
      });

      it("runs every build on every option and example against the built page, naming it, the step and what's missing", () => {
        expect(
          linesFor(run, "stage-run").filter((line) => !line.startsWith("artifacts/stack-machine/")),
        ).toEqual([
          "artifacts/construcoes/colore.build.ts:1:1 error stage-run: with `A`, step 2 colours the part `AB`, which holds no label: put a `<text data-swatch>` in its `<g>`, empty if it's uncoloured as written (artifact skill: Custom builds)",
          "artifacts/construcoes/colore.build.ts:1:1 error stage-run: with `A`, step 3 colours the part `Z`, which the drawing doesn't have (artifact skill: Custom builds)",
          "artifacts/construcoes/colore.build.ts:1:1 error stage-run: with `A`, step 4 colours the part `A` with 4, past the 3 colours `colours` names: add its name to `colours`, or use 1 to 3 (artifact skill: Custom builds)",
          "artifacts/construcoes/colore.build.ts:1:1 error stage-run: with `A`, step 5 colours the part `A` with 7, which isn't a swatch: give a whole number from 1 to 6, or `null` for uncoloured (artifact skill: Custom builds)",
          "artifacts/construcoes/colore.build.ts:1:1 error stage-run: with `A`, step 6 colours the part `A` with 1.5, which isn't a swatch: give a whole number from 1 to 6, or `null` for uncoloured (artifact skill: Custom builds)",
          "artifacts/construcoes/colore.build.ts:1:1 error stage-run: with `A`, step 7 colours the part `A` with 0, which isn't a swatch: give a whole number from 1 to 6, or `null` for uncoloured (artifact skill: Custom builds)",
          "artifacts/construcoes/colore.build.ts:1:1 error stage-run: with `A`, step 8 has `colours` that isn't an object of colours by name (artifact skill: Custom builds)",
          "artifacts/construcoes/conteudo.build.ts:1:1 error stage-run: with `a = 48, b = 18`, the first example, the last step leaves `0:push a|1:  add ; soma` in the row `código` and the column `Texto`, and the table as written has `—`; write the tables as the first example leaves them (artifact skill: Custom builds)",
          "artifacts/construcoes/conteudo.build.ts:1:1 error stage-run: with `a = 48, b = 18`, the first example, the last step leaves `Lido/Texto tabela/—` in the row `tabela` and the column `Texto`, and the table as written has `—`; write the tables as the first example leaves them (artifact skill: Custom builds)",
          "artifacts/construcoes/conteudo.build.ts:1:1 error stage-run: with `a = 48, b = 18`, the first example, the last step leaves `pt-BR` in the row `língua` and the column `Texto`, and the table as written has `—`; write the tables as the first example leaves them (artifact skill: Custom builds)",
          "artifacts/construcoes/demais.build.ts:1:1 error stage-run: with `A`, `steps` returns more than 200 steps (artifact skill: Custom builds)",
          "artifacts/construcoes/desde-zero.build.ts:1:1 error stage-run: with `A`, step 2 marks the line `4`, which the code doesn't have: it has lines 0 to 3 (artifact skill: Custom builds)",
          "artifacts/construcoes/dois-codigos.build.ts:1:1 error stage-run: with `A`, step 1 has `lines`, but the Stage holds 2 code blocks: `lines` marks the lines of exactly one (artifact skill: Custom builds)",
          "artifacts/construcoes/duas-tabelas.build.ts:1:1 error stage-run: with `A`, step 1 has `body`, but the Stage holds 2 tables: `body` rewrites the rows of exactly one (artifact skill: Custom builds)",
          "artifacts/construcoes/escrita.build.ts:1:1 error stage-run: with `a = 48, b = 18`, the first example, the last step leaves `0` in the row `b` and the column `Valor`, and the table as written has `12`; write the tables as the first example leaves them (artifact skill: Custom builds)",
          "artifacts/construcoes/escrita.build.ts:1:1 error stage-run: with `a = 48, b = 18`, the first example, the last step leaves `3` in the row `passagens` and the column `Total`, and the table as written has `2`; write the tables as the first example leaves them (artifact skill: Custom builds)",
          "artifacts/construcoes/escrita.build.ts:5:30 error stage-run: with `a = 7, b = 0`, `steps` throws: b é zero (artifact skill: Custom builds)",
          "artifacts/construcoes/forma.build.ts:1:1 error stage-run: with `A`, `steps` returns something that isn't a list of steps (artifact skill: Custom builds)",
          "artifacts/construcoes/forma.build.ts:1:1 error stage-run: with `B`, step 1 has a `say` that isn't text (artifact skill: Custom builds)",
          "artifacts/construcoes/forma.build.ts:1:1 error stage-run: with `B`, step 1 marks `A` in `parts` with `negrito`, which isn't a mark (artifact skill: Custom builds)",
          "artifacts/construcoes/lanca.build.ts:5:30 error stage-run: with `B`, `steps` throws: B não tem vizinhos (artifact skill: Custom builds)",
          "artifacts/construcoes/linhas-novas.build.ts:1:1 error stage-run: with `A`, step 1 gives `body` a row of 1 cell (`3`), but the table has 3 columns: give every row one text per column (artifact skill: Custom builds)",
          "artifacts/construcoes/linhas-novas.build.ts:1:1 error stage-run: with `A`, step 1 gives `body` a row of 2 cells (`1`, `18`), but the table has 3 columns: give every row one text per column (artifact skill: Custom builds)",
          "artifacts/construcoes/linhas-novas.build.ts:1:1 error stage-run: with `A`, step 1 gives `body` a row of 4 cells (`2`, `12`, `6`, `0`), but the table has 3 columns: give every row one text per column (artifact skill: Custom builds)",
          "artifacts/construcoes/linhas-novas.build.ts:1:1 error stage-run: with `A`, step 2 marks the row `1`, which starts no row of this step's `body` (artifact skill: Custom builds)",
          "artifacts/construcoes/linhas-novas.build.ts:1:1 error stage-run: with `A`, step 3 changes a cell in the row `1`, which this step's `body` doesn't have (artifact skill: Custom builds)",
          "artifacts/construcoes/linhas-novas.build.ts:1:1 error stage-run: with `A`, step 4 has `body` that isn't a list of rows, each a list of texts (artifact skill: Custom builds)",
          "artifacts/construcoes/linhas.build.ts:1:1 error stage-run: with `a = 48, b = 18`, step 2 marks the line `9`, which the code doesn't have: it has lines 1 to 4 (artifact skill: Custom builds)",
          "artifacts/construcoes/linhas.build.ts:1:1 error stage-run: with `a = 48, b = 18`, step 3 marks the lines 2 and 3 `reversed`, but only the one running line is `reversed` (artifact skill: Custom builds)",
          "artifacts/construcoes/linhas.build.ts:1:1 error stage-run: with `a = 48, b = 18`, step 4 marks `2` in `lines` with `negrito`, which isn't a mark (artifact skill: Custom builds)",
          "artifacts/construcoes/linhas.build.ts:1:1 error stage-run: with `a = 48, b = 18`, step 4 marks the line `0`, which the code doesn't have: it has lines 1 to 4 (artifact skill: Custom builds)",
          "artifacts/construcoes/marca.build.ts:1:1 error stage-run: with `A`, step 1 marks the part `D` `dashed`, which changes nothing in it: `dashed` acts on shapes with a `stroke-` or `fill-swatch-` class (artifact skill: Custom builds)",
          "artifacts/construcoes/mesa-cresce.build.ts:1:1 error stage-run: with `a = 48, b = 18`, the first example, the last step leaves the row `2` (`2`, `12`, `6`) after the table's last row as written; write the tables as the first example leaves them (artifact skill: Custom builds)",
          "artifacts/construcoes/mesa-encolhe.build.ts:1:1 error stage-run: with `a = 48, b = 18`, the first example, the table as written has the row `1` (`1`, `18`, `12`) after the last step's last row; write the tables as the first example leaves them (artifact skill: Custom builds)",
          "artifacts/construcoes/mesa-lacunas.build.ts:1:1 error stage-run: with `a = 1, b = 0`, step 1 has no `body`, but this run's other steps rewrite the table's rows: give every step `body`, `[]` for no rows (artifact skill: Custom builds)",
          "artifacts/construcoes/mesa-lacunas.build.ts:1:1 error stage-run: with `a = 2, b = 0`, step 2 has no `body`, but this run's other steps rewrite the table's rows: give every step `body`, `[]` for no rows (artifact skill: Custom builds)",
          "artifacts/construcoes/mesa-lacunas.build.ts:1:1 error stage-run: with `a = 3, b = 0`, step 3 has no `body`, but this run's other steps rewrite the table's rows: give every step `body`, `[]` for no rows (artifact skill: Custom builds)",
          "artifacts/construcoes/muda.build.ts:1:1 error stage-run: with `A`, step 1 marks the part `C`, which the drawing doesn't have (artifact skill: Custom builds)",
          "artifacts/construcoes/muda.build.ts:1:1 error stage-run: with `A`, step 2 has an empty `say` (artifact skill: Custom builds)",
          "artifacts/construcoes/muda.build.ts:1:1 error stage-run: with `A`, step 2 marks the row `B`, which starts no table row (artifact skill: Custom builds)",
          "artifacts/construcoes/muda.build.ts:1:1 error stage-run: with `A`, step 3 changes a cell in the column `Peso`, which heads no table (artifact skill: Custom builds)",
          "artifacts/construcoes/muda.build.ts:1:1 error stage-run: with `A`, step 3 names the row `A`, which starts more than one table row (artifact skill: Custom builds)",
          "artifacts/construcoes/sem-codigo.build.ts:1:1 error stage-run: with `A`, step 1 has `lines`, but the Stage holds no code block: `lines` marks the lines of exactly one (artifact skill: Custom builds)",
          "artifacts/construcoes/sem-tabela.build.ts:1:1 error stage-run: with `A`, step 1 has `body`, but the Stage holds no table: `body` rewrites the rows of exactly one (artifact skill: Custom builds)",
          "artifacts/construcoes/so-cabecalho.build.ts:1:1 error stage-run: with `A`, step 1 has `body`, but its table has no row as written for the new rows to copy: write one (artifact skill: Custom builds)",
          "artifacts/construcoes/trava.build.ts:1:1 error stage-run: with `A`, `steps` didn't return within 5 seconds (artifact skill: Custom builds)",
          "artifacts/construcoes/uma-coluna.build.ts:1:1 error stage-run: with `A`, step 1 gives `body` a row of 2 cells (`início`, `48`), but the table has 1 column: give every row one text per column (artifact skill: Custom builds)",
          "artifacts/construcoes/uma-linha.build.ts:1:1 error stage-run: with `A`, step 1 marks the line `2`, which the code doesn't have: it has only line 1 (artifact skill: Custom builds)",
          "artifacts/construcoes/vazia.build.ts:1:1 error stage-run: with `A`, `steps` returns no steps; give it at least one (artifact skill: Custom builds)",
        ]);
      });

      it("fails a machine trace whose program or notes don't fit, or whose run faults, naming the example and the line", () => {
        expect(
          linesFor(run, "stage-run").filter((line) => line.startsWith("artifacts/stack-machine/")),
        ).toEqual([
          "artifacts/stack-machine/arguments.build.ts:1:1 error stage-run: with `x = 7, y = 2`, the machine can't read line 1: `AMEM` isn't `AMEM n`, with 1 whole number (artifact skill: Custom builds)",
          "artifacts/stack-machine/arguments.build.ts:1:1 error stage-run: with `x = 7, y = 2`, the machine can't read line 2: `CRVL 0` isn't `CRVL k,n`, with 2 whole numbers (artifact skill: Custom builds)",
          "artifacts/stack-machine/arguments.build.ts:1:1 error stage-run: with `x = 7, y = 2`, the machine can't read line 3: `ARMZ 0,x` isn't `ARMZ k,n`, with 2 whole numbers (artifact skill: Custom builds)",
          "artifacts/stack-machine/arguments.build.ts:1:1 error stage-run: with `x = 7, y = 2`, the machine can't read line 4: `DSVS 3` isn't `DSVS L`, with a label (artifact skill: Custom builds)",
          "artifacts/stack-machine/below-zero.build.ts:1:1 error stage-run: with `x = 7, y = 2`, the machine faults at line 1: M[−1] doesn't exist (artifact skill: Custom builds)",
          "artifacts/stack-machine/bottom.build.ts:1:1 error stage-run: with `x = 7, y = 2`, the machine faults at line 1: the stack would drop below its bottom (artifact skill: Custom builds)",
          "artifacts/stack-machine/calls.build.ts:1:1 error stage-run: with `x = 7, y = 2`, the machine can't read line 1: `CHPR L9,1` calls the label `L9`, which the listing doesn't have: it has `L1` (artifact skill: Custom builds)",
          "artifacts/stack-machine/calls.build.ts:1:1 error stage-run: with `x = 7, y = 2`, the machine can't read line 2: `CHPR L1` isn't `CHPR L,k`, with a label and 1 whole number (artifact skill: Custom builds)",
          "artifacts/stack-machine/divide.build.ts:1:1 error stage-run: with `x = 7, y = 0`, the machine faults at line 8: division by zero (artifact skill: Custom builds)",
          "artifacts/stack-machine/divide.build.ts:1:1 error stage-run: with `x = 7, y = 2`, the first example, the last step leaves `3` in the row `M[2]` and the column `Data`, and the table as written has `4`; write the tables as the first example leaves them (artifact skill: Custom builds)",
          "artifacts/stack-machine/from-one.build.ts:1:1 error stage-run: with `x = 7, y = 2`, the machine can't read line 1: the listing starts at address 0: fence it ` ```text start=0 ` (artifact skill: Custom builds)",
          "artifacts/stack-machine/jumps.build.ts:1:1 error stage-run: with `x = 7, y = 2`, the machine can't read line 1: `DSVS L9` jumps to the label `L9`, which the listing doesn't have: it has `L1` (artifact skill: Custom builds)",
          "artifacts/stack-machine/labelled.build.ts:1:1 error stage-run: with `x = 7, y = 2`, the machine can't read line 2: the label `L1` is already on line 1: give each line its own (artifact skill: Custom builds)",
          "artifacts/stack-machine/labelled.build.ts:1:1 error stage-run: with `x = 7, y = 2`, the machine can't read line 3: `L2:` labels no instruction: write one after it, as `L2: NADA` (artifact skill: Custom builds)",
          "artifacts/stack-machine/labels.build.ts:1:1 error stage-run: with `x = 7, y = 2`, the machine can't run: `labels` names the label `L2`, which the listing doesn't have: it has no labels (artifact skill: Custom builds)",
          "artifacts/stack-machine/no-display.build.ts:1:1 error stage-run: with `x = 7, y = 2`, the machine faults at line 1: D[1] has no value (artifact skill: Custom builds)",
          "artifacts/stack-machine/no-input.build.ts:1:1 error stage-run: with `x = 7, y = 2`, the machine faults at line 3: no input is left to read (artifact skill: Custom builds)",
          "artifacts/stack-machine/no-para.build.ts:1:1 error stage-run: with `x = 7, y = 2`, the machine faults at line 1: the program reaches FIM without PARA (artifact skill: Custom builds)",
          "artifacts/stack-machine/no-registers.build.ts:1:1 error stage-run: with `x = 7, y = 2`, step 1 changes a cell in the column `Value`, which heads no table (artifact skill: Custom builds)",
          "artifacts/stack-machine/no-top.build.ts:1:1 error stage-run: with `x = 7, y = 2`, step 1 changes a cell in the column `Top`, which heads no table (artifact skill: Custom builds)",
          "artifacts/stack-machine/no-value.build.ts:1:1 error stage-run: with `x = 7, y = 2`, the machine faults at line 2: M[0] has no value (artifact skill: Custom builds)",
          "artifacts/stack-machine/not-started.build.ts:1:1 error stage-run: with `x = 7, y = 2`, the machine faults at line 0: s has no value yet: a program starts with INPP (artifact skill: Custom builds)",
          "artifacts/stack-machine/notes.build.ts:1:1 error stage-run: with `x = 7, y = 2`, the machine can't run: `after` names the address 9, which the listing doesn't have: it has addresses 0 to 2 (artifact skill: Custom builds)",
          "artifacts/stack-machine/notes.build.ts:1:1 error stage-run: with `x = 7, y = 2`, the machine can't run: `roles` names the address 7, which the listing doesn't have: it has addresses 0 to 2 (artifact skill: Custom builds)",
          "artifacts/stack-machine/reads.build.ts:1:1 error stage-run: with `x = 7, y = 2`, the machine can't run: `reads` names `z`, which isn't one of the Stage's fields (artifact skill: Custom builds)",
          "artifacts/stack-machine/subroutines.build.ts:1:1 error stage-run: with `x = 7, y = 2`, the machine can't run: `subroutines` names the label `L2`, which no `CHPR` calls: the listing calls `L1` (artifact skill: Custom builds)",
          "artifacts/stack-machine/unknown.build.ts:1:1 error stage-run: with `x = 7, y = 2`, the machine can't read line 1: `PUSH 3` isn't a MEPA instruction (artifact skill: Custom builds)",
        ]);
      });
    });

    it("maps an artifact page's HTML failures to its source, and a platform page's to the built page", () => {
      expect(
        run.summary.filter(
          (line) => line.startsWith("artifacts/quimica/") || line.startsWith("dist/"),
        ),
      ).toEqual([
        "artifacts/quimica/index.mdx:16:5 error html-validate/heading-level: Heading level can only increase by one, expected <h2> but got <h3> (artifact skill: HTML)",
        'artifacts/quimica/index.mdx:20:14 error html-validate/no-dup-id: Duplicate ID "nota" (artifact skill: HTML)',
        "artifacts/quimica/index.mdx:22:9 error html-validate/wcag/h30: Anchor link must have a text describing its purpose (artifact skill: HTML)",
        "dist/404.html:1:104 error html-validate/heading-level: Initial heading level must be <h1> but got <h3> (artifact skill: Platform changes)",
      ]);
    });

    it("reports nothing else but what the type check, html-validate and knip also find in the code", () => {
      const otherLines = run.summary
        .slice(1)
        .filter(
          (line) =>
            !artifactCheckRules.some((ruleId) => line.includes(` error ${ruleId}: `)) &&
            !line.startsWith("artifacts/quimica/") &&
            !line.startsWith("artifacts/construcoes/alcanca.build.ts") &&
            !line.startsWith("dist/"),
        );
      expect(otherLines).toEqual([
        "artifacts/codigo/estilo.css:1:1 error knip/files: `artifacts/codigo/estilo.css` is unused (artifact skill: Platform changes)",
        "artifacts/codigo/index.mdx:24:23 error TS2322: Property 'onClick' does not exist on type 'HTMLAttributes'. Did you mean 'onclick'? (artifact skill: Components)",
        'artifacts/codigo/index.mdx:24:45 error html-validate/attr-case: Attribute "onClick" should be lowercase (artifact skill: HTML)',
        "artifacts/construcoes/importa.build.ts:3:30 error TS2591: Cannot find name 'node:fs'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig. (artifact skill: Custom builds)",
        ...(fullScope
          ? [
              "src/pages/404.astro:2:7 error TS2322: Type 'string' is not assignable to type 'number'. (artifact skill: Platform changes)",
            ]
          : []),
      ]);
      expect(run.summary[0]).toBe(
        fullScope ? "pnpm check: 132 failures" : "pnpm check: 131 failures",
      );
    });
  },
);
