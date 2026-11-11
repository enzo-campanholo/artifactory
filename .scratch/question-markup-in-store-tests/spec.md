# Question markup in store tests

Source: the architecture review of 2026-11-10, candidate 7, and the spike it asked for. The decisions below were made with the owner that day, and [Comments](#comments) records them.

## Problem

A question is one module in two halves: the markup its component renders in the build, and the element that adds behaviour to it. Seam 3 tests the element, and the tests supply the other half as hand copies: `mountSingleChoice` in `tests/store/single-choice.test.ts`, and the same in `numeric-question.test.ts` and `matching.test.ts`.

The copies have drifted from what the components render. In `Question.astro`, the status line sits inside the question's header, and the explanation is wrapped in a revealed part with its heading. In the single-choice copy, the status line sits directly under the form and the explanation is a bare paragraph. An element that works on the copy and breaks on the real markup passes every test.

## Behaviour

Tests and their Vitest setup only. No design-system or platform code changes.

- One helper renders a question component as the build does and mounts the result under happy-dom, with the design system's element running on it.
- The question tests in `tests/store` mount through it, and the hand copies of the components' markup go.
- `tests/store/minimal-question.ts` stays. It defines its own minimal element to test the store, and copies no component.

## What the spike found

A throwaway spike on 2026-11-10 rendered `SingleChoice.astro` with Astro's Container API in a node-environment test file, mounted it in a happy-dom window made by hand, and answered it through the store. The rendered markup was identical, tag for tag, to the same question on a fixture repo's built page.

```ts
// A node-environment test file, under a Vitest project that extends getViteConfig() from "astro/config".
const container = await experimental_AstroContainer.create(); // from "astro/container"
const html = await container.renderToString(SingleChoice, {
  props: { id: "capital", answer: 2 },
  slots: { default: "<p>…</p>\n<ol>…</ol>" },
});
const window = new Window({ url: "https://artifactory.test/fixture" }); // happy-dom
populateGlobal(globalThis, window, { bindFunctions: true }); // from "vitest/runtime"
await import("@artifactory/design-system/single-choice-element"); // only once the globals exist
const template = document.createElement("template");
template.innerHTML = html.replaceAll(/<script\b[\s\S]*?<\/script>/g, "");
document.body.replaceChildren(template.content);
```

- **Cost:** about three quarters of a second more per test file that hasn't run yet, for the `.astro` transform. The existing store and scoring tests passed unchanged under Astro's Vite config.
- **A happy-dom test file can't render.** Astro refuses to render a component in a client environment, so the file runs in node and makes its window by hand.
- **Mount through a `<template>`.** Setting `innerHTML` on a connected body runs the element's `connectedCallback` before its children exist.
- **An `.mdx` fixture avoids hand-written slots.** A slot passed as an HTML string is hand-copied markup again. Importing an `.mdx` fixture renders it through the site's real Markdown pipeline, and needs the MDX container renderer.
- **Not tried:** `NumericQuestion`, `Matching` and `OpenQuestion`.

## Risks, and their guards

- **The Container API is experimental** and may change in a patch release. Astro is pinned exactly, so it can only change on a deliberate upgrade, and the helper is the one place that touches it.
- **`getViteConfig` runs every integration as `astro dev`.** The site's `builtOutput` integration then deletes `.build/failures.json` each time Vitest starts. Ticket 01 must show that this can't disturb a `pnpm check` in progress, or any other command sharing the checkout. If it can't, the ticket returns to the owner as `needs-info`.

## Standards

- `CODING_STANDARDS.md` › Tests: seam 3's line says the questions' markup is the components' own, and the list of test doubles is unchanged.
- `docs/agents/test-seams.md` › `tests/store` follows.

## Out of scope

- The Stage and the Stepper. [The Stage on its page](../stage-on-its-page/spec.md) tests them on a built page.
- Generating a question's markup in its element. It would contradict ADR 0002, which has custom elements add behaviour to markup Astro already rendered.
- The two places that answer "as the owner would" for other purposes, `scripts/look.ts` and `design-system/catalog/states.ts`.

## Comments

### 2026-11-10: owner decisions at the architecture review

Owner, architecture review session, 2026-11-10 (thread 8d57bee0-37b7-4277-bf58-cace669ef571), every recommendation accepted.

- **Approved, round 1 Q8:** a throwaway spike, nothing merged, to find where real component markup can come from.
- **Approved, round 4 Q3:** this feature goes ahead, done last, as the two tickets in `issues/`, with ticket 01's guard on the integrations running as `dev`.
- **Order of work, round 2 Q12 and round 4 Q3:** sixth and last, after [Page numbering](../page-numbering/spec.md). It depends on no other feature.

### 2026-11-11: owner decision on the order of work

Owner, implement-spec orchestration session, 2026-11-11.

- **Approved:** ticket 01 starts while [The Stage on its page](../stage-on-its-page/spec.md) is still in progress, in a worker slot that order would leave idle. It touches only `tests/store` and the Vitest setup. [Page numbering](../page-numbering/spec.md) still waits for the Stage feature. This supersedes "sixth and last" for ticket 01 only.
