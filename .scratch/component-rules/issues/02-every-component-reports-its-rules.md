# 02: Every component reports its rules

Status: claimed
Blocked by: 01

Spec: [Component rules](../spec.md).

**What to build:** every other component's rules take the path [01](01-a-stepper-s-rules-are-reported-at-its-tag.md) built for the Stepper: `SingleChoice`, `NumericQuestion`, `Matching`, `OpenQuestion`, `Figure`, `Stage`, and the two SVG rules `InlineSvg.astro` holds for a `Figure` and a figure `Stepper`. A numeric question's key that can't work is one of these rules, so it stops failing as `build`.

Then the scraping goes: `componentNamesIn`, `failedPage`, `componentInArtifact`, `componentsNamedIn`, `onlyTagOffset` and the `component` target. `failureFromAstroError` stays for Astro's own errors.

The `InlineSvg` rules keep their wording, `Figure or Stepper: …`, and are placed at the `Figure` or `Stepper` that holds the drawing.

This is design-system work: do it in a local session with impeccable (`design-system/CLAUDE.md`).

- [x] No component throws `componentError` in a build. Each broken one renders its marker, and each is reported as `component-rule` at its own tag.
- [x] A Stage, a `Matching` and a `Figure` still name every rule they break in one line.
- [x] A broken question renders no question, so the question manifest never lists it; the build has failed, so no manifest is written at all.
- [x] Two Stages in one entry are each reported at their own tag.
- [x] The scraping named above is deleted, and an MDX syntax error still fails as `build` at its line.
- [x] `tests/check`: one fixture repo breaks every component rule, each asserted once at its position. The single-rule fixture repos in `artifact-failures.test.ts` and `reporting.test.ts` go, and the Stage's type-error cases stay.
- [x] The `artifact` skill follows in the same commit: `rules.md` › **Components** and **Build failures**, and each mention in `stage.md`, `figures.md` and `statements.md` that a component rule fails as `build`.
- [x] `docs/agents/test-seams.md` › `tests/check` no longer says a component's error is placed "when the entry has only one of that name".
- [x] Shared part: `InlineSvg.astro` reaches `Figure` and the figure `Stepper`. A valid one of each renders on its catalog page as before, and the ticket's closing comment says so.
- [x] A valid component of every kind renders on its catalog page as before.

## Comments

### 2026-11-10: owner decision on a marker outside an artifact

Owner, implement-spec orchestration session, 2026-11-10, answering the open point in [01](01-a-stepper-s-rules-are-reported-at-its-tag.md)'s implementation comment.

