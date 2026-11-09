# 07: Shoot block-per-step code Steppers

Status: resolved
Blocked by: 02 (Shoot one-block code Steppers at every step); [Code display 04](../../code-display/issues/04-a-stepper-with-one-code-block-per-step.md)

Spec: [What `pnpm look` captures](../spec.md) › What look shoots

**What to build:** an agent who writes a Stepper with one code block per step ([Code display](../../code-display/spec.md)) sees every step of it rendered. Look recognises this form as a Stepper form it knows. Without that, ticket 04 fails it as unknown. Look shoots it at every step at both widths, clicking forward between steps, names the files `NN-stepper-step-K-<width>.png`, and prints its captions in place of an `alt`, as ticket 02 does for a one-block code Stepper.

- [x] A Stepper with one code block per step is shot at every step at both widths, with its captions printed, and isn't failed as an unknown form.
- [x] Seam 1 test, a new opt-in Look fixture: a Stepper with one code block per step is shot at every step at both widths (exit 0, every step among the captures, outcome `captured-awaiting-visual-review`).
- [x] In the same commit, the `artifact` skill's **Look** section names the block-per-step form among the code Steppers shot at every step.

## Comments

### 2026-11-09: what ticket 04 does with this form today

Implementer of [ticket 04](04-fail-on-an-item-look-cant-shoot.md#comments). `resolveItem` in `scripts/look.ts` now resolves a Stepper with none of `.stepper-boards`, `.stepper-code` or `.stepper-figure` to `stepper-unknown`, whose `kinds` entry has a `problem` (`a Stepper form look doesn't know`) in place of a `shoot`. So a block-per-step Stepper fails the case until this ticket gives its form a kind with `shoot: shootStepper`. `describeStepper` already prints captions when there's no `alt`. Check the new form's markup doesn't also contain `.stepper-code`: if it does, it resolves to `stepper-lines`, which shoots it as a one-block code Stepper.

### 2026-11-09: the markup code display 04 gives this form

Implementer of [Code display 04](../../code-display/issues/04-a-stepper-with-one-code-block-per-step.md).

- **Its mark is `.stepper-blocks`.** The form renders `<div class="stepper-stage stepper-blocks">` holding one `div[data-in-steps="K"]` per step, each with a print-only `p.stepper-step` heading and the block's own `pre`. It contains no `.stepper-code`, `.stepper-boards` or `.stepper-figure`, so today `resolveItem` resolves it to `stepper-unknown`; give it a kind with `marks: [".stepper-blocks"]` and `takeShots: shootStepper`.
- **Stepping:** the same `button.stepper-forward` and `.stepper-current` as every Stepper. Every block sits in one grid cell, the ones off their step `visibility: hidden`, so the Stepper keeps one height (the tallest block's) at every step: shots at one width are the same size step to step.
- **Captions and `alt`:** the form has no `alt`, as a one-block code Stepper hasn't, so `describeStepper` prints its captions as it does for that form.
- **A fixture:** the form needs two or more fences inside `<Stepper>` with none of `diagram`, `figure` or `lines` (one block fails the build). The `tests/check/valid-artifacts.test.ts` fixture `movimento-uniforme` has one with three blocks (`start=0`, `{2}` and an unmarked block).

### 2026-11-09: resolved

Implementer of this ticket.

- **Result:** `scripts/look.ts` has a `stepper-blocks` kind (`marks: [".stepper-blocks"]`, stem `stepper`, `shootStepper`, `describeStepper`), between `stepper-lines` and `stepper-figure`, so a Stepper with one code block per step is shot at every step at both widths as `NN-stepper-step-K-<width>.png`, with its captions printed in place of an `alt`, and no longer resolves to `stepper-unknown`. The `artifact` skill's **Look** section names the one-block form stepped by `lines` and the block-per-step form among the code Steppers shot at every step.
- **Commits:** `df8186a` (claim), `d383791` (look, its test and the skill, one commit).
- **Validation:** the new seam 1 test in `tests/check/browser-verification.test.ts` › "opt-in Look Stepper evidence", fixture `look-code-blocks` (three blocks with captions), failed first as `stepper-unknown` (`couldn't shoot 01-stepper, a stepper-unknown`) and passes now: exit 0, `01-stepper-step-{1,2,3}` at 393 and 1920 px, the captions line printed above them, outcome `captured-awaiting-visual-review`. Every opt-in Look test passes with `ARTIFACTORY_BROWSER_ACCEPTANCE=1` (10 passed), the unknown-form failure among them. I opened the shots: each step shows its own block under its caption and counter. The full `pnpm check` gate runs on the merged head.
- **Decisions:** the fixture gives the Stepper captions, so the test also covers the printed captions; one with no captions prints `no drawing and no caption` through the same `describeStepper` that ticket 02's test already covers, so it isn't repeated. `docs/agents/test-seams.md` already says "code Steppers shot at every step", which covers this form, so it's unchanged.
- **Shared parts:** none reached; the change stays inside `scripts/look.ts`.
- **Left undone:** nothing.
