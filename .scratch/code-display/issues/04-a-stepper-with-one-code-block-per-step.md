# 04: A Stepper with one code block per step

Blocked by: 02, 03
Status: resolved

**What to build:** an agent shows code being rewritten step by step. It writes a `Stepper` whose children are two or more fenced code blocks, one code block per step, with blank lines around each. It gives none of `diagram`, `figure` or `lines`. `captions`, when given, has one caption per block. Each block stands alone: its own language, its own `start`, its own line numbers and its own `{…}` marks, which are that step's marked lines, greyed as a plain block greys them (ticket 03). A block without `{…}` shows in full ink.

The Stepper shows one block at a time, in one frame as tall as the tallest block, as D2 boards share one frame, so stepping doesn't move the page. It doesn't compare blocks: no insertion, deletion or diff marks. Screen readers hear each step as they hear a one-block Stepper's step: the step number, the marked lines when the block has any (by shown number), and the caption. Printed, every block shows under its step number and caption, as D2 boards print.

Failures, each a component error naming `Stepper`: `lines` given with several blocks, and this form with fewer than two blocks. The existing "give it exactly one of `diagram`, `figure` or `lines`" refusal must now let this form through and still refuse the mixes. The decision: in every doc, call each step's code "one code block per step", never a "version", which means the artifact's current version.

This is design-system work: do it in a local session with impeccable (`design-system/CLAUDE.md`). The [printed-steppers](../../printed-steppers/spec.md) spec edits the same Stepper print block and `stepper.ts` for figure Steppers. It isn't a blocker: whichever lands second rebases onto the first.

- [x] A Stepper with three fenced blocks steps through them one at a time. A block with `start=0` shows 0…, and a block with `{2}` greys every line but 2 while one without `{…}` shows in full ink. In the built page each block sits in its own step, with its own numbers and marks. Assert this at the `tests/check` built-output seam.
- [x] The frame holds the tallest block's height on every step: the content below doesn't move when stepping on the catalog page at 393 px and on a wide screen.
- [x] Screen readers hear "Step 2 of 3. Line 2. caption" for a step with a marked line, and the step number and caption alone for a step without marks, in both languages. Check this on the catalog.
- [x] Print shows every block under "N." and its caption, each whole on its page, with its own marks as on screen. Check a print capture.
- [x] `lines` with several blocks, a single block, and a mix with `diagram` or `figure` each fail as a `Stepper` component error at the `tests/check` seam.
- [x] The `Stepper` doc comment covers the form, its marks, its frame and its print. It says when to use it instead of `lines` (the code changes between steps) or a figure Stepper (never for code), with an example. Run `pnpm components`. `DESIGN.md` › Stepper describes the form's frame and print.
- [x] The `artifact` skill points agents who are showing code that changes between steps to this form, not a figure Stepper.
- [x] The catalog shows a Stepper with one code block per step, with one block using `start` and the steps marking what changed.
- [x] Shared parts: `StepControls.astro` and `stepper.ts` reach every Stepper form, and `rich-content.css` reaches every `pre`. On their catalog pages, check that a D2 Stepper, a figure Stepper and the one-block code Stepper still step, announce and print, with the same evidence as the new form.

## Comments

### 2026-11-09: where 03 left a block's marks

From code display 03's implementation:

