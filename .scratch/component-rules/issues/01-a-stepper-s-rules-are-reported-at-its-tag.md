# 01: A Stepper's rules are reported at its tag

Status: claimed
Blocked by: None (can start immediately)

Spec: [Component rules](../spec.md). This ticket builds the whole path for one component, so [02](02-every-component-reports-its-rules.md) only repeats it.

**What to build:** in a build, a `Stepper` whose rule is broken renders only a marker carrying its name and message. The design system exports a reader of the markers on a page. The built-output pass reports each one as `component-rule`, under **Components**, at the Stepper's own tag in the entry, and the build fails at the end. In `astro dev` the rule throws as today.

The Stepper's rules are thrown from two files, `Stepper.astro` and `stepper.ts`, ten places in all. `stepper.ts` also parses the line-list grammar that a fence's `{…}` uses; that parse already returns a refusal's reason, and only the Stepper turns it into a component error, so the fence's own failures don't change.

Every other component keeps throwing until 02, so the log scraping in `scripts/check/steps/build.ts` and `onlyTagOffset` stay for now.

This is design-system work: do it in a local session with impeccable (`design-system/CLAUDE.md`). Nothing the owner sees on a valid page changes.

- [x] In a build, each broken `Stepper` renders a marker and nothing else of itself, and the build fails at the end with no question manifest, public paths manifest or build ID.
- [x] Each marker is reported as `component-rule` under **Components**, with the message it has today.
- [x] Two broken Steppers in one entry are each reported at their own tag, in one run, and so is a Stepper the entry imports under another name.
- [x] When the page's Steppers and the entry's tags don't count the same, the failure falls back to line 1, column 1 of the entry.
- [x] A marker on a page that isn't an artifact fails the build at the config's start, with the page's route in the message.
- [x] An artifact with a `component-rule` failure skips its other built-page checks, and a valid artifact in the same repo keeps all of them.
- [x] In `astro dev` a broken Stepper rule throws with today's message. One function decides between throwing and rendering the marker.
- [x] The design system imports nothing from the platform.
- [x] `tests/check`: the Stepper's rule cases assert the new rule ID and positions. They move into one fixture repo that 02 extends, and their single-rule fixture repos go.
- [x] The `artifact` skill's `rules.md` documents `component-rule` for the Stepper in the same commit, and `docs/agents/test-seams.md` follows.
- [x] A valid Stepper of each form (code blocks, `lines`, `diagram`, `figure`) renders on its catalog page as before.

## Comments

### 2026-11-10: implementation

Implementer session on `impl/component-rules-01`, from `architecture-review-implementation` at `c6b9706`. Commits: `b910f6e` (claim), then one commit with the code, tests and docs together, so the skill changes with what `pnpm check` reports.

**Result.**

- `design-system/src/component-rules.ts` (export `./component-rules`) is the writer and reader. A rule throws `brokenRule("Stepper", …)`, ten places across `Stepper.astro` and `stepper.ts`. `unlessRuleBroken` is the one function that decides: in a build it returns a marker, `<template data-component-rule="Stepper" data-message="…">`, and the Stepper renders that alone; anywhere else it rethrows. A build asks for markers only through `renderBrokenRulesAsMarkers()`, which `builtOutput()` calls in `astro:config:setup` when `command === "build"`. So no component asks which command is running, and markers are only rendered when the pass that reports them is installed. `import.meta.env.DEV` couldn't decide this: a build run under `NODE_ENV=test`, as the fixture checks run it, is also DEV (`stage-builds.ts` notes the same thing). `componentsOnPage(html)` lists every instance of a component that checks its rules in the page's order, valid ones (by their `artifact-stepper` element) and broken ones (by the marker), so occurrences count both.
- `src/component-rule-failures.ts` reports each marker as `component-rule` under **Components**, with today's message. It is placed through the new `component-instance` target in `src/source-locator.ts`: the nth instance on the page goes to the nth tag of the module's imported names (`componentTags`, now shared with `componentProps`), and to `1:1` when the counts differ. A marker on a page that isn't an artifact's fails at `astro.config.ts:1:1`, with `; on /route/, which isn't an artifact's page` after the message. An artifact with a marker is left out of question IDs, statements, the links its own page holds (it stays a link target), first paint, html-validate and custom build runs. `readBuildResult` lets the steps that read the built pages run when the build's only failures are `component-rule`, and those steps skip pages with a marker (`hasBrokenComponent`). The build still fails at the end through `stopIfAny`, with no manifests or build ID.
- `scripts/check/steps/build.ts` is unchanged: its scraping still serves the other components until 02.
- Docs: `rules.md` › **Components** gains `component-rule` for the Stepper (what its line reads, the `1:1` fallback, the skipped follow-on checks, the `astro.config.ts` line). **Code blocks** and **Build failures** stop naming the Stepper as `build`, and `test-seams.md` follows.

**Validation.**

- `tests/check/component-rules.test.ts` is one fixture repo for 02 to extend. It holds each Stepper rule once at its tag (11 lines: the line-list refusal comes once through `lines` and once through `data-step`), two broken Steppers among valid ones in one entry, one imported as `Passos`, a broken Stepper nested in a broken one falling back to `1:1`, a broken Stepper on `src/pages/pagina-de-passos.astro`, and a valid artifact whose html-validate failure is still reported while the broken artifact's heading and link failures aren't. The Stepper's single-rule fixture repos in `artifact-failures.test.ts` are gone, and so is its case in the swatch `describe.each`. The Stage's `{…}` case stays, as a plain `describe`, for 02.
- `astro dev`: a temporary page with `<Stepper lines={["1"]}>` logged `Stepper: it has 1 step; give it at least two`, thrown from `component-rules.ts`, the way today's error is. The page was then deleted and the dev server stopped.
- Catalog: I built the site with this branch and with the pre-change `Stepper.astro`, `stepper.ts` and `src/`, and diffed `dist/`. `catalog/index.html`, which holds the code-block, `lines`, `diagram` and `figure` Steppers, and every `_astro/` file are byte-identical. Only the build ID and the Library's and drafts page's build-ID stamp differ. One finding along the way: a module-level `RegExp` in `component-rules.ts` reached the Stepper's client script through `stepper.ts`. It is now built on each call, and that is what made the script byte-identical again. impeccable's context was loaded. With no markup or style change on a valid page, it had nothing visual to review.
- Shared parts: none changed. `InlineSvg.astro`'s two rules still throw as `build` until 02.

**Left as it is.**

- A Stepper whose `.d2` failed renders nothing, as before, so it isn't counted on the page. In that entry, a broken Stepper falls back to `1:1` until the diagram's own `d2` failure is fixed.
- When another built-page failure (a link or a question ID in a valid artifact) comes alongside a `component-rule` one, html-validate and the custom build runs are skipped site-wide, as they are today after any failed build. Only a run whose failures are all `component-rule` keeps them for the other artifacts.
- `<Stepper />` with no props and no children throws `Cannot read properties of undefined (reading 'match')`, because `Astro.slots.render` gives `undefined`. This was already true before this ticket and it is out of scope. The fixture page gives its Stepper a paragraph instead.
