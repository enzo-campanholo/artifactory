import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  checkTimeout,
  createFixtureRepo,
  type CheckRun,
  type FixtureRepo,
} from "./fixture-repo.ts";

function artifact(id: string, title: string, body: string[]): string {
  return [
    "---",
    `id: ${id}`,
    `title: ${title}`,
    "subject: Computação",
    "lang: pt-BR",
    "published: 2026-10-15",
    "---",
    "",
    ...body,
    "",
  ].join("\n");
}

function code(fence: string, ...lines: string[]): string[] {
  return [fence, ...lines, "```", ""];
}

function vertex(x: number, swatch: number, label: string): string {
  return [
    "  <g>",
    `    <circle cx="${String(x)}" cy="30" r="22" class="fill-swatch-${String(swatch)} stroke-text" stroke-width="2" />`,
    `    <text x="${String(x)}" y="30" data-swatch="${String(swatch)}">${label}</text>`,
    "  </g>",
  ].join("\n");
}

function drawing(parts: string[]): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 60">',
    ...parts,
    "</svg>",
    "",
  ].join("\n");
}

function stage(build: string, ...props: string[]): string[] {
  return [
    "<Stage",
    `  build="${build}"`,
    ...props,
    '  prompt="Digite um número."',
    ">",
    "",
    "| Variável | Valor |",
    "| -------- | ----: |",
    "| a        |     0 |",
    "",
    "</Stage>",
    "",
  ];
}

const countingBuild = [
  'import { defineBuild } from "@artifactory/design-system/stage-build";',
  "",
  'export default defineBuild({ steps: () => [{ say: "Conta." }] });',
  "",
].join("\n");

const twoBoards = "a\nsteps: {\n  b: {\n    b\n  }\n}\n";

