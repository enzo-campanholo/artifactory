import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  checkTimeout,
  commitArtifacts,
  createFixtureRepo,
  succeeds,
  type CheckRun,
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

function linesFor(run: CheckRun, folders: string[]): string[] {
  return run.summary.filter((line) =>
    folders.some((folder) => line.startsWith(`artifacts/${folder}/`)),
  );
}

const mathAndCode = {
  "artifacts/fisica/index.mdx": artifact(fields("f1s1ca01", "Física", "Física"), [
    "A fração $\\frac{a$ não fecha, e $v_{média}$ precisa de texto.",
    "",
    "$$",
    "x = 1 \\\\",
    "\\foo{y}",
    "$$",
    "",
    "```pythn",
    'print("oi")',
    "```",
  ]),
  "artifacts/quimica/index.mdx": artifact(fields("qu1m1ca1", "Química", "Física"), [
    "Texto $x^{2$.",
  ]),
};

const diagramsAndFigures = {
  "artifacts/genetica/index.mdx": artifact(fields("g3n3t1ca", "Genética", "Biologia"), [
    'import Diagram from "@artifactory/design-system/diagram";',
    'import Figure from "@artifactory/design-system/figure";',
    'import Stepper from "@artifactory/design-system/stepper";',
    'import heranca from "./heranca.d2";',
    'import celula from "./celula.svg?raw";',
    'import meiose from "./meiose.d2?steps";',
    "",
    "<Diagram src={heranca} />",
    "",
    '<Figure src={celula} alt="Uma célula" />',
    "",
    '<Stepper diagram={meiose} alt="A meiose" />',
  ]),
  "artifacts/genetica/meiose.d2": "célula -> gametas\n",
  "artifacts/genetica/heranca.d2": ["pais -> filhos", "alelos: {", "  shape: bogus", "}", ""].join(
    "\n",
  ),
  "artifacts/genetica/celula.svg": '<svg viewBox="0 0 10 10"><circle r="4" /></svg>\n',
  "artifacts/ecologia/index.mdx": artifact(fields("ec0l0g1a", "Ecologia", "Biologia"), [
    'import Diagram from "@artifactory/design-system/diagram";',
    'import Figure from "@artifactory/design-system/figure";',
    'import cadeia from "./cadeia.d2";',
    'import nicho from "./nicho.svg?raw";',
    "",
    '<Diagram src={cadeia} alt="Cadeia alimentar" />',
    "",
    "  <Figure src={nicho} />",
  ]),
  "artifacts/ecologia/cadeia.d2": "plantas -> -> herbívoros\ncarnívoros: {\n",
  "artifacts/ecologia/nicho.svg": '<svg viewBox="0 0 10 10"><rect width="4" height="4" /></svg>\n',
  "artifacts/ecossistema/index.mdx": artifact(fields("3c0ss1st", "Ecossistema", "Biologia"), [
    'import Diagram from "@artifactory/design-system/diagram";',
    'import teia from "./teia.d2";',
    "",
    '<Diagram src={teia} alt="A teia alimentar de um ecossistema" />',
  ]),
  "artifacts/ecossistema/teia.d2": [
    'sol: Sol {tooltip: "Fonte de energia"}',
    "plantas: Plantas {icon: https://icons.terrastruct.com/essentials%2F004-picture.svg}",
    "herbivoros: Herbívoros {link: https://example.com; style.shadow: true}",
    'decompositores: Decompositores {style.fill-pattern: dots; style.fill: "#ff0000"}',
    "sol -> plantas: luz {style.animated: true; style.opacity: 0.4}",
    "nota: |md",
    "  Veja [a cadeia](https://example.com).",
    "|",
    "vars: {d2-config: {sketch: true}; d2-legend: {a: Planta}}",
    "",
  ].join("\n"),
};