- **Approved:** a marker on a page that isn't an artifact's (the catalog's, for example), reported at `astro.config.ts:1:1` with the page's route in its message, goes under the `artifact` skill's **Platform changes** section, not **Components**. Every marker inside an artifact stays under **Components**. This ticket makes the change for every component, the Stepper included, and `rules.md` follows.

### 2026-11-10: implementation

Implementer session on `impl/component-rules-02`, from `architecture-review-implementation` at `4c66dfe`. Commits: `c0722a5` (claim), then `e67e2e1` with the code, tests and docs together, so the skill changes with what `pnpm check` reports.

**Result.**

- `component-rules.ts` now knows every component that checks its rules, each by its module and by how its rendered instance opens (`artifact-stepper`, `artifact-stage`, `artifact-single-choice`, `artifact-numeric`, `artifact-open-question`, `artifact-matching`, and `figure class="figure"` for a `Figure`; a Stage's own `figure class="figure stage"` doesn't match it). `brokenRule` takes one name or several, so a shared rule still reads `Figure or Stepper: …`. `unlessRuleBroken(component, render)` now takes the component that renders the marker, so a rule thrown from a part it holds is placed at that component.
- `SingleChoice`, `NumericQuestion`, `Matching`, `OpenQuestion`, `Figure` and `Stage` throw `brokenRule` inside `unlessRuleBroken` and render only the marker when it returns one, as the Stepper does. A broken question renders no `Question`, so it has no question markers. Every message's wording is unchanged; a Stage, a `Matching` and a `Figure` still join every rule they break in one line.
- `InlineSvg.astro`'s two rules moved, unchanged, into `design-system/src/inline-svg.ts` (`drawingParts`), which `InlineSvg` still calls. `Figure` calls it after its swatch rules, a figure `Stepper` after its step-count and caption rules, and a `Stage` with `figure` after its own rules, each inside its own `unlessRuleBroken`, so the order of reported rules is today's and a drawing without a root or a `viewBox` is placed at the component drawing it. The Stage isn't in the ticket: without this, a Stage drawing without a `viewBox` would have thrown out of the build as `build` at `astro.config.ts:1:1`. Its message keeps today's `Figure or Stepper: …` wording.
- The owner's decision above: a marker on a page that isn't an artifact's is reported under **Platform changes** (`src/component-rule-failures.ts`), for every component, the Stepper included. Markers in an artifact stay under **Components**.
- Deleted: `design-system/src/component-errors.ts` and its export (`componentError`, `componentNamesIn`), `failedPage`, `componentInArtifact` and `componentsNamedIn` in `scripts/check/steps/build.ts`, and `onlyTagOffset` with the `component` target in `src/source-locator.ts`. `failureFromAstroError` stays: it places an error at Astro's `Location:` and otherwise at `astro.config.ts:1:1`.
- Docs: `rules.md` › **Components** documents `component-rule` for every component, with what each message means (moved from **Build failures**, which loses that bullet and gains one line for Astro's other errors). **Platform changes** gains the `astro.config.ts:1:1` line. `stage.md` and `figures.md` follow. `statements.md` had no mention of a component rule failing as `build`, so it is unchanged. `test-seams.md` › `tests/check` follows.

**Validation.**

- `tests/check/component-rules.test.ts` is the one fixture repo for every component rule, each asserted once at its tag: the Stepper's 12 lines from 01, 5 `SingleChoice` (imported as `Escolha`, after a valid one), 3 `NumericQuestion` (the key's `,` among them), 1 `OpenQuestion`, 5 `Matching`, 3 `Figure` swatch cases, both drawing rules (at a `Figure` and at a figure `Stepper`), the drawing rule at a Stage, and the Stage's rules: six Stages in one entry (one valid) each reported at its own tag, the `{…}` Stage, the Stage with every field and example rule, and the Stage swatch case. The Stage's type errors (`TS2322` for no `choose` or `input` at 13:2, and `TS2353` at 23:101 and 25:34) are asserted beside them at their old positions. The non-artifact page has a broken `OpenQuestion` beside its Stepper, both under **Platform changes**. The valid artifact's html-validate failure is still reported (46 failures in all). `pnpm exec vitest run tests/check/component-rules.test.ts`: 8 tests passed.
- The single-rule fixture repos are gone: 4 Stage and 3 Figure/Stage describes in `artifact-failures.test.ts`, and the `NumericQuestion`, `SingleChoice` and `Matching` describes in `reporting.test.ts`. The reporting test whose build failure was a broken `SingleChoice` now fails on math, so its build still fails and the built-output steps are still skipped. An MDX syntax error still fails as `build` at 10:1 (`reporting.test.ts`). `artifact-failures.test.ts` and `reporting.test.ts` pass.
- `astro dev`: a temporary page with a one-option `SingleChoice` logged `SingleChoice: it has 1 option; give it at least two`, thrown from `component-rules.ts`, and its page held no marker. The page was deleted and `astro dev stop` stopped the server.
- Catalog: I built the site with this branch and with the pre-change `design-system/`, `src/` and `scripts/`, then diffed `dist/`. `catalog/index.html` (five Figures and the code, `lines`, `diagram` and `figure` Steppers), `catalog/stage/`, `catalog/mepa/`, `rsa-from-scratch/` and every `_astro/` file are byte-identical. The Library and drafts page differ only in the build ID. The 15 question-state pages, each holding one question of every kind and Figures, hold the same markup and CSS rules. The only difference is where the `NumericQuestion` and `OpenQuestion` inline `<style>` block sits: now before `SingleChoice.css` instead of after it. Both are in the `components` layer, and no element is selected by both, so the cascade is the same. A puppeteer script served both builds and took full-page screenshots of `/catalog/` and nine state pages at 1280 px and 393 px. All 20 pairs are byte-identical PNGs. impeccable's context was loaded. With no markup or style change on a valid page, it had nothing visual to review.
- Shared parts: `InlineSvg.astro` reaches `Figure`, the figure and diagram `Stepper` and the `Stage` (and `Diagram` through `SvgImage.astro`). A valid `Figure` and a valid figure `Stepper` render byte-identically on `/catalog/`, and the Stage on `/catalog/stage/`. Its markup and styles are unchanged: only its two rules moved into `inline-svg.ts`.

**Left as it is.**

- The order of the two inline style blocks on the question-state pages, explained above. Rollup groups modules differently now that every question imports `component-rules.ts`.
- A Stage drawing's `Figure or Stepper: …` wording names components other than the Stage. Changing a message's wording is out of scope.