// Every component rule is broken once here, so one build reports them all.
const files = {
  "artifacts/passos/index.mdx": artifact("pa55os01", "Passos", [
    'import Stepper from "@artifactory/design-system/stepper";',
    'import diagrama from "./passos.d2?steps";',
    'import figura from "./passos.svg?raw";',
    'import cores from "./cores.svg?raw";',
    'import fora from "./fora.svg?raw";',
    "",
    "### Detalhes",
    "",
    "Veja [a pilha](/nada/).",
    "",
    '<Stepper lines={["1", "2"]} captions={["Empilha.", "Soma."]}>',
    "",
    ...code("```text", "push 2", "add"),
    "</Stepper>",
    "",
    '<Stepper diagram={diagrama} figure={figura} alt="Os passos." />',
    "",
    '<Stepper diagram={diagrama} alt="Os passos.">',
    "",
    ...code("```text", "push 2"),
    "</Stepper>",
    "",
    '<Stepper figure={cores} alt="Um vértice da cor 1." />',
    "",
    '<Stepper figure={fora} alt="Um ponto que sai." />',
    "",
    '<Stepper lines={["1"]}>',
    "",
    ...code("```text", "push 2"),
    "</Stepper>",
    "",
    '<Stepper lines={["1", "2"]} captions={["Empilha."]}>',
    "",
    ...code("```text", "push 2", "add"),
    "</Stepper>",
    "",
    '<Stepper lines={["0", "4"]}>',
    "",
    ...code("```text start=0", "push 2", "push 3", "add", "print"),
    "</Stepper>",
    "",
    "<Stepper>",
    "",
    ...code("```text", "push 2"),
    "</Stepper>",
    "",
    '<Stepper lines={["1", "1"]}>',
    "",
    ...code("```text", "push 2"),
    ...code("```text", "push 3"),
    "</Stepper>",
    "",
    '<Stepper lines={["1", "2"]}>',
    "",
    "Empilha e soma.",
    "",
    "</Stepper>",
    "",
    '<Stepper lines={["1", "2"]}>',
    "",
    ...code("```text {1}", "push 2", "add"),
    "</Stepper>",
  ]),
  "artifacts/passos/passos.d2": twoBoards,
  "artifacts/passos/passos.svg":
    '<svg viewBox="0 0 10 10"><circle r="4" data-step="1" /><rect width="4" height="4" data-step="2" /></svg>\n',
  "artifacts/passos/cores.svg":
    '<svg viewBox="0 0 60 60"><g><circle cx="30" cy="30" r="22" class="fill-swatch-1" /><text x="30" y="30" data-swatch="1">1</text></g><circle r="4" data-step="2" /></svg>\n',
  "artifacts/passos/fora.svg":
    '<svg viewBox="0 0 10 10"><circle r="4" data-step="1" /><rect width="4" height="4" data-step="2-x" /></svg>\n',
  "artifacts/renomeado/index.mdx": artifact("r3n0m3ad", "Renomeado", [
    'import Passos from "@artifactory/design-system/stepper";',
    "",
    '<Passos lines={["1", "2"]}>',
    "",
    ...code("```text", "push 2", "add"),
    "</Passos>",
    "",
    "<Passos>",
    "",
    ...code("```text", "push 2"),
    "</Passos>",
  ]),
  "artifacts/aninhado/index.mdx": artifact("an1nhad0", "Aninhado", [
    'import Stepper from "@artifactory/design-system/stepper";',
    'import figura from "./figura.svg?raw";',
    "",
    '<Stepper figure={figura} alt="Os passos.">',
    "",
    '<Stepper lines={["1", "2"]}>',
    "",
    ...code("```text", "push 2", "add"),
    "</Stepper>",
    "",
    "</Stepper>",
  ]),
  "artifacts/aninhado/figura.svg":
    '<svg viewBox="0 0 10 10"><circle r="4" data-step="1" /><rect width="4" height="4" data-step="2" /></svg>\n',
  "artifacts/questoes/index.mdx": artifact("qu35t03s", "Questões", [
    'import Escolha from "@artifactory/design-system/single-choice";',
    'import Matching from "@artifactory/design-system/matching";',
    'import NumericQuestion from "@artifactory/design-system/numeric-question";',
    'import OpenQuestion from "@artifactory/design-system/open-question";',
    "",
    '<Escolha id="valida" answer={1}>',
    "",
    "Qual pilha soma?",
    "",
    "1. Esta",
    "2. Aquela",
    "",
    "</Escolha>",
    "",
    '<Escolha id="sem-lista" answer={1}>',
    "",
    "Qual pilha soma?",
    "",
    "- Esta",
    "- Aquela",
    "",
    "</Escolha>",
    "",
    '<Escolha id="sem-explicacao" answer={2}>',
    "",
    "Qual pilha soma?",
    "",
    "1. Esta",
    "2. Aquela",
    "",
    "---",
    "",
    "</Escolha>",
    "",
    '<Escolha id="dois-paragrafos" answer={2}>',
    "",
    "Qual pilha soma?",
    "",
    "1. Esta",
    "",
    "   Com dois parágrafos.",
    "",
    "2. Aquela",
    "",
    "</Escolha>",
    "",
    '<Escolha id="uma-opcao" answer={1}>',
    "",
    "Qual pilha soma?",
    "",
    "1. Só esta",
    "",
    "</Escolha>",
    "",
    '<Escolha id="fora" answer={3}>',
    "",
    "Qual pilha soma?",
    "",
    "1. Esta",
    "2. Aquela",
    "",
    "</Escolha>",
    "",
    '<NumericQuestion id="virgula" answer="9,81" unit="m/s²">',
    "",
    "Qual é a aceleração da pedra?",
    "",
    "</NumericQuestion>",
    "",
    '<NumericQuestion id="sem-pergunta" answer="9.81" tolerance={0.01}>',
    "",
    "---",
    "",
    "Pela queda livre, $g = 2d/t^2$.",
    "",
    "</NumericQuestion>",
    "",
    '<NumericQuestion id="sem-solucao" answer="9.81" tolerance={0.01}>',
    "",
    "Qual é a aceleração da pedra?",
    "",
    "---",
    "",
    "</NumericQuestion>",
    "",
    '<OpenQuestion id="sem-resposta">',
    "",
    "Por que a pilha soma?",
    "",
    "</OpenQuestion>",
    "",
    ...[
      ["Onde fica cada item?", "", "1. Código", "2. Dados", "3. Pilha", "", "- Global", "- Local"],
      [
        ...["Onde fica cada item?", "", "1. Código", "2. Dados", "3. Pilha", ""],
        ...["---", "", "- Global", "- Local", "", "Globais ficam na área de dados."],
      ],
      [
        ...["Onde fica cada item?", "", "1. Código", "2. Dados", "3. Pilha", ""],
        ...["---", "", "- Global", "- Local", "", "---"],
      ],
      [
        ...["Onde fica cada item?", "", "1. Código", "2. Dados", "3. Pilha", ""],
        ...["---", "", "- Global", "", "  Declarada fora de funções.", "", "- Local"],
      ],
    ].flatMap((content) => [
      '<Matching answers={{ "global": 2, "local": 3 }}>',
      "",
      ...content,
      "",
      "</Matching>",
      "",
    ]),
    '<Matching answers={{ "global": 1, "local": 2 }}>',
    "",
    ...["Onde fica cada item?", "", "1. Código", "", "---", "", "- Global"],
    "",
    "</Matching>",
  ]),
  "artifacts/figuras/index.mdx": artifact("f1gur4s1", "Figuras", [
    'import Figure from "@artifactory/design-system/figure";',
    'import Stepper from "@artifactory/design-system/stepper";',
    'import valida from "./valida.svg?raw";',
    'import discordantes from "./discordantes.svg?raw";',
    'import sete from "./sete.svg?raw";',
    'import proprias from "./proprias.svg?raw";',
    'import semRaiz from "./sem-raiz.svg?raw";',
    'import semViewBox from "./sem-viewbox.svg?raw";',
    "",
    '<Figure src={valida} alt="Uma célula." />',
    "",
    '<Figure src={discordantes} alt="Seis vértices coloridos." colours={["R", "B"]} />',
    "",
    '<Figure src={sete} alt="Um vértice da cor 1." colours={["1", "2", "3", "4", "5", "6", "Sete"]} />',
    "",
    '<Figure src={proprias} alt="Um vértice da cor 1." />',
    "",
    '<Figure src={semRaiz} alt="Nada desenhado." />',
    "",
    '<Stepper figure={semViewBox} alt="Os passos." />',
  ]),
  "artifacts/figuras/valida.svg": '<svg viewBox="0 0 10 10"><circle r="4" /></svg>\n',
  "artifacts/figuras/discordantes.svg": drawing([
    vertex(30, 1, "B"),
    [
      "  <g>",
      '    <circle cx="80" cy="30" r="22" class="fill-swatch-2 stroke-text" stroke-width="2" />',
      '    <text x="80" y="30" data-swatch="1">R</text>',
      "  </g>",
    ].join("\n"),
    '  <g><circle cx="130" cy="30" r="22" class="fill-swatch-1 stroke-text" stroke-width="2" /></g>',
    vertex(180, 3, "3"),
    '  <g><text data-swatch="2">B</text></g>',
    [
      "  <g>",
      '    <line x1="200" y1="30" x2="280" y2="30" class="stroke-text" stroke-width="2" />',
      '    <text x="240" y="30" data-swatch="2">B</text>',
      "  </g>",
    ].join("\n"),
  ]),
  "artifacts/figuras/sete.svg": drawing([vertex(30, 1, "1")]),
  "artifacts/figuras/proprias.svg": drawing([vertex(30, 1, "R"), vertex(80, 7, "7")]),
  "artifacts/figuras/sem-raiz.svg": '<g><circle r="4" /></g>\n',
  "artifacts/figuras/sem-viewbox.svg":
    '<svg><circle r="4" data-step="1" /><rect width="4" height="4" data-step="2" /></svg>\n',
  "artifacts/estagios/index.mdx": artifact("e5tag105", "Estágios", [
    'import Stage from "@artifactory/design-system/stage";',
    "",
    "Digite um número.",
    "",
    ...stage("nenhum"),
    ...stage(
      "exemplos",
      '  input={{ label: "Calcular", fields: [{ name: "a", min: 0, max: 9 }], examples: [] }}',
      "  beside",
    ),
    ...stage("valido", '  choose={{ label: "Começar em", options: ["A"] }}'),
    ...stage("grupo", '  choose={[{ name: "inicio", label: "Começar em", options: ["A", "B"] }]}'),
    ...stage(
      "grupos",
      "  choose={[",
      '    { name: "inicio", label: "Começar em", options: ["A", "B"] },',
      '    { name: "inicio", label: "Terminar em", options: ["C"] },',
      '    { name: "busca", label: "Buscar em", options: ["largura", "A"] },',
      "  ]}",
      "  beside",
    ),
    ...stage(
      "desenho",
      '  choose={{ label: "Começar em", options: ["A"] }}',
      '  figure={"<svg><circle data-part=\\"A\\" r=\\"4\\" /></svg>"}',
      '  alt="Um vértice."',
    ),
  ]),
  ...Object.fromEntries(
    ["nenhum", "exemplos", "valido", "grupo", "grupos", "desenho"].map((build) => [
      `artifacts/estagios/${build}.build.ts`,
      countingBuild,
    ]),
  ),
  "artifacts/pilha/index.mdx": artifact("p1lha001", "Pilha", [
    'import Stage from "@artifactory/design-system/stage";',
    "",
    "Uma pilha soma dois números.",
    "",
    "<Stage",
    '  build="conta"',
    '  choose={{ label: "Começar em", options: ["A"] }}',
    '  prompt="Escolha onde começar."',
    ">",
    "",
    ...code("```text {1}", "push 2", "print"),
    "</Stage>",
  ]),
  "artifacts/pilha/conta.build.ts": countingBuild,
  "artifacts/grafos/index.mdx": artifact("gr4f0s01", "Grafos", [
    'import Stage from "@artifactory/design-system/stage";',
    'import pontos from "./pontos.svg?raw";',
    "",
    "Escolha um vértice.",
    "",
    "<Stage",
    '  build="ausente"',
    '  choose={{ label: "Começar em", options: ["A"] }}',
    "  input={{",
    '    label: "Calcular",',
    "    fields: [",
    '      { name: "a", min: 1, max: 9999 },',
    '      { name: "b", min: 0, max: 9999 },',
    '      { name: "w", kind: "text", alphabet: ["a", "b", "é", "𝔞"], minLength: 1, maxLength: 3 },',
    '      { name: "t", kind: "text", alphabet: ["ab", "x", "x", "é", "é"], minLength: 3, maxLength: 2, min: 0 },',
    '      { name: "u", kind: "text", minLength: -1, maxLength: 0 },',
    '      { name: "v", kind: "text", max: 9 },',
    '      { name: "n", min: 0, max: 9, alphabet: ["a"], minLength: 0, maxLength: 2 },',
    "    ],",
    "    examples: [",
    ...[
      'a: 48, b: 18, w: "é"',
      'a: 4.5, c: 2, w: "abc"',
      'a: 48, b: 10000, w: "abab"',
      'a: 1, b: 0, w: ""',
      'a: 1, b: 0, w: "bé"',
      'a: 1, b: 0, w: "bxy"',
      'a: "x", b: 0, w: 5',
      'a: 1, b: 0, w: "𝔞𝔞𝔞"',
    ].map((values) => `      { ${values}, t: "", u: "", v: "", n: 1 },`),
    "    ],",
    "  }}",
    '  prompt="Escolha um vértice."',
    "  figure={pontos}",
    ">",
    "",
    "| Vértice | Chave |",
    "| ------- | ----: |",
    "| A       |     ∞ |",
    "",
    "</Stage>",
  ]),
  "artifacts/grafos/pontos.svg":
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle data-part="A" cx="20" cy="20" r="10" /></svg>\n',
  "artifacts/cores/index.mdx": artifact("c0r3s001", "Cores", [
    'import Stage from "@artifactory/design-system/stage";',
    'import cores from "./cores.svg?raw";',
    "",
    "Os vértices têm as cores 1 e 2.",
    "",
    '<Stage build="cores" choose={{ label: "Começar em", options: ["1"] }} prompt="Escolha um vértice." figure={cores} alt="Um vértice da cor R." colours={["R", "B"]} />',
  ]),
  "artifacts/cores/cores.svg": drawing([vertex(30, 1, "B"), vertex(80, 3, "3")]),
  "artifacts/valido/index.mdx": artifact("val1d001", "Válido", [
    'import Stepper from "@artifactory/design-system/stepper";',
    "",
    "### Detalhes",
    "",
    '<Stepper lines={["1", "2"]}>',
    "",
    ...code("```text", "push 2", "add"),
    "</Stepper>",
  ]),
  "src/pages/pagina-de-passos.astro": [
    "---",
    'import OpenQuestion from "@artifactory/design-system/open-question";',
    'import Stepper from "@artifactory/design-system/stepper";',
    "---",
    "",
    "<!doctype html>",
    '<html lang="en">',
    "  <head>",
    '    <meta charset="utf-8" />',
    "    <title>Passos</title>",
    "  </head>",
    "  <body>",
    "    <Stepper><p>Empilha e soma.</p></Stepper>",
    '    <OpenQuestion id="por-que"><p>Por que a pilha soma?</p></OpenQuestion>',
    "  </body>",
    "</html>",
    "",
  ].join("\n"),
};