const links = {
  "artifacts/limites/index.mdx": artifact(fields("l1m1t3s1", "Limites", "Cálculo"), [
    "## Definição",
    "",
    "Veja [a definição](#definição), [as integrais](/integrais/), [a primitiva](/integrais/#q-primitiva), [o método](../integrais/#método), [os rascunhos](/drafts/), [a Library](/), [a página de erro](/404.html) e [um site](https://example.com/nada/).",
    "",
    "Mas [esta seção](#sem-secao), [esta questão](/integrais/#q-nao-existe), [o endereço antigo](/integrais-antigas/#q-primitiva) e [a figura](/figura.png) não existem.",
    "",
    "[As derivadas](/derivadas/) saíram, e com elas [a regra](/derivadas/#q-regra-da-potencia) e [de novo as derivadas](/derivadas/).",
  ]),
  "artifacts/integrais/index.mdx": artifact(
    fields("1nt3gr41", "Integrais", "Cálculo", "formerSlugs: [integrais-antigas]"),
    [
      'import SingleChoice from "@artifactory/design-system/single-choice";',
      "",
      "## Método",
      "",
      "Integrar desfaz [a derivada](/derivadas/).",
      "",
      '<SingleChoice id="primitiva" answer={1}>',
      "",
      "Qual é uma primitiva de $2x$?",
      "",
      "1. $x^2$",
      "2. $2$",
      "",
      "</SingleChoice>",
    ],
  ),
  "artifacts/derivadas/index.mdx": artifact(fields("d3r1v4d4", "Derivadas", "Cálculo"), [
    "A derivada de $x^2$ é $2x$.",
  ]),
};

const questionIds = {
  "artifacts/regras-de-derivacao/index.mdx": artifact(
    fields("r3gr4s01", "Regras de derivação", "Cálculo"),
    [
      'import OpenQuestion from "@artifactory/design-system/open-question";',
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
      '  <OpenQuestion id="regra-da-potencia">',
      "",
      "Por que a derivada de $x^2$ é $2x$?",
      "",
      "---",
      "",
      "Pela definição de derivada como limite.",
      "",
      "  </OpenQuestion>",
      "",
      '<OpenQuestion id="Por_que">',
      "",
      "Por quê?",
      "",
      "---",
      "",
      "Porque sim.",
      "",
      "</OpenQuestion>",
    ],
  ),
};

