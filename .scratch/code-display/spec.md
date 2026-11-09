# Code display

Source: [Code display](../artifact-generation-gaps/issues/02-code-display.md), on the [Artifact generation gaps](../artifact-generation-gaps/map.md) map. Every decision below was made with the owner on 2026-11-08, and the ticket's `## Answer` records them.

## Problem

Agents writing study artifacts hit four limits in how code shows:

- Line numbers always start at 1, so a stack-machine listing whose addresses start at 0 shows two numbers per line, and in two graph artifacts the line numbers the briefs wrote were dropped and every reference to a line shifted by one.
- A plain code block can't highlight lines.
- A code Stepper can't change the code between steps, so a code-optimisation artifact redrew a rewrite as an SVG figure Stepper, losing real text, highlighting and copying.
- SVG figure text can only be set in the heading face, so that redrawn code wasn't in the code face.

## Behaviour

### Line numbers

- A fence takes a starting number in its info string: ` ```pascal start=0 `. The block's first line shows that number and each line after it counts up by one. Without `start`, numbering starts at 1, as today.
- `start` takes a non-negative integer. Anything else fails the build at the fence.
- There is no way to turn numbers off and no free-form labels (addresses with gaps, hex): no artifact has needed either.

### Every line reference counts the shown number

- A fence's `{…}`, a one-block Stepper's `lines` and a Stage step's `lines` all name a line by the number the page shows. In a block with `start=0`, line 0 is its first line and line 1 its second.
- `{…}` uses the grammar Stepper `lines` already uses: `3`, `3-5`, `3-` (to the end), `1-2, 6`.
- A reference to a line the block doesn't have, counted from its `start`, fails the build, at the fence for `{…}` and as today for the props.

### Highlighted lines in a plain code block

- A fence marks lines with `{…}` in its info string: ` ```ts {3, 5-6} `, combinable with `start`.
- Marked lines look like the lines of one Stepper step: ink, with the line number at the frame's strong weight. Every other line, its line number and comments included, takes the one grey (`DESIGN.md` › The One Grey Rule): not the lines in play.
- In print the highlight shows as on screen, since a plain block has no steps to list.
- `{…}` inside a one-block `<Stepper lines>` or inside a Stage's code block fails the build: both mark the lines themselves, step by step.

### A code Stepper with one block per step

- A Stepper can hold two or more fenced code blocks, one per step, as its children, with blank lines around each. This form takes none of `diagram`, `figure` or `lines`; `captions`, when given, has one caption per block.
- Each block stands alone: its own language, its own `start`, its own line numbers and its own `{…}` marks, which are that step's marked lines. A block without `{…}` shows in full ink.
- The Stepper shows one block at a time, in one frame as tall as the tallest block, as D2 boards already do, so stepping doesn't move the page.
- The Stepper doesn't compare blocks: no insertion, deletion or diff marks. The agent marks the lines that changed, or, before a deletion, marks the line about to go in the step before.
- Screen readers hear each step as a one-block Stepper's: the step number, the marked lines when there are any, and the caption.
- Printed, every block shows under its step number and caption, as D2 boards print. A figure Stepper prints as [Printed Steppers](../printed-steppers/spec.md) says.
- `lines` given with several blocks, or this form with fewer than two blocks, fails the build with a component error naming `Stepper`.

### The code face in SVG figures

- A `font-code` class sets SVG text in the code face (Recursive in mono mode, as `pre` sets it), in a `Figure` and in a figure Stepper. Text without it keeps the heading face.
- It is listed in `COMPONENTS.md` beside the colour classes.

## Naming

Each step's code is "one code block per step" in every doc. Never call it a "version": that word means the artifact's current version. Steppers and code blocks are component vocabulary, so `GLOSSARY.md` gains no entry.

## Failures

Fence-level failures report at the fence, with the `artifact` skill's **Code blocks** section as their skill section, as `code-language` does:

- `start` that isn't a non-negative integer.
- `{…}` naming a line the block doesn't have, counted from `start`.

Component errors name the component:

- `{…}` inside a one-block `<Stepper lines>` or a Stage's code block.
- `lines` with several blocks in a Stepper, or a block-per-step Stepper with fewer than two blocks.

## Documentation

- The `Stepper` doc comments (and so `COMPONENTS.md`, via `pnpm components`): the block-per-step form, its marks, its frame, its print, and when to use it instead of `lines` (the code changes between steps) or a figure Stepper (never for code). The `lines` prop counts the shown number.
- The `Stage` doc comment's **Code** paragraph: `lines` counts the shown number, "from 1" only when there is no `start`, and `{…}` isn't allowed in its block.
- The "Colours in figures" part of `COMPONENTS.md` gains `font-code`, or sits beside a short section on it.
- The `artifact` skill, `.claude/skills/artifact/rules.md` › **Code blocks**: `start`, `{…}` and the failures above. Tell agents to use `start` when the source numbers its lines from something other than 1, and to keep the source's numbers rather than renumbering.
- `.claude/skills/artifact/figures.md` › **Text**: `font-code` for code, identifiers and instructions in a figure.
- `DESIGN.md`: the highlighted plain block under The One Grey Rule, which now covers lines outside a plain block's highlight as well as a Stepper's step.
- The catalog shows a plain block with `start=0`, one with `{…}`, a block-per-step Stepper, and a figure using `font-code`.

## Shared parts

- `rich-content.css` numbers and styles every `pre`, so `start` and `{…}` reach plain blocks, Stepper code and Stage code: check a one-block Stepper and a Stage with code on their catalog pages with the same evidence as the plain block.
- `src/rich-content.ts` reads the fence's info string for the whole site's Markdown.
- `figure-colours.css` reaches `Figure` and figure Steppers: check both with `font-code`.
- `StepControls.astro` and `stepper.ts` reach every Stepper form: check a D2 Stepper and a figure Stepper still step and print.

## Out of scope

- Turning line numbers off, and free-form line labels.
- Diff marks between a block-per-step Stepper's blocks.
- A Stage whose code changes between steps: Stage changes are [Stage controls and drawing](../artifact-generation-gaps/issues/03-stage-controls-and-drawing.md)'s.
- What a figure Stepper prints: [Printed Steppers](../printed-steppers/spec.md).

## Comments

### 2026-11-08: owner decisions at ticketing

Owner, /to-tickets review in the Artifact generation gaps session, 2026-11-08, every recommendation accepted. Each bullet amends this spec or fills a gap in it; the tickets in `issues/` carry the detail.

- **A plain block's highlight stays visual only** (03), since the prose names the lines: screen readers hear the block as they do without `{…}`.
- **`font-code` in `COMPONENTS.md`** (05): the script that generates the colour-class listing is extended to list `font-code`, so `COMPONENTS.md` stays generated.
