# 08: Printed Steppers

Type: grilling
Status: resolved

## Question

What should a figure Stepper print?

## What the agents reported

Printed, a figure Stepper shows only its last step and then the list of captions. In a code-optimisation artifact, the four steps of a rewrite therefore print as the final code alone, with the earlier versions present only in words.

## To decide

Print every step (with its caption), print the first and last, or keep the last step plus captions and document it. This weighs paper length against the meaning lost. It may be deliberate; check `DESIGN.md` and the Stepper's code before deciding.

## Answer

Decided with the owner on 2026-11-08 (grilling session, one round, every recommendation accepted). The build is specified in [Printed Steppers](../../printed-steppers/spec.md).

- **Scope:** figure Steppers only. The reported case, a code rewrite drawn as a figure, is covered by [Code display](02-code-display.md)'s Stepper with one code block per step, which prints every block. A Stage keeps printing its content as written, since its run depends on the reader.
- **The drawing decides.** A figure whose parts are all in its last step prints once, at that step, with its captions listed, as today (the RSA sample's `powers-of-three.svg`). A figure with any part that leaves before the end prints every step, each under "N." and its caption, as D2 boards do (the catalog's `orbit-steps.svg`, `COMPONENTS.md`'s sodium pump). Rejected: keeping the last step everywhere (loses the moving figures), always printing every step (repeats a build-up step by step, wasting paper), first and last (arbitrary), and an author prop (an extra choice the build can make alone).
- **Each printed step uses the figure's full frame**, with no cropping, stays whole on its page, and keeps every marker, gradient and pattern the drawing refers to.
- No glossary entry: Steppers are component vocabulary. No ADR: easy to reverse.