const statements = {
  "artifacts/teoremas/index.mdx": artifact(fields("t30r3m4s", "Teoremas", "Matemática"), [
    'import OpenQuestion from "@artifactory/design-system/open-question";',
    'import Ref from "@artifactory/design-system/ref";',
    'import Statement from "@artifactory/design-system/statement";',
    "",
    '<Statement kind="theorem" id="cedo">',
    "",
    "Antes de qualquer seção.",
    "",
    "</Statement>",
    "",
    "## Lemas",
    "",
    '<Statement kind="lemma" id="troca">',
    "",
    "Trocar uma aresta mantém a árvore.",
    "",
    "</Statement>",
    "",
    '<Statement kind="definition" id="troca">',
    "",
    "Uma troca tira uma aresta e põe outra.",
    "",
    "</Statement>",
    "",
    '<Statement kind="corollary" id="Mal_escrito">',
    "",
    "Prim acerta.",
    "",
    "</Statement>",
    "",
    'Pelo <Ref to="inexistente" />, nada segue; pelo <Ref to="troca" />, a árvore continua.',
    "",
    "- Um item com um enunciado:",
    "",
    '  <Statement kind="lemma" id="na-lista">',
    "",
    "  Dentro de um item.",
    "",
    "  </Statement>",
    "",
    '<OpenQuestion id="por-que-troca">',
    "",
    '<Statement kind="corollary" id="na-questao">',
    "",
    "Dentro de uma questão.",
    "",
    "</Statement>",
    "",
    "Por que a troca mantém a árvore?",
    "",
    "---",
    "",
    "Porque a aresta nova reconecta as duas partes.",
    "",
    "</OpenQuestion>",
  ]),
  "artifacts/afirmacoes/index.mdx": artifact(fields("4f1rm4c0", "Afirmações", "Matemática"), [
    'import Afirmacao from "@artifactory/design-system/statement";',
    "",
    "## Paridade",
    "",
    'Um enunciado se escreve `<Statement kind="lemma" id="par">`, com o nome que o import lhe dá.',
    "",
    '<Afirmacao kind="lemma" id="par">',
    "",
    "A soma de dois pares é par.",
    "",
    "</Afirmacao>",
    "",
    '<Afirmacao kind="corollary" id="par">',
    "",
    "Zero é par.",
    "",
    "</Afirmacao>",
    "",
    '<Afirmacao kind="theorem" name="0 < x" id="impar">',
    "",
    "O quadrado de um ímpar positivo é ímpar.",
    "",
    "</Afirmacao>",
    "",
    '<Afirmacao kind="lemma" name="x > 1" id="impar">',
    "",
    "Todo ímpar maior que um tem um fator ímpar.",
    "",
    "</Afirmacao>",
  ]),
  "artifacts/demonstracoes/index.mdx": artifact(fields("d3m0nstr", "Demonstrações", "Matemática"), [
    'import Proof from "@artifactory/design-system/proof";',
    'import Statement from "@artifactory/design-system/statement";',
    "",
    "## Árvores",
    "",
    '<Statement kind="definition" id="arvore">',
    "",
    "Uma **árvore** é um grafo conexo sem ciclos.",
    "",
    "</Statement>",
    "",
    '<Proof of="arvore">',
    "",
    "Uma definição não se demonstra.",
    "",
    "</Proof>",
    "",
    '<Proof of="inexistente">',
    "",
    "Nada a demonstrar.",
    "",
    "</Proof>",
    "",
    '<Proof of="inexistente">',
    "",
    "Nem aqui.",
    "",
    "</Proof>",
    "",
    '<Statement kind="example" id="caminho">',
    "",
    "Um caminho é uma árvore?",
    "",
    "---",
    "",
    "Sim: é conexo e não tem ciclos.",
    "",
    "</Statement>",
    "",
    '<Proof of="caminho">',
    "",
    "Um exemplo se resolve, não se demonstra.",
    "",
    "</Proof>",
  ]),
  "artifacts/exemplos/index.mdx": artifact(fields("3x3mpl0s", "Exemplos", "Matemática"), [
    'import Statement from "@artifactory/design-system/statement";',
    "",
    "## Ciclos",
    "",
    '<Statement kind="example" id="sem-solucao">',
    "",
    "Quantas arestas tem um ciclo de $n$ vértices?",
    "",
    "</Statement>",
    "",
    '<Statement kind="example" id="solucao-vazia">',
    "",
    "Quantas folhas tem um ciclo?",
    "",
    "---",
    "",
    "</Statement>",
    "",
    '<Statement kind="theorem" id="com-solucao">',
    "",
    "Todo ciclo tem tantas arestas quanto vértices.",
    "",
    "---",
    "",
    "Cada vértice começa exatamente uma aresta.",
    "",
    "</Statement>",
    "",
    '<Statement kind="definition" id="ciclo">',
    "",
    "Um **ciclo** é um caminho fechado.",
    "",
    "---",
    "",
    "</Statement>",
    "",
    '<Statement kind="definition" id="grau">',
    "",
    "O **grau** de um vértice é o número de arestas que o tocam.",
    "",
    "---",
    "",
    "Num ciclo, todo vértice tem grau 2.",
    "",
    "</Statement>",
  ]),
};

