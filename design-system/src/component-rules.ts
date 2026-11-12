import { escapedAttribute, unescapedAttribute } from "./html-attributes.ts";

// A component checks its own rules as it renders. In a build, a broken one renders a marker in its
// place, so the check reports every broken rule in one run, each at its component's tag. Elsewhere,
// as in `astro dev`, the rule throws, so Astro's overlay names it.

// Each component's module under `@artifactory/design-system/`.
const modules = {
  Figure: "figure",
  Matching: "matching",
  NumericQuestion: "numeric-question",
  OpenQuestion: "open-question",
  SingleChoice: "single-choice",
  Stage: "stage",
  Stepper: "stepper",
} as const;

export type RuledComponent = keyof typeof modules;

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

// A component renders what `checked` holds, or else the marker in its place.
type RuleCheck<T> = { checked: T; marker?: undefined } | { checked?: undefined; marker: string };

export async function unlessRuleBroken<T>(
  component: RuledComponent,
  render: () => Promise<T> | T,
): Promise<RuleCheck<T>> {
  try {
    return { checked: await render() };
  } catch (error) {
    if (!(error instanceof BrokenRule) || shared[markersWanted] !== true) throw error;
    return {
      marker: `<template data-component-rule="${component}" data-message="${escapedAttribute(error.message)}"></template>`,
    };
  }
}

// A rendered component names itself on its outermost element, as its marker does when it's broken,
// so the check can count every instance in the page's order.
export function ruledInstance(component: RuledComponent) {
  return { "data-component": component };
}

export interface ComponentOnPage {
  module: string;
  brokenRule: string | undefined;
}

// Astro writes attribute values in double quotes and escapes only `&` and `"` in them, and code
// blocks escape their "<", so only a component's own element or marker matches.
const instances =
  /<(?:template data-component-rule="(?<marked>[^"]*)" data-message="(?<message>[^"]*)"|[a-z][\w-]*\s(?:[^>"]|"[^"]*")*?\bdata-component="(?<rendered>[^"]*)")/g;

// Each instance of a component that checks its rules, broken or not, in the page's order.
export function componentsOnPage(html: string): ComponentOnPage[] {
  return [...html.matchAll(instances)].map(({ groups = {} }) => {
    const { marked, message, rendered } = groups;
    return {
      module: modules[(marked ?? rendered) as RuledComponent],
      brokenRule: message === undefined ? undefined : unescapedAttribute(message),
    };
  });
}
