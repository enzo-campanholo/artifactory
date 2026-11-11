import { escapedAttribute, unescapedAttribute } from "./html-attributes.ts";

// A component checks its own rules as it renders. In a build, a broken one renders a marker in its
// place, so the check reports every broken rule in one run, each at its component's tag. Elsewhere,
// as in `astro dev`, the rule throws, so Astro's overlay names it.

// Each component's module under `@artifactory/design-system/`, and how its rendered instance opens.
const components = {
  Figure: { module: "figure", opens: 'figure class="figure"' },
  Matching: { module: "matching", opens: "artifact-matching" },
  NumericQuestion: { module: "numeric-question", opens: "artifact-numeric" },
  OpenQuestion: { module: "open-question", opens: "artifact-open-question" },
  SingleChoice: { module: "single-choice", opens: "artifact-single-choice" },
  Stage: { module: "stage", opens: "artifact-stage" },
  Stepper: { module: "stepper", opens: "artifact-stepper" },
} as const;

type RuledComponent = keyof typeof components;

class BrokenRule extends Error {}

// A rule a part shares between components names each of them, as "Figure or Stepper: …".
export function brokenRule(
  named: RuledComponent | readonly RuledComponent[],
  rule: string,
): BrokenRule {
  return new BrokenRule(`${typeof named === "string" ? named : named.join(" or ")}: ${rule}`);
}

// Astro renders the pages in the process that runs the integrations, but loads this module again
// for them, so the build's choice reaches the components through a global.
const markersWanted = Symbol.for("artifactory.component-rule-markers");
const shared = globalThis as typeof globalThis & { [markersWanted]?: true };

// Only the pass that reads the markers asks for them, so no build renders one that nothing reports.
export function renderBrokenRulesAsMarkers(): void {
  shared[markersWanted] = true;
}

export async function unlessRuleBroken<T extends object>(
  component: RuledComponent,
  render: () => Promise<T> | T,
): Promise<T | { marker: string }> {
  try {
    return await render();
  } catch (error) {
    if (!(error instanceof BrokenRule) || shared[markersWanted] !== true) throw error;
    return {
      marker: `<template data-component-rule="${component}" data-message="${escapedAttribute(error.message)}"></template>`,
    };
  }
}

export interface ComponentOnPage {
  module: string;
  brokenRule: string | undefined;
}

// Astro writes attribute values in double quotes and escapes only `&` and `"` in them, and code
// blocks escape their "<", so only a component's own element or marker matches. Built on each call,
// so the page's scripts, which import the rules through their component's module, don't carry it.
function instances(): RegExp {
  const opening = Object.values(components).map(({ opens }) => opens);
  return new RegExp(
    String.raw`<(?<opens>${opening.join("|")})[\s>]|<template data-component-rule="(?<marked>[^"]*)" data-message="(?<message>[^"]*)">`,
    "g",
  );
}

function ruledComponent(written: string | undefined): RuledComponent | undefined {
  return (Object.keys(components) as RuledComponent[]).find(
    (component) => component === written || components[component].opens === written,
  );
}

// Each instance of a component that checks its rules, broken or not, in the page's order.
export function componentsOnPage(html: string): ComponentOnPage[] {
  return [...html.matchAll(instances())].flatMap(({ groups = {} }): ComponentOnPage[] => {
    const { opens, marked, message } = groups;
    const component = ruledComponent(opens ?? marked);
    if (component === undefined) return [];
    return [
      {
        module: components[component].module,
        brokenRule: message === undefined ? undefined : unescapedAttribute(message),
      },
    ];
  });
}