describe("a repo whose artifacts break math, code, diagram, link, question ID, statement, proof and example rules, after one was deleted", () => {
  let repo: FixtureRepo;
  let run: CheckRun;

  beforeAll(async () => {
    repo = await createFixtureRepo({
      ...mathAndCode,
      ...diagramsAndFigures,
      ...links,
      ...questionIds,
      ...statements,
    });
    await commitArtifacts(repo);
    await succeeds(repo.run("git", ["rm", "-r", "--quiet", "artifacts/derivadas"]));
    run = await repo.check(["--artifacts-only"]);
  }, checkTimeout);

  afterAll(() => repo.remove());

  it("fails each math and code failure at its position in the artifact's source", () => {
    expect(run.exitCode).toBe(1);
    expect(linesFor(run, ["fisica", "quimica"])).toEqual([
      "artifacts/fisica/index.mdx:9:18 error math: Temml can't render this math: Unexpected end of input in a macro argument, expected '}' (artifact skill: Math)",
      'artifacts/fisica/index.mdx:9:38 error math: Temml can\'t render this math: Accented Unicode text character "é" used in math mode; write words as \\text{…} (artifact skill: Math)',
      "artifacts/fisica/index.mdx:13:1 error math: Temml can't render this math: Unsupported function name: \\foo (artifact skill: Math)",
      "artifacts/fisica/index.mdx:16:4 error code-language: `pythn` is not a code language Shiki knows (artifact skill: Code blocks)",
      "artifacts/quimica/index.mdx:9:12 error math: Temml can't render this math: Expected '}', got 'EOF' (artifact skill: Math)",
    ]);
  });

  it("fails at each D2 error's position in the .d2 source, at a stepper diagram with too few boards and at each missing alt", () => {
    expect(linesFor(run, ["ecologia", "genetica"])).toEqual([
      "artifacts/ecologia/cadeia.d2:1:1 error d2: D2 can't compile this diagram: connection missing destination (artifact skill: Diagrams and figures)",
      "artifacts/ecologia/cadeia.d2:1:12 error d2: D2 can't compile this diagram: connection missing source (artifact skill: Diagrams and figures)",
      "artifacts/ecologia/cadeia.d2:2:13 error d2: D2 can't compile this diagram: maps must be terminated with } (artifact skill: Diagrams and figures)",
      "artifacts/ecologia/index.mdx:16:4 error TS2322: Property 'alt' is missing in type '{ src: string; }' but required in type 'Props'. (artifact skill: Components)",
      'artifacts/genetica/heranca.d2:3:10 error d2: D2 can\'t compile this diagram: unknown shape "bogus" (artifact skill: Diagrams and figures)',
      "artifacts/genetica/index.mdx:16:2 error TS2322: Property 'alt' is missing in type '{ src: string; }' but required in type 'Props'. (artifact skill: Components)",
      "artifacts/genetica/meiose.d2:1:1 error d2: A stepper needs at least two boards, but this diagram has 1: draw each step under `steps` (artifact skill: Diagrams and figures)",
    ]);
  });

  it("fails at each link, tooltip, icon, shadow, fill pattern, animation, fade, written colour, sketch and legend a D2 file asks for", () => {
    expect(linesFor(run, ["ecossistema"])).toEqual([
      "artifacts/ecossistema/teia.d2:1:11 error d2: `sol` has a tooltip, but diagrams draw no links, tooltips or icons: put it in the prose (artifact skill: Diagrams and figures)",
      "artifacts/ecossistema/teia.d2:2:19 error d2: `plantas` has an icon, but diagrams draw no links, tooltips or icons: put it in the prose (artifact skill: Diagrams and figures)",
      "artifacts/ecossistema/teia.d2:3:25 error d2: `herbivoros` has a link, but diagrams draw no links, tooltips or icons: put it in the prose (artifact skill: Diagrams and figures)",
      "artifacts/ecossistema/teia.d2:3:52 error d2: `herbivoros` sets `style.shadow`, but diagrams cast no shadows: leave it out (artifact skill: Diagrams and figures)",
      "artifacts/ecossistema/teia.d2:4:33 error d2: `decompositores` sets `style.fill-pattern`, but diagrams fill flat: leave it out (artifact skill: Diagrams and figures)",
      "artifacts/ecossistema/teia.d2:4:59 error d2: `decompositores` sets `style.fill` to `#ff0000`, but diagrams take their colours from the design system: leave it out (artifact skill: Diagrams and figures)",
      "artifacts/ecossistema/teia.d2:5:22 error d2: `sol -> plantas` sets `style.animated`, but diagrams don't move: leave it out (artifact skill: Diagrams and figures)",
      "artifacts/ecossistema/teia.d2:5:44 error d2: `sol -> plantas` sets `style.opacity`, but diagrams don't fade: leave it out (artifact skill: Diagrams and figures)",
      "artifacts/ecossistema/teia.d2:6:7 error d2: `nota`'s markdown label has a link, but diagrams draw no links: put it in the prose (artifact skill: Diagrams and figures)",
      "artifacts/ecossistema/teia.d2:9:20 error d2: `sketch` draws by hand, but diagrams are drawn with straight rules: leave it out (artifact skill: Diagrams and figures)",
      "artifacts/ecossistema/teia.d2:9:35 error d2: `d2-legend` draws a legend, but diagrams have none: say what the shapes mean in the caption or the prose (artifact skill: Diagrams and figures)",
    ]);
  });

  it("lists every link to the deleted artifact, every missing anchor and file, and every link to a former slug", () => {
    expect(linesFor(run, ["integrais", "limites"])).toEqual([
      "artifacts/integrais/index.mdx:14:30 error link: the link `/derivadas/` leads to no page (artifact skill: Links)",
      "artifacts/limites/index.mdx:13:18 error link: the link `#sem-secao` leads to no element with ID `sem-secao` on this page (artifact skill: Links)",
      "artifacts/limites/index.mdx:13:46 error link: the link `/integrais/#q-nao-existe` leads to no element with ID `q-nao-existe` on /integrais/ (artifact skill: Links)",
      "artifacts/limites/index.mdx:13:93 error link: the link `/integrais-antigas/#q-primitiva` uses a former slug of artifacts/integrais/index.mdx; link to `/integrais/#q-primitiva` (artifact skill: Links)",
      "artifacts/limites/index.mdx:13:139 error link: the link `/figura.png` leads to no page or file (artifact skill: Links)",
      "artifacts/limites/index.mdx:15:16 error link: the link `/derivadas/` leads to no page (artifact skill: Links)",
      "artifacts/limites/index.mdx:15:58 error link: the link `/derivadas/#q-regra-da-potencia` leads to no page (artifact skill: Links)",
      "artifacts/limites/index.mdx:15:116 error link: the link `/derivadas/` leads to no page (artifact skill: Links)",
    ]);
  });

  it("fails at the second question with an ID already used in the artifact", () => {
    expect(linesFor(run, ["regras-de-derivacao"])).toContain(
      "artifacts/regras-de-derivacao/index.mdx:21:17 error question-id: the question ID `regra-da-potencia` is already used at line 12; give each question in an artifact its own ID (artifact skill: Components)",
    );
  });

  it("fails a question ID that isn't kebab-case, at its id prop", () => {
    expect(linesFor(run, ["regras-de-derivacao"])).toContain(
      "artifacts/regras-de-derivacao/index.mdx:31:15 error question-id: the question ID `Por_que` isn't lowercase kebab-case (artifact skill: Components)",
    );
  });

  it("fails a statement before the first section or below a section's top level, a statement ID already used or not kebab-case, and a citation of no statement, each at its prop", () => {
    expect(linesFor(run, ["teoremas"])).toEqual([
      "artifacts/teoremas/index.mdx:13:27 error statement-section: the statement `cedo` has no section number: write it after the first `##` heading, at the top level, not inside a list, a question or another component (artifact skill: Components)",
      "artifacts/teoremas/index.mdx:27:30 error statement-id: the statement ID `troca` is already used at line 21; give each statement in an artifact its own ID (artifact skill: Components)",
      "artifacts/teoremas/index.mdx:33:29 error statement-id: the statement ID `Mal_escrito` isn't lowercase kebab-case (artifact skill: Components)",
      "artifacts/teoremas/index.mdx:39:11 error citation-target: the citation `inexistente` names no statement in this artifact; give `to` a statement's ID (artifact skill: Components)",
      "artifacts/teoremas/index.mdx:43:27 error statement-section: the statement `na-lista` has no section number: write it after the first `##` heading, at the top level, not inside a list, a question or another component (artifact skill: Components)",
      "artifacts/teoremas/index.mdx:51:29 error statement-section: the statement `na-questao` has no section number: write it after the first `##` heading, at the top level, not inside a list, a question or another component (artifact skill: Components)",
    ]);
  });

  it("finds a statement by the name its import gives it, past `<` and `>` in its other props", () => {
    expect(linesFor(run, ["afirmacoes"])).toEqual([
      "artifacts/afirmacoes/index.mdx:21:29 error statement-id: the statement ID `par` is already used at line 15; give each statement in an artifact its own ID (artifact skill: Components)",
      "artifacts/afirmacoes/index.mdx:33:38 error statement-id: the statement ID `impar` is already used at line 27; give each statement in an artifact its own ID (artifact skill: Components)",
    ]);
  });

  it("fails a proof of a definition or of no statement, at its `of` prop", () => {
    expect(linesFor(run, ["demonstracoes"])).toEqual([
      "artifacts/demonstracoes/index.mdx:20:8 error proof-target: the proof of `arvore` names a statement of kind `definition`; give `of` the ID of the theorem, lemma or corollary it proves (artifact skill: Components)",
      "artifacts/demonstracoes/index.mdx:26:8 error proof-target: the proof of `inexistente` names no statement in this artifact; give `of` the ID of the theorem, lemma or corollary it proves (artifact skill: Components)",
      "artifacts/demonstracoes/index.mdx:32:8 error proof-target: the proof of `inexistente` names no statement in this artifact; give `of` the ID of the theorem, lemma or corollary it proves (artifact skill: Components)",
      "artifacts/demonstracoes/index.mdx:48:8 error proof-target: the proof of `caminho` names a statement of kind `example`; give `of` the ID of the theorem, lemma or corollary it proves (artifact skill: Components)",
    ]);
  });

  it("fails an example without a solution and any other statement with a `---`, at its `id` prop", () => {
    expect(linesFor(run, ["exemplos"])).toEqual([
      "artifacts/exemplos/index.mdx:13:27 error statement-solution: the example `sem-solucao` has no solution: write the problem, then `---` between blank lines, then the solution (artifact skill: Components)",
      "artifacts/exemplos/index.mdx:19:27 error statement-solution: the example `solucao-vazia` has no solution: write the problem, then `---` between blank lines, then the solution (artifact skill: Components)",
      'artifacts/exemplos/index.mdx:27:27 error statement-solution: the `theorem` `com-solucao` has a `---`, but only an example has a solution: give it `kind="example"`, or move what follows `---` after the statement, as a `<Proof of="com-solucao">` or a paragraph (artifact skill: Components)',
      "artifacts/exemplos/index.mdx:37:30 error statement-solution: the `definition` `ciclo` has a `---` with nothing after it, but only an example has a solution: remove the `---` (artifact skill: Components)",
      'artifacts/exemplos/index.mdx:45:30 error statement-solution: the `definition` `grau` has a `---`, but only an example has a solution: give it `kind="example"`, or move what follows `---` after the statement, as a paragraph (artifact skill: Components)',
    ]);
  });

  it("reports every failure in one run, and nothing else", () => {
    expect(run.summary[0]).toBe("pnpm check: 50 failures");
  });
});

