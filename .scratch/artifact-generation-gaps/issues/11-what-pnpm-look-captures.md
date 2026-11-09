# 11: What `pnpm look` captures

Type: grilling
Status: resolved

## Question

What should `pnpm look` shoot, and how should it shoot it, so that an agent sees every part of an artifact it has to judge and never gets a shot of the wrong thing?

## Where it came from

[Find out what `pnpm look` misses](07-find-out-what-pnpm-look-misses.md) found three causes:

- **Code Steppers:** the selector only takes Steppers with `.stepper-boards` or `.stepper-figure`, so a code Stepper is skipped without a word. [Code display](02-code-display.md)'s Stepper with one code block per step would be skipped too.
- **Hidden content:** a figure inside a closed model answer still has a client rect, so look shoots whatever is painted at that spot and prints the hidden figure's `alt` above it. [Question explanations](01-question-explanations.md)'s explanations will be hidden until the answer locks.
- **The bottom bar:** at 393 px the fixed bar can be in an element shot, depending on how look's clicks and scroll restores happen to time. On a real phone it covers content only after the reader scrolls up, as designed.

## To decide

- Whether look shoots code Steppers (one-block and one block per step) at every step, and whether plain code blocks with `{…}` marks count.
- What look does with content behind a closed `<details>` (model answers, explanations): open it before the shot, shoot it as a separate item, or refuse it and print that it was skipped.
- Whether look hides the bottom bar (and the notice band) during element shots, or checks that nothing fixed overlaps the item.
- Whether look prints every item it found but didn't shoot, with the reason, and whether a shot whose element isn't rendered fails the case instead of passing as `captured-awaiting-visual-review`.
- What the artifact skill's Look section says afterwards, so an agent knows what look doesn't cover.

## Answer

Decided with the owner on 2026-11-08 (grilling session, two rounds, every recommendation accepted). The build is specified in [What `pnpm look` captures](../../look-captures/spec.md).

- **What's shot:** drawings and anything that steps: every `Diagram`, `Figure`, `Stepper` and `Stage`. Both code Stepper forms (one block with `lines`, and Code display's one code block per step) are shot at every step, with the caption printed in place of an `alt`. Plain code blocks (marks or not), tables and questions aren't shot: their source and `pnpm check` cover them.
- **Hidden parts:** look reveals them the way the owner would, then shoots the item alone. It opens a model answer, then closes it after the shot. It locks the question for an explanation (first option, or a submitted number), on throwaway state, and leaves it locked. The rule covers every item kind. The item's line names its question ("inside the model answer of Questão 2") in place of a number, since items inside a question are unnumbered.
- **The item alone:** during each element shot, look hides every layer outside the item whose computed `position` is fixed or sticky (bar, notice band), with no overlap check. Find out what `pnpm look` misses showed the bar overlap is look's own timing artifact.
- **No silent skip, no wrong shot:** selection is broad, by element, and any selected item look can't shoot, or that is still unrendered after its reveal, fails the case (exit 1) with an assertion naming it. There is no separate "not shot" list. The empty-run line becomes "has nothing for look to shoot".
- **Sequencing:** look's whole behaviour lives in one spec. The explanation reveal and the block-per-step Stepper are blocked on Question explanations and Code display.
- **Docs:** the artifact skill's Look section lists what's shot, what isn't and what checks it instead, that a bar in a shot is a look bug, and that content is never moved just to get it shot. `stage.md` › Look gains the reveal line.
- **Out of scope:** dark mode and print in look (the catalog checks both), and running every Stage option (`pnpm check` does).
- No glossary entry: look is tooling. No ADR: cheap to reverse. Tests at seam 1 only, in `tests/check/browser-verification.test.ts`.
