# 02: Code display

Type: grilling
Status: resolved

## Question

What should code blocks, code Steppers and code inside figures be able to do that they can't today?

## What the agents reported

- **Line numbers always start at 1.** A stack-machine artifact's program addresses start at 0, so its listing shows two numbers per line, and a sentence explains the difference. In two graph artifacts, the line numbers the briefs wrote were removed and every reference to a line shifted by one.
- **A plain code block can't highlight lines, and a `lines` Stepper can't change the code between steps.** A code-optimisation artifact needed to show the code being rewritten step by step, so it redrew all the code as an SVG Figure Stepper, with an ink bar marking the changed line.
- **The code font can't be used in an SVG figure,** so that redrawn code is set in the heading face.

## To decide

- A starting number for line numbers, or a way to turn them off, or code-provided labels (addresses)?
- Highlighted lines in a static block?
- A code Stepper whose code changes from step to step, versus documenting the SVG workaround.
- A class that sets figure text in the code face.

## Answer

Decided with the owner on 2026-11-08 (grilling session, rounds 1 to 3, every recommendation accepted). The build is specified in [Code display](../../code-display/spec.md).

- **Line numbers:** a fence takes `start=N` (a non-negative integer) in its info string. No way to turn numbers off and no free-form labels: no artifact has needed either.
- **Line references** count the number the page shows, everywhere: a fence's `{…}`, a one-block Stepper's `lines` and a Stage's `lines`. `{…}` uses the Stepper `lines` grammar (`3`, `3-5`, `3-`, `1-2, 6`).
- **Highlighting in a plain block:** `{…}` in the fence's info string. Marked lines look like one Stepper step's (ink, bold number), the rest take the one grey, and the highlight prints as on screen. `{…}` inside a one-block `<Stepper lines>` or a Stage's block fails the build.
- **Code that changes between steps:** a Stepper can hold one fenced code block per step, two or more, with no `diagram`, `figure` or `lines`. Each block keeps its own language, `start` and `{…}` marks; one frame as tall as the tallest; no diffing, so the agent marks what changed; every block prints under its step. The SVG figure Stepper workaround is no longer the advice for code.
- **Code face in figures:** a `font-code` class for SVG text in `Figure` and figure Steppers, listed beside the colour classes.
- **Naming:** "one code block per step", never "version" (which means the artifact's current version). No glossary entry: these are component vocabulary.
- **Failures:** a bad `start` and an out-of-range `{…}` report at the fence under the skill's **Code blocks** section; the Stepper and Stage conflicts are component errors.
- No ADR: every part is cheap to reverse. Consistent with ADR 0001 and 0007: no state and no custom build is involved.