describe("a repo whose only failure is an artifact's math", () => {
  let repo: FixtureRepo;
  let run: CheckRun;

  beforeAll(async () => {
    repo = await createFixtureRepo({
      "artifacts/quimica/index.mdx": mathAndCode["artifacts/quimica/index.mdx"],
    });
    run = await repo.check(["--artifacts-only"]);
  }, checkTimeout);

  afterAll(() => repo.remove());

  it("fails the math and leaves no question manifest, no build ID and no public paths manifest", () => {
    expect(run.exitCode).toBe(1);
    expect(run.summary).toEqual([
      "pnpm check: 1 failure",
      "artifacts/quimica/index.mdx:9:12 error math: Temml can't render this math: Expected '}', got 'EOF' (artifact skill: Math)",
    ]);
    expect(existsSync(join(repo.root, "dist-worker/question-manifest.json"))).toBe(false);
    expect(existsSync(join(repo.root, "dist-worker/build-id.json"))).toBe(false);
    expect(existsSync(join(repo.root, "dist-worker/public-paths.json"))).toBe(false);
  });
});

describe("an artifact whose Stage breaks the Stage's own rules", () => {
  let repo: FixtureRepo;
  let run: CheckRun;

  beforeAll(async () => {
    repo = await createFixtureRepo({
      "artifacts/grafos/index.mdx": artifact(fields("gr4f0s01", "Grafos", "Grafos"), [
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
        '    fields: [{ name: "a", min: 1, max: 9999 }, { name: "b", min: 0, max: 9999 }],',
        "    examples: [{ a: 48, b: 18 }, { a: 4.5, c: 2 }, { a: 48, b: 10000 }],",
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
    });
    run = await repo.check(["--artifacts-only"]);
  }, checkTimeout);

  afterAll(() => repo.remove());

  it("fails the build at the Stage, naming every rule it breaks", () => {
    expect(run.exitCode).toBe(1);
    expect(run.summary).toEqual([
      "pnpm check: 1 failure",
      "artifacts/grafos/index.mdx:14:1 error build: Stage: there is no `ausente.build.ts` beside the entry; give it only one of `choose` and `input`; example 2 has `c`, which no field has; example 2 gives `a` 4.5, which isn't a whole number; example 2 has no `b`; example 3 gives `b` 10000, outside 0 to 9999; give `alt` with `figure` (artifact skill: Build failures)",
    ]);
  });
});

describe.each([
  {
    stage: "a Stage with neither `choose` nor `input`",
    props: [],
    rule: "give it `choose`, with a label and its options, or `input`, with its fields and examples",
    typeErrors: [
      "artifacts/grafos/index.mdx:13:2 error TS2322: Property 'input' is missing in type '{ children: any; build: string; prompt: string; }' but required in type 'Typed'. (artifact skill: Components)",
    ],
  },
  {
    stage: "a Stage whose `input` has no examples",
    props: [
      '  input={{ label: "Calcular", fields: [{ name: "a", min: 0, max: 9 }], examples: [] }}',
    ],
    rule: "give `input` at least one example",
    typeErrors: [],
  },
  {
    stage: "a Stage with `beside` and no drawing",
    props: ['  choose={{ label: "Começar em", options: ["A"] }}', "  beside"],
    rule: "set `beside` only with `figure`",
    typeErrors: [],
  },
])("$stage", ({ props, rule, typeErrors }) => {
  let repo: FixtureRepo;
  let run: CheckRun;

  beforeAll(async () => {
    repo = await createFixtureRepo({
      "artifacts/grafos/index.mdx": artifact(fields("gr4f0s01", "Grafos", "Grafos"), [
        'import Stage from "@artifactory/design-system/stage";',
        "",
        "Digite um número.",
        "",
        "<Stage",
        '  build="conta"',
        ...props,
        '  prompt="Digite um número."',
        ">",
        "",
        "| Variável | Valor |",
        "| -------- | ----: |",
        "| a        |     0 |",
        "",
        "</Stage>",
      ]),
      "artifacts/grafos/conta.build.ts": [
        'import { defineBuild } from "@artifactory/design-system/stage-build";',
        "",
        'export default defineBuild({ steps: () => [{ say: "Conta." }] });',
        "",
      ].join("\n"),
    });
    run = await repo.check(["--artifacts-only"]);
  }, checkTimeout);

  afterAll(() => repo.remove());

  it("fails the build at the Stage, naming the rule", () => {
    expect(run.exitCode).toBe(1);
    expect(run.summary.slice(1)).toEqual([
      `artifacts/grafos/index.mdx:13:1 error build: Stage: ${rule} (artifact skill: Build failures)`,
      ...typeErrors,
    ]);
  });
});
