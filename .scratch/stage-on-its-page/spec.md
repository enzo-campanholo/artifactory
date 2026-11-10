# The Stage on its page

Source: the architecture review of 2026-11-10, candidates 2 and 5. Every decision below was made with the owner that day, and [Comments](#comments) records them.

## Problem

### Six readers of one markup

What a Stage is on its page (its control, its inputs, its content as written, a step shown) has no single owner. Six places read the page's classes and attributes for themselves:

- `design-system/src/step-applier.ts`: `stageNodes`, `stageControl`, `stageGroups`, `stageFields`.
- `design-system/src/stage-element.ts`, which paints by them.
- `scripts/check/steps/custom-build-runs.ts`, which reads `.stage-input[data-examples]` and `.stage-option input` itself.
- `scripts/look.ts` (`shootStage`), which reads `data-control`, `.stage-field input`, `.stage-start`, `.stage-choice`, `data-group` and `.stage-option input`.
- `design-system/catalog/stage-runs.ts`, which clicks `.stage-start` and `.stage-forward` and reads `.stage-counter`.
- `tests/check/valid-artifacts.test.ts`, which asserts the same classes.

A Stage feature therefore touches most of them. Choice groups (f73a440) changed six platform files and then `look.ts` (ae1777a). Step colours (cffd7d6) changed seven design-system files. A prefactor with no behaviour change (9160f59) changed six.

### A step is checked in one file and painted in another

`step-applier.ts` turns a build's step into what is shown. The painting is `#paint`, `#colour` and `#rewrite` in `stage-element.ts`, which reach back into the other file's arrays by index (`this.#written.parts[index]`, `this.#written.tables[table]?.rows[row]?.[column]`). The name of a run, `a = 48, b = 18`, is formatted in `custom-build-runs.ts` and again in `look.ts`.

### Look guesses whether a run ran

The Stage's element keeps its step, its count and a refusal to itself. `pnpm look` infers "ran or refused" from `data-stepped`, a hook for a CSS transition, or from the said line differing from the prompt. The fixture `look-equal-prompt` exists for the case where that guess fails. The Stepper does say its count on its host, as `data-count`.

### The step row is two buttons and a convention

`StepControls.astro` emits two buttons and a class-name convention, `${kind}-back` and `${kind}-forward`. The stepping behind them is written twice, in `stage-element.ts` and in `Stepper.astro`'s inline element: a click moving one step, the arrow keys, the clamp at the ends, `aria-disabled` there, and dropping `disabled` once the element connects. `look.ts` keeps one selector table for each.

### No test reaches the page

Seam 1 sees a Stage's static HTML and its failure lines. What a valid run shows at each step is invisible to all four seams: no test mentions `stage-step-text`, `stage-as-written`, `data-colour`, `data-choice` or `aria-invalid`, and typed text that breaks a field's rule (653eb2d) landed with no test. The look acceptance cases assert only the counter and the refusal line, and CI doesn't run them.

## Behaviour

Nothing the owner or an artifact's agent sees changes: no component's props, no `COMPONENTS.md`, no `artifact` skill text.

### A fifth test seam: `tests/stepping`

It tests the Stage and the Stepper on a built page, under happy-dom.

- **Markup:** the seam builds one small fixture repo of its own and drives the built page with its shipped scripts. The fixture holds Stages of each control, a code Stepper and a figure Stepper, and it reuses the fixture-repo helper `tests/check` has.
- **It owns:** what a Stage shows at each step of a valid run (marks, swatches, rewritten cells and text, what is said), a refused run, typed input that breaks a field's rule, and the step row's behaviour on both hosts (the buttons, the arrow keys, the ends, the Stepper's announcement).
- **Seam 1 keeps:** every failure line for a build's steps, the printed steps in the built page, and `pnpm look`.
- **It can't reach:** a D2 Stepper's stepping. happy-dom reads only the first of a D2 Stepper's boards. It shares its element with the code and figure Steppers, which are tested.
- **Found out by ticket 01:** whether typed input and colourings run under happy-dom. The part-linking (`getBBox`) and the colour fade (`animate`, `getComputedStyle`) are browser calls. Whatever doesn't run stays with `pnpm look`.

### The step row owns stepping

The shared part carries the stepping behaviour and one contract. A host tells it how many steps there are and shows the step it is told. The Stepper's element leaves its inline script for a module.

### One module for the Stage on its page

Reading the page's markup, listing the inputs it offers, running the build on one, painting a shown step and naming a run sit behind one module that the element and the check share. Nothing outside it reads the Stage's inner classes to do any of those. Its interface is designed by its ticket, not here.

### The host says its state

The Stage's host reflects its step, its count and whether the run was refused, as the Stepper's `data-count` does. `pnpm look` and the catalog read only those and the step row. `data-stepped` stays what it is, a hook for the transition.

## What the spike found

A throwaway spike on 2026-11-10 mounted a fixture repo's built page under happy-dom, in a node-environment test file on the repo's own `vitest.config.ts`, and stepped a Stage and a code Stepper with the page's shipped scripts.

```ts
repo = await createFixtureRepo(files);
await repo.check(["--artifacts-only"]);
const html = await readFile(join(repo.root, "dist", slug, "index.html"), "utf8");
const window = new Window({ url: `https://artifactory.test/${slug}` }); // happy-dom
populateGlobal(globalThis, window, { bindFunctions: true }); // from "vitest/runtime"
document.write(html);
const stage = document.querySelector("artifact-stage");
const script = document.querySelector('script[src*="/Stage.astro"]');
const inDist = (path) => pathToFileURL(join(repo.root, "dist", path ?? "")).href;
stage.setAttribute("data-module", inDist(stage.getAttribute("data-module")));
await import(/* @vite-ignore */ inDist(script.getAttribute("src")));
```

- **Cost:** the small fixture's `check --artifacts-only` took 8 to 12 seconds, and mounting and loading added under a quarter of a second.
- **The page's URLs are site URLs.** `data-module` and the script's `src` must be mapped to files in `dist/`.
- **One page per test file.** An element is defined once per file, and the window can't be replaced between tests.
- **Mount before the element loads, or through a `<template>`.** Setting `innerHTML` on a connected body runs `connectedCallback` before the children exist, and the Stage throws.
- **Not tried:** typed-input Stages, `body` rows, code-line marks, colourings, and a figure Stepper.

The other route, Astro's experimental Container API, can't drive a Stepper while its element lives in `Stepper.astro`'s own script, and it finds a Stage's build only under `design-system/catalog/` or `artifacts/<slug>/`. [Question markup in store tests](../question-markup-in-store-tests/spec.md) uses it for the question components.

## Standards and documentation

- `CODING_STANDARDS.md` › Tests names five seams, and `scripts/check/seams.ts` lists `tests/stepping`, so the test-placement check accepts it.
- `docs/agents/test-seams.md` gains the seam, and "Not tested automatically" gains a D2 Stepper's stepping and whatever ticket 01 finds happy-dom can't run.
- `StepControls.astro` is a shared part (`CODING_STANDARDS.md` › Design system). It reaches the Stepper and the Stage.

## Out of scope

- **What each mark acts on, written three times:** the CSS, the `changes` model in `step-applier.ts` and the prose. The new module holds the model beside its painter. The CSS stays a second writing that no test sees.
- A custom build's interface (`defineBuild`, `trace`) and a machine's.
- Any new control, mark or Stage feature.

## Comments

### 2026-11-10: owner decisions at the architecture review

Owner, architecture review session, 2026-11-10 (thread 8d57bee0-37b7-4277-bf58-cace669ef571), every recommendation accepted.

- **Approved, round 1 Q3:** a fifth seam for the Stage and the Stepper on a page under happy-dom, with its own folder and its own line in `CODING_STANDARDS.md`.
- **Approved, round 1 Q4:** the step row and the Stage's module are one feature.
- **Approved, round 2 Q5:** the order of the four tickets, the seam first. This supersedes round 1 Q4's "the step row first".
- **Approved, round 2 Q6:** the folder `tests/stepping`, what it owns and what seam 1 keeps.
- **Approved, round 2 Q7:** the host reflects step, count and refused; look's guess and the `look-equal-prompt` fixture go.
- **Approved, round 2 Q8:** the marks' three writings are left alone.
- **Approved, round 2 Q11:** "run" and "step" join `GLOSSARY.md`.
- **Approved, round 4 Q1:** the seam builds its own small fixture repo and drives the built page with its shipped scripts.
- **Approved, round 4 Q2:** a D2 Stepper's stepping stays untested at the seam; ticket 01 finds out about typed input and colourings.
- **Order of work, round 2 Q12:** fourth, after [Component rules](../component-rules/spec.md), [Library row statuses](../library-row-statuses/spec.md) and [The HTTP transport against the Worker](../http-transport-against-the-worker/spec.md).
