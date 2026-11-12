# 02: Every question test mounts its component's markup

Status: claimed
Blocked by: 01

Spec: [Question markup in store tests](../spec.md). Tests only.

**What to build:** the numeric, matching and open question tests in `tests/store` mount through the helper [01](01-the-single-choice-tests-mount-the-component-s-own-markup.md) built, and their hand copies of the components' markup go. The spike rendered only `SingleChoice`, so the other three components are untried: a matching renders several questions in one box, and an open question a model answer in place of a Check button.

`tests/store/minimal-question.ts` stays as it is. It defines its own minimal element to test the store, and copies no component.

- [x] `numeric-question.test.ts`, `matching.test.ts` and `open-question.test.ts` mount through the helper, and every case in them still asserts what it did.
- [x] No file in `tests/store` writes the markup of a design-system question component by hand. `grep` for the components' root tags finds them only in the helper's fixtures.
- [x] A case that passed only because of a copy's drift is fixed in the test, or, if it shows a real fault in an element, reported in a dated comment and left failing for the owner to decide.
- [x] Every other `tests/store`, `tests/scoring` and `tests/check` case passes unchanged, and Vitest stays on two workers.
- [x] The closing comment records what the change adds to the store tests' run, in seconds.

## Comments

### 2026-11-11: implementation

Implementation sub-agent, branch `impl/question-markup-in-store-tests-02`. Commits: `39b3e0c` (claim), `d04889e` (fixtures, helper, the three test files), and this record.

**What was built.**

- `numeric-question.test.ts`, `matching.test.ts` and `open-question.test.ts` mount through `tests/store/rendered-question.ts`, each from an `.mdx` fixture: `gravity.mdx` and `gravity-worked.mdx` (the same `NumericQuestion` without and with its worked solution), `memory-areas.mdx` (the `Matching` with its three items, four options and explanation) and `tides.mdx` (the `OpenQuestion` and its model answer). Their hand copies are gone, and no file gained a `@vitest-environment` line, since the helper gives them the page.
- The helper passes props to the fixture, so one numeric fixture renders every key and unit the cases try (`answer={props.answer}`, and so on). It also exports `renderQuestion`, the rendered markup before mounting, which the open question's "restored before the question shows" case needs to put the browser's restored answer in the textarea before the element connects. `mountQuestion` is built on it. Nothing but the helper imports `astro/container`.
- The numeric cases set the page's language on `<html lang>`, as the built page does, where the copy wrapped the question in a `<div lang>`. The pt-BR cases still get their Portuguese lines.
- A matching renders several questions in one box and an open question a model answer in place of Check: both worked through the helper as they are, with no change to it.
- `grep` finds none of the components' root tags (`<artifact-single-choice`, `<artifact-numeric`, `<artifact-open-question`, `<artifact-matching`) anywhere in `tests/store`, and their component tags only in the five fixtures. `minimal-question.ts` is unchanged. The hand-written `<artifact-attempt>`, `<artifact-attempts-panel>` and `<artifact-state-notices>` left in `tests/store` are not question components.

**Drift.** Three numeric cases failed on the real markup, all because of the copy: the real explanation is a revealed part under its "Explanation" heading, where the copy had a bare paragraph, so the explanation's text started with "ExplanationExplicação". The test now reads the worked solution from the revealed part's content (`shownExplanation`), and asserts the same text, order and visibility as before. No case showed a fault in an element. Every matching and open question case passed on the real markup at once.

**The cases read the rendered markup.** With each fixture broken (the open and numeric questions' IDs changed, a matching item's answer changed), 35 of the 48 cases in the three files fail. The 13 that still pass don't depend on the ID or the key: input refused, or a mark that saves nothing.

**Cost.** The change makes the store tests' run about **1.4 s faster**, not slower. Alternating runs of `vitest run tests/store` at the claim commit and at `d04889e`, in two worktrees, with runs that waited in the heavy queue left out: wall clock 12.51 s mean before (3 runs), 11.14 s after (4 runs); Vitest's Duration 10.57 s → 9.17 s. The three files' fixtures add no visible transform time beyond ticket 01's (transform about 1.0 s both ways), and 216 tests ran both ways. Vitest stays on two workers (`vitest.config.ts` unchanged).

**Docs.** `docs/agents/test-seams.md` › `tests/store` and `CODING_STANDARDS.md` › Tests already say a question's markup is its component's own, from ticket 01; this ticket makes that true of every question test, and neither needed a change.

**Shared parts reached:** none. Tests only; production code unchanged.

**Validation:** `eslint tests/store` and `tsc --noEmit` clean after `astro sync`; a full `pnpm check` on the final HEAD, after merging the integration branch.
