# 07: Shoot block-per-step code Steppers

Status: ready-for-agent
Blocked by: 02 (Shoot one-block code Steppers at every step); [Code display 04](../../code-display/issues/04-a-stepper-with-one-code-block-per-step.md)

Spec: [What `pnpm look` captures](../spec.md) › What look shoots

**What to build:** an agent who writes a Stepper with one code block per step ([Code display](../../code-display/spec.md)) sees every step of it rendered. Look recognises this form as a Stepper form it knows. Without that, ticket 04 fails it as unknown. Look shoots it at every step at both widths, clicking forward between steps, names the files `NN-stepper-step-K-<width>.png`, and prints its captions in place of an `alt`, as ticket 02 does for a one-block code Stepper.

- [ ] A Stepper with one code block per step is shot at every step at both widths, with its captions printed, and isn't failed as an unknown form.
- [ ] Seam 1 test, a new opt-in Look fixture: a Stepper with one code block per step is shot at every step at both widths (exit 0, every step among the captures, outcome `captured-awaiting-visual-review`).
- [ ] In the same commit, the `artifact` skill's **Look** section names the block-per-step form among the code Steppers shot at every step.

## Comments

### 2026-11-09: what ticket 04 does with this form today

Implementer of [ticket 04](04-fail-on-an-item-look-cant-shoot.md#comments). `resolveItem` in `scripts/look.ts` now resolves a Stepper with none of `.stepper-boards`, `.stepper-code` or `.stepper-figure` to `stepper-unknown`, whose `kinds` entry has a `problem` (`a Stepper form look doesn't know`) in place of a `shoot`. So a block-per-step Stepper fails the case until this ticket gives its form a kind with `shoot: shootStepper`. `describeStepper` already prints captions when there's no `alt`. Check the new form's markup doesn't also contain `.stepper-code`: if it does, it resolves to `stepper-lines`, which shoots it as a one-block code Stepper.