- **What a marked block looks like in the built HTML.** A fence with `{…}` builds as `<pre data-marks …>`, with `data-off` on each `span.line` it doesn't mark; marked lines carry nothing extra. A fence without `{…}` has neither. Both are written by the `shownLines` hast plugin in `src/rich-content.ts`, which keeps `{ code, first, marked }` per fence in `ctx.data.fences`.
- **The look is one rule.** `rich-content.css` greys `pre[data-marks] > code > .line[data-off]` (through `--code-line-colour`, which every line maps Shiki's token variables through, so one declaration greys a whole line) and sets the other lines' numbers in ink at the frame's strong weight, with GrayText in forced colours. It applies in every medium, so a block-per-step Stepper's blocks print with their marks unless the Stepper's print says otherwise.
- **The one-block Stepper opts into the same rule.** `steppedCode` in `stepper.ts` adds `data-marks` to its `pre`, and the element's `data-off` toggling does the rest. Its print block resets `.stepper-code .line` (`--code-line-colour: initial` and the number back to grey at normal weight), because its steps are listed under the code. That reset is scoped to `.stepper-code`: if the new form's blocks sit inside `.stepper-code` too, scope the reset to the one-block form, or the blocks lose their marks in print.
- **The refusal.** `steppedCode` refuses a `pre[data-marks]` (a fence with `{…}`) with "its code block marks lines with `{…}`, but a one-block Stepper marks them itself, step by step, with `lines`". It runs only for the `lines` form, after the one-block count check, so the block-per-step form must branch before it.
- **Announcements.** The element reads the lit lines from `.stepper-code .line` without `data-off`. For a step whose block has no `{…}`, no line is `data-off`, so reading it unchanged would announce every line: the ticket wants the step number and caption alone there, so check `pre[data-marks]` first.
- The Stage refuses `{…}` the same way, in `Stage.astro`'s problems list.

### 2026-11-09: resolved

**Result.** A `Stepper` with none of `diagram`, `figure` or `lines` and two or more fenced code blocks inside steps through them, one block per step. `steppedBlocks` (`stepper.ts`) takes each rendered `pre` as written, so every block keeps its own language, `start`, numbers and `{…}` marks (`data-marks`/`data-off` from code display 03). `Stepper.astro` renders them in `.stepper-stage.stepper-blocks`, each in a `div[data-in-steps]` with a print-only `p.stepper-step` heading ("N." and the caption), the markup D2 boards use. Every block shares one grid cell, the ones off their step `visibility: hidden`, and each `pre` stretches to the cell, so the frame is the tallest block's height and its rules don't move. Print stacks the blocks under their headings, each `break-inside: avoid`, with their marks (the one-block print reset stays scoped to `.stepper-code`). The element reads the shown block's lit lines only when it has `data-marks`, and announces nothing about lines otherwise. Failures: several blocks with `lines`, fewer than two blocks without a source, and a `diagram` or `figure` with children each fail as `Stepper: …`; two sources at once still fail.

**Commits.** `43e2dc4` (claim), `65ff9cb` (the form, tests, docs, catalog, notes), this closing commit.

**Validation.**
- `tests/check/valid-artifacts.test.ts` › "puts each of a Stepper's code blocks in its own step, …": three blocks (`start=0`, `{2}`, unmarked) in their own steps with their own numbers and marks and their "N. caption" headings, and no `.stepper-code`. Red before the change (the build refused the form), green after.
- `tests/check/artifact-failures.test.ts` › "a Stepper with …" (four fixture repos): `lines` with two blocks, one block and no source, a `diagram` with blocks, a `figure` with blocks. The "60 failures" total is unchanged: the new cases are separate repos.
- Catalog, built and driven in Chrome (`/catalog/` and `?lang=pt-BR`, 1280 and 393, light and dark, every step and back): the new Stepper's height, the content below it and the page height are the same at every step; it announces "Step 2 of 3. Line 2. The loop is replaced by Gauss's formula." / "Passo 2 de 3. Linha 2. …", "Step 3 of 3. The formula, compiled for the stack machine." for the unmarked block, and "Step 1 of 3. Lines 3 to 5. …" stepping back. Print capture and an A4 PDF: each block whole under "N." and its caption, marks as on screen.
- Shared parts (`StepControls.astro`, `stepper.ts`, `rich-content.css` through the `pre`): the same capture on a baseline build of the integration branch (`070e1f1`) and on this one gave byte-identical PNGs for the D2, figure and both one-block Steppers at every step, light and dark, 1280 and 393, en and pt-BR, and print (120 shots), and identical announcements. `rich-content.css` itself is unchanged.

**Decisions.**
- The form's mark is `.stepper-blocks`, never `.stepper-code`, so `pnpm look` doesn't resolve it as a one-block Stepper and the one-block print reset doesn't reach it.
- The frame is CSS alone (one grid cell, each `pre` stretched), not measured like D2 boards: blocks are text, and the cell already takes the tallest.
- On step, the old block leaves at once and the new one fades in over 0.2s (under `prefers-reduced-motion: no-preference`), since two code blocks cross-fading overlap their text.
- The new member of `Props` is `Captioned` itself (lint refuses an empty interface extending it). `scripts/component-reference.ts` now labels a variant with no props of its own "With none of `diagram`, `figure` or `lines`:" and joins three or more names with commas.
- The messages say what to write: "`lines` steps through one code block, but it has 2: keep one block, or take `lines` off to show one code block per step"; "it has 1 code block and none of `diagram`, `figure` or `lines`: give it one fenced code block per step, at least two, or `lines` to step through one block"; "a `diagram` Stepper holds nothing inside it: …". Anything outside the blocks inside the Stepper is dropped, as the spec allows only blocks there.
- The artifact skill's rules.md › **Code blocks** gains the form (when to use it over `lines` and over a figure Stepper, and its failures), and › **Steppers** points code that changes to it.

**Shared parts reached.** `stepper.ts` (`steppedCode` gains the several-blocks refusal) and the element's script reach every Stepper form, checked as above. `StepControls.astro` and `rich-content.css` unchanged.

**Notes left.** [Look captures 07](../../look-captures/issues/07-shoot-block-per-step-code-steppers.md) (the markup and its mark), [Printed steppers 01](../../printed-steppers/issues/01-print-every-step-of-a-figure-whose-parts-leave.md) (the print block it shares).

**Left undone.** Nothing in scope. Physical screen readers weren't used: the announcement text was read from the live region.
