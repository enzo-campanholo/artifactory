# 07: Shoot block-per-step code Steppers

Status: ready-for-agent
Blocked by: 02 (Shoot one-block code Steppers at every step); [Code display 04](../../code-display/issues/04-a-stepper-with-one-code-block-per-step.md)

Spec: [What `pnpm look` captures](../spec.md) › What look shoots

**What to build:** an agent who writes a Stepper with one code block per step ([Code display](../../code-display/spec.md)) sees every step of it rendered. Look recognises this form as a Stepper form it knows. Without that, ticket 04 fails it as unknown. Look shoots it at every step at both widths, clicking forward between steps, names the files `NN-stepper-step-K-<width>.png`, and prints its captions in place of an `alt`, as ticket 02 does for a one-block code Stepper.

- [ ] A Stepper with one code block per step is shot at every step at both widths, with its captions printed, and isn't failed as an unknown form.
- [ ] Seam 1 test, a new opt-in Look fixture: a Stepper with one code block per step is shot at every step at both widths (exit 0, every step among the captures, outcome `captured-awaiting-visual-review`).
- [ ] In the same commit, the `artifact` skill's **Look** section names the block-per-step form among the code Steppers shot at every step.