describe("a repo whose components break their rules", () => {
  let repo: FixtureRepo;
  let run: CheckRun;

  beforeAll(async () => {
    repo = await createFixtureRepo(files);
    run = await repo.check(["--artifacts-only"]);
  }, checkTimeout);

  afterAll(() => repo.remove());

  const failure = (place: string, message: string) =>
    `${place} error component-rule: ${message} (artifact skill: Components)`;

  it("reports each broken Stepper at its own tag, by the name the entry imports it as", () => {
    expect(
      run.summary.filter(
        (line) => line.startsWith("artifacts/passos/") || line.startsWith("artifacts/renomeado/"),
      ),
    ).toEqual([
      failure(
        "artifacts/passos/index.mdx:28:1",
        "Stepper: give it one of `diagram`, `figure` or `lines`, or none of them and one fenced code block per step",
      ),
      failure(
        "artifacts/passos/index.mdx:30:1",
        "Stepper: a `diagram` Stepper holds nothing inside it: give it the `diagram` alone, or none of `diagram`, `figure` or `lines` and one fenced code block per step",
      ),
      failure(
        "artifacts/passos/index.mdx:38:1",
        "Stepper: swatches are only for a Figure or a Stage, so a figure Stepper draws none: draw the colouring as a Figure, or step through it in a Stage",
      ),
      failure(
        "artifacts/passos/index.mdx:40:1",
        'Stepper: data-step "2-x" must list numbers from 1 to 2, such as "2", "2-4", "2-" or "1-2, 5"',
      ),
      failure("artifacts/passos/index.mdx:42:1", "Stepper: it has 1 step; give it at least two"),
      failure(
        "artifacts/passos/index.mdx:50:1",
        "Stepper: it has 2 steps but 1 captions; give one caption per step",
      ),
      failure(
        "artifacts/passos/index.mdx:59:1",
        'Stepper: lines "4" must list numbers from 0 to 3, such as "1", "1-3", "1-" or "0-1, 4"',
      ),
      failure(
        "artifacts/passos/index.mdx:70:1",
        "Stepper: it has 1 code block and none of `diagram`, `figure` or `lines`: give it one fenced code block per step, at least two, or `lines` to step through one block",
      ),
      failure(
        "artifacts/passos/index.mdx:78:1",
        "Stepper: `lines` steps through one code block, but it has 2: keep one block, or take `lines` off to show one code block per step",
      ),
      failure(
        "artifacts/passos/index.mdx:90:1",
        "Stepper: put exactly one fenced code block inside `<Stepper lines>`",
      ),
      failure(
        "artifacts/passos/index.mdx:96:1",
        "Stepper: its code block marks lines with `{…}`, but a one-block Stepper marks them itself, step by step, with `lines`: take `{…}` off the fence",
      ),
      failure(
        "artifacts/renomeado/index.mdx:20:1",
        "Stepper: it has 1 code block and none of `diagram`, `figure` or `lines`: give it one fenced code block per step, at least two, or `lines` to step through one block",
      ),
    ]);
  });

  it("reports each broken question at its own tag, rendering none of it", () => {
    expect(run.summary.filter((line) => line.startsWith("artifacts/questoes/"))).toEqual([
      failure(
        "artifacts/questoes/index.mdx:23:1",
        "SingleChoice: write the question, then its options as one numbered list at the end, before any `---`, with no list inside an option",
      ),
      failure(
        "artifacts/questoes/index.mdx:32:1",
        "SingleChoice: write the explanation after `---`, or leave out the `---`",
      ),
      failure(
        "artifacts/questoes/index.mdx:43:1",
        "SingleChoice: keep each option to one paragraph",
      ),
      failure(
        "artifacts/questoes/index.mdx:55:1",
        "SingleChoice: it has 1 option; give it at least two",
      ),
      failure(
        "artifacts/questoes/index.mdx:63:1",
        "SingleChoice: `answer` is 3, but it must be the number of one of its 2 options",
      ),
      failure(
        "artifacts/questoes/index.mdx:72:1",
        'NumericQuestion: `answer` is "9,81"; write its decimals after `.`, not `,`',
      ),
      failure("artifacts/questoes/index.mdx:78:1", "NumericQuestion: write the question inside it"),
      failure(
        "artifacts/questoes/index.mdx:86:1",
        "NumericQuestion: write the explanation after `---`, or leave out the `---`",
      ),
      failure(
        "artifacts/questoes/index.mdx:94:1",
        "OpenQuestion: write the question, then `---` between blank lines, then the model answer",
      ),
      failure(
        "artifacts/questoes/index.mdx:100:1",
        "Matching: write the prompt, then its options as one numbered list, then a blank line, `---`, another blank line and its items as one bulleted list, with no list inside an option or item",
      ),
      failure(
        "artifacts/questoes/index.mdx:113:1",
        "Matching: after the items' bulleted list, write only a blank line, `---`, another blank line and the explanation",
      ),
      failure(
        "artifacts/questoes/index.mdx:130:1",
        "Matching: write the explanation after the second `---`, or leave out that `---`",
      ),
      failure(
        "artifacts/questoes/index.mdx:147:1",
        "Matching: keep each option and each item to one paragraph",
      ),
      failure(
        "artifacts/questoes/index.mdx:165:1",
        "Matching: it has 1 option; give it at least two; it has 1 item; give it at least two; `answers` has 2 answers for its 1 item; give one per item, in the items' order; `answers` gives `local` 2, but it must be the number of one of its 1 option",
      ),
    ]);
  });

  it("reports a broken Figure at its tag naming every rule it breaks, and a drawing's own rule at the Figure or Stepper that holds it", () => {
    expect(run.summary.filter((line) => line.startsWith("artifacts/figuras/"))).toEqual([
      failure(
        "artifacts/figuras/index.mdx:20:1",
        'Figure: a label reads "B", but data-swatch="1" is colour 1, "R": write <text data-swatch="1">R</text>; a <g> filled with fill-swatch-2 holds a label of colour 1: label it <text data-swatch="2">B</text>; a <g> filled with fill-swatch-1 holds no label: put <text data-swatch="1">R</text> in it, at the centre of its area; swatch 3 is past the 2 colours `colours` names: add its name to `colours`, or use swatches 1 to 2; the label <text data-swatch="2"> has no x and y: give it both, at the centre of the part it names',
      ),
      failure(
        "artifacts/figuras/index.mdx:22:1",
        'Figure: `colours` names 7 colours: name at most six, one per swatch; the colour "Sete" is named in more than two characters: name it in one or two, such as "Se"',
      ),
      failure(
        "artifacts/figuras/index.mdx:24:1",
        'Figure: a label reads "R", but data-swatch="1" is colour 1, "1": write <text data-swatch="1">1</text>; swatch 7 is past the six swatches: use swatches 1 to 6',
      ),
      failure(
        "artifacts/figuras/index.mdx:26:1",
        "Figure or Stepper: the imported SVG file has no <svg> root element",
      ),
      failure(
        "artifacts/figuras/index.mdx:28:1",
        'Figure or Stepper: the imported SVG file has no viewBox; give its <svg> root `viewBox="0 0 W H"`',
      ),
    ]);
  });

  it("reports each broken Stage at its own tag naming every rule it breaks, with its props' type errors beside", () => {
    const stages = ["estagios", "pilha", "grafos", "cores"].map((slug) => `artifacts/${slug}/`);
    expect(run.summary.filter((line) => stages.some((folder) => line.startsWith(folder)))).toEqual([
      failure(
        "artifacts/cores/index.mdx:14:1",
        'Stage: there is no `cores.build.ts` beside the entry; a label reads "B", but data-swatch="1" is colour 1, "R": write <text data-swatch="1">R</text>; swatch 3 is past the 2 colours `colours` names: add its name to `colours`, or use swatches 1 to 2',
      ),
      failure(
        "artifacts/estagios/index.mdx:13:1",
        "Stage: give it `choose`, with a label and its options, or `input`, with its fields and examples",
      ),
      "artifacts/estagios/index.mdx:13:2 error TS2322: Property 'input' is missing in type '{ children: any; build: string; prompt: string; }' but required in type 'Typed'. (artifact skill: Components)",
      failure(
        "artifacts/estagios/index.mdx:24:1",
        "Stage: give `input` at least one example; set `beside` only with `figure`",
      ),
      failure(
        "artifacts/estagios/index.mdx:49:1",
        "Stage: give `choose` at least two groups, or write one as `{ label, options }`",
      ),
      failure(
        "artifacts/estagios/index.mdx:61:1",
        [
          "Stage: two groups have the name `inicio`: give each group its own `name`",
          "the option `A` is in the groups `inicio` and `busca`: give each option a name no other group has, since a drawn part named like it chooses it",
          "set `beside` only with `figure`",
        ].join("; "),
      ),
      failure(
        "artifacts/estagios/index.mdx:78:1",
        'Stage: the imported SVG file has no viewBox; give its <svg> root `viewBox="0 0 W H"`',
      ),
      failure(
        "artifacts/grafos/index.mdx:14:1",
        [
          "Stage: there is no `ausente.build.ts` beside the entry",
          "give it only one of `choose` and `input`",
          'the field `t` has "ab" in its alphabet, which isn\'t one code point',
          'the field `t` has "x" more than once in its alphabet',
          'the field `t` has "é" more than once in its alphabet',
          "the field `t` has `minLength` 3, above its `maxLength` 2",
          "the field `t` has `min`, which only a number field takes",
          "the field `u` has `minLength` -1, which isn't a whole number of at least 0",
          "the field `u` has `maxLength` 0, which isn't a whole number of at least 1",
          "the field `v` has no `maxLength`",
          "the field `v` has `max`, which only a number field takes",
          "the field `n` has `alphabet`, which only a text field takes",
          "the field `n` has `minLength`, which only a text field takes",
          "the field `n` has `maxLength`, which only a text field takes",
          "example 2 has `c`, which no field has",
          "example 2 gives `a` 4.5, which isn't a whole number",
          "example 2 has no `b`",
          'example 2 gives `w` "abc", whose c is outside the alphabet',
          "example 3 gives `b` 10000, outside 0 to 9999",
          'example 3 gives `w` "abab", longer than 3',
          'example 4 gives `w` "", shorter than 1',
          'example 5 gives `w` "bé", which isn\'t in NFC',
          'example 6 gives `w` "bxy", whose x is outside the alphabet',
          'example 7 gives `a` "x", which isn\'t a whole number',
          "example 7 gives `w` 5, which isn't text",
          "give `alt` with `figure`",
        ].join("; "),
      ),
      "artifacts/grafos/index.mdx:23:101 error TS2353: Object literal may only specify known properties, and 'min' does not exist in type '{ name: string; label?: string; kind: \"text\"; alphabet?: string[]; minLength?: number; maxLength: number; }'. (artifact skill: Components)",
      "artifacts/grafos/index.mdx:25:34 error TS2353: Object literal may only specify known properties, and 'max' does not exist in type '{ name: string; label?: string; kind: \"text\"; alphabet?: string[]; minLength?: number; maxLength: number; }'. (artifact skill: Components)",
      failure(
        "artifacts/pilha/index.mdx:13:1",
        "Stage: its code block marks lines with `{…}`, but a Stage marks them itself, step by step, with `lines`: take `{…}` off the fence",
      ),
    ]);
  });

  it("falls back to the entry's start when a component inside a broken one leaves the counts apart", () => {
    expect(run.summary.filter((line) => line.startsWith("artifacts/aninhado/"))).toEqual([
      failure(
        "artifacts/aninhado/index.mdx:1:1",
        "Stepper: a `figure` Stepper holds nothing inside it: give it the `figure` alone, or none of `diagram`, `figure` or `lines` and one fenced code block per step",
      ),
    ]);
  });

  it("fails a broken component on a page that isn't an artifact's at the config, naming the page, as a platform change", () => {
    const platformFailure = (message: string) =>
      `astro.config.ts:1:1 error component-rule: ${message}; on /pagina-de-passos/, which isn't an artifact's page (artifact skill: Platform changes)`;
    expect(run.summary.filter((line) => line.startsWith("astro.config.ts"))).toEqual([
      platformFailure(
        "OpenQuestion: write the question, then `---` between blank lines, then the model answer",
      ),
      platformFailure(
        "Stepper: it has 0 code blocks and none of `diagram`, `figure` or `lines`: give it one fenced code block per step, at least two, or `lines` to step through one block",
      ),
    ]);
  });

  it("checks the built pages of every artifact without a broken component, and only those", () => {
    expect(run.summary.filter((line) => !/ error (component-rule|TS\d+): /.test(line))).toEqual([
      "pnpm check: 46 failures",
      "artifacts/valido/index.mdx:11:5 error html-validate/heading-level: Heading level can only increase by one, expected <h2> but got <h3> (artifact skill: HTML)",
    ]);
  });

  it("fails the build at the end, leaving no question manifest, public paths manifest or build ID", () => {
    expect(run.exitCode).toBe(1);
    for (const file of ["question-manifest.json", "public-paths.json", "build-id.json"]) {
      expect(existsSync(join(repo.root, "dist-worker", file))).toBe(false);
    }
  });
});
