import { escapedAttribute, unescapedAttribute } from "./html-attributes.ts";

// A component checks its own rules as it renders. In a build, a broken one renders a marker in its
// place, so the check reports every broken rule in one run, each at its component's tag. Elsewhere,
// as in `astro dev`, the rule throws, so Astro's overlay names it.

const components = {
  Stepper: { module: "stepper", element: "artifact-stepper" },
} as const;

type RuledComponent = keyof typeof components;

class BrokenRule extends Error {
  readonly component: RuledComponent;

  constructor(component: RuledComponent, rule: string) {
    super(`${component}: ${rule}`);
    this.component = component;
  }
}

export function brokenRule(component: RuledComponent, rule: string): BrokenRule {
  return new BrokenRule(component, rule);
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
  render: () => Promise<T> | T,
): Promise<T | { marker: string }> {
  try {
    return await render();
  } catch (error) {
    if (!(error instanceof BrokenRule) || shared[markersWanted] !== true) throw error;
    return {
      marker: `<template data-component-rule="${error.component}" data-message="${escapedAttribute(error.message)}"></template>`,
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
  const elements = Object.values(components).map(({ element }) => element);
  return new RegExp(
    String.raw`<(?<element>${elements.join("|")})[\s>]|<template data-component-rule="(?<marked>[^"]*)" data-message="(?<message>[^"]*)">`,
    "g",
  );
}

function ruledComponent(written: string | undefined): RuledComponent | undefined {
  return (Object.keys(components) as RuledComponent[]).find(
    (component) => component === written || components[component].element === written,
  );
}

// Each instance of a component that checks its rules, broken or not, in the page's order.
export function componentsOnPage(html: string): ComponentOnPage[] {
  return [...html.matchAll(instances())].flatMap(({ groups = {} }): ComponentOnPage[] => {
    const { element, marked, message } = groups;
    const component = ruledComponent(element ?? marked);
    if (component === undefined) return [];
    return [
      {
        module: components[component].module,
        brokenRule: message === undefined ? undefined : unescapedAttribute(message),
      },
    ];
  });
}
