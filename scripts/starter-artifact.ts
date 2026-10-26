import type { ArtifactFrontmatter } from "../src/artifact-frontmatter.ts";

type Lang = ArtifactFrontmatter["lang"];

const fence = "```";

const imports = `import Diagram from "@artifactory/design-system/diagram";
import Figure from "@artifactory/design-system/figure";
import OpenQuestion from "@artifactory/design-system/open-question";
import SingleChoice from "@artifactory/design-system/single-choice";
import Stepper from "@artifactory/design-system/stepper";
import diagram from "./diagram.d2";
import figure from "./figure.svg?raw";`;

const entryBodies: Record<Lang, string> = {
  en: String.raw`${imports}

{/* pnpm new wrote this starter entry. Replace every example with the artifact's own content and delete the patterns it doesn't need. The artifact skill explains each one. */}

Open with what the artifact covers and why it matters.

## Math

Inline math sits in a sentence, like $A = \pi r^2$, and display math gets its own lines:

$$
A = \int_0^r 2 \pi \rho \, \mathrm{d}\rho = \pi r^2
$$

In Portuguese, the formula reads <span lang="pt-BR">a área é pi vezes o raio ao quadrado</span>.

## Code

${fence}ts
export function area(radius: number): number {
  return Math.PI * radius ** 2;
}
${fence}

## Diagram and figure

<Diagram
  src={diagram}
  alt="Measure the radius, square it, then multiply by pi to get the area."
/>

<Figure src={figure} alt="A circle with its radius r drawn from the centre to the edge." />

## Step by step

<Stepper
  lines={["1", "2", "3"]}
  captions={[
    "The function takes the radius.",
    "The diameter is twice the radius.",
    "The circumference is pi times the diameter.",
  ]}
>

${fence}ts
export function circumference(radius: number): number {
  const diameter = 2 * radius;
  return Math.PI * diameter;
}
${fence}

</Stepper>

## Questions

<SingleChoice id="area-of-a-circle" answer={2}>

Which expression gives the area of a circle of radius $r$?

1. $2 \pi r$
2. $\pi r^2$
3. $\frac{4}{3} \pi r^3$

</SingleChoice>

<OpenQuestion id="doubling-the-radius">

What happens to the area of a circle when its radius doubles, and why?

---

It grows four times. Doubling the radius doubles every length in the circle in both directions, and $\pi (2r)^2 = 4 \pi r^2$.

</OpenQuestion>
`,
  "pt-BR": String.raw`${imports}

{/* O pnpm new escreveu esta entrada inicial. Troque cada exemplo pelo conteúdo do artefato e apague os padrões que ele não usar. A skill artifact explica cada um. */}

Comece dizendo o que o artefato cobre e por que importa.

## Matemática

A matemática em linha fica na frase, como $A = \pi r^2$, e a matemática em destaque ocupa as próprias linhas:

$$
A = \int_0^r 2 \pi \rho \, \mathrm{d}\rho = \pi r^2
$$

Em inglês, a fórmula se lê <span lang="en">the area is pi times the radius squared</span>.

## Código

${fence}ts
export function area(raio: number): number {
  return Math.PI * raio ** 2;
}
${fence}

## Diagrama e figura

<Diagram
  src={diagram}
  alt="Meça o raio, eleve ao quadrado e multiplique por pi para obter a área."
/>

<Figure src={figure} alt="Um círculo com o raio r traçado do centro até a borda." />

## Passo a passo

<Stepper
  lines={["1", "2", "3"]}
  captions={[
    "A função recebe o raio.",
    "O diâmetro é o dobro do raio.",
    "A circunferência é pi vezes o diâmetro.",
  ]}
>

${fence}ts
export function circunferencia(raio: number): number {
  const diametro = 2 * raio;
  return Math.PI * diametro;
}
${fence}

</Stepper>

## Perguntas

<SingleChoice id="area-do-circulo" answer={2}>

Qual expressão dá a área de um círculo de raio $r$?

1. $2 \pi r$
2. $\pi r^2$
3. $\frac{4}{3} \pi r^3$

</SingleChoice>

<OpenQuestion id="dobrando-o-raio">

O que acontece com a área de um círculo quando o raio dobra, e por quê?

---

Ela fica quatro vezes maior. Dobrar o raio dobra todas as medidas do círculo nas duas direções, e $\pi (2r)^2 = 4 \pi r^2$.

</OpenQuestion>
`,
};

const diagrams: Record<Lang, string> = {
  en: `radius: Measure the radius
square: Square it
area: Multiply by pi

radius -> square -> area
`,
  "pt-BR": `raio: Meça o raio
quadrado: Eleve ao quadrado
area: Multiplique por pi

raio -> quadrado -> area
`,
};

const figure = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <circle cx="80" cy="80" r="64" class="fill-tint stroke-accent" />
  <line x1="80" y1="80" x2="144" y2="80" class="stroke-text" />
  <circle cx="80" cy="80" r="3" class="fill-text" />
  <text x="112" y="72" text-anchor="middle" font-size="14">r</text>
</svg>
`;

export function starterFiles(lang: Lang): { body: string; besideEntry: Record<string, string> } {
  return {
    body: entryBodies[lang],
    besideEntry: { "diagram.d2": diagrams[lang], "figure.svg": figure },
  };
}
