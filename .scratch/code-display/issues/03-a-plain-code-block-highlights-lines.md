# 03: A plain code block highlights lines with `{…}`

Blocked by: 01, 02
Status: resolved

**What to build:** an agent writes ` ```ts {3, 5-6} ` and the block marks lines 3, 5 and 6. The fence can combine this with `start` (` ```pascal start=0 {0-2} `). `{…}` uses the Stepper `lines` grammar (`3`, `3-5`, `3-` to the end, `1-2, 6`) and counts the number the page shows, from the block's `start`. Marked lines look like the lines of one Stepper step: ink, with the line number at the frame's strong weight. Every other line, its line number and comments included, takes the one grey. The highlight shows the same in print, since a plain block has no steps to list, and stays readable in forced colours, as the Stepper step does. A fence without `{…}` shows in full ink, as today. The highlight is visual only: screen readers hear the block as they do without it, since the prose names the lines.

A `{…}` that names a line the block doesn't have fails the build at the fence, under the **Code blocks** skill section. So does one the grammar refuses. The spec names no rule ID, so give it one beside `code-language` and list it on that section's "Rule" line. Use the shared grammar from ticket 01.

`{…}` inside a one-block `<Stepper lines>` or a Stage's code block fails as a component error naming `Stepper` or `Stage`: both mark their lines themselves, step by step. Ticket 04 gives `{…}` its meaning inside a Stepper with one code block per step, so a Stepper holding several blocks isn't this ticket's case.

This is design-system work: do it in a local session with impeccable (`design-system/CLAUDE.md`). The marked-line look is the Stepper step's look, which today lives in the Stepper's own styles, so share one definition rather than copying it.

- [x] In the built page, a plain block with `{3, 5-6}` marks exactly lines 3, 5 and 6, and one with `start=0 {0}` marks its first line. Assert this at the `tests/check` built-output seam.
- [x] Marked lines are ink with strong-weight numbers, the rest are the one grey, comments and numbers included, on screen, in print and in forced colours. Check on the catalog in both themes and print.
- [x] The highlight is visual only: the block's accessible text and announcements are the same with and without `{…}`.
- [x] `{…}` naming a line past the block's end, or before its `start`, fails at the fence with its rule ID and the **Code blocks** section. So does a list the grammar refuses. Add both to the `tests/check` failure fixtures.
- [x] `{…}` in a one-block `<Stepper lines>` and in a Stage's block each fail as a component error naming the component, at the `tests/check` seam.
- [x] `DESIGN.md`: The One Grey Rule covers lines outside a plain block's highlight as well as a Stepper's step, and the Code block entry under "Code, math and figures" mentions the highlight. Keep `.impeccable/design.json` in step if the world changes.
- [x] The `artifact` skill's **Code blocks** section documents `{…}`, its grammar, that it counts the shown number, that it is visual only so the prose names the marked lines, its failures, and that a one-block Stepper and a Stage refuse it. This lands in the same commit as the check change. The `Stage` doc comment's **Code** paragraph says `{…}` isn't allowed in its block, and the `Stepper` doc comment says the same for `lines`. Run `pnpm components`.
- [x] The catalog shows a plain block with `{…}`.
- [x] Shared part: the look reaches every `pre` through `rich-content.css`, so check the one-block code Stepper's catalog page (still greying by step, not by fence) and a Stage with code (unmarked, its own marks intact), with the same evidence as the plain block.

### 2026-11-09: where 02 left the fence's info string

From code display 02's implementation:

- **Shiki never sees the info string.** Code display 01's note says Satteri hands `meta` to Shiki; it doesn't in this site. With `features.rawHtml` on (math needs it), Satteri drops the code element's `data`, `meta` included, on the way to the highlight plugin, so `this.options.meta` is undefined in every Shiki transformer. Read `{…}` where 02 reads `start`: in the `code` visitor of `mathAndCode` in `src/rich-content.ts`, from `node.meta`.
- **How 02 carries it past highlighting.** The `code` visitor pushes `{ code, first }` for every fence onto `ctx.data.fenceStarts` (typed by a `DataMap` augmentation of `satteri`), in document order. The `shownLineNumbers` hast plugin runs after Shiki, finds each `pre`'s entry by its code text (`ctx.textContent`), and writes `data-line` on each `span.line` with `ctx.setProperty`. Extend that entry with the marked lines, and mark them in the same pass, rather than adding a second lookup. Shiki writes the line class as `properties.class` ("line"), not `className`.
- `fenceStart` in `src/rich-content.ts` finds `start` in the info string by a whitespace-bounded token, so a `{…}` beside it doesn't disturb it. Its failures report at the fence through the `atFence` helper in the same visitor, which takes the rule ID, the written text and where on the fence line to look for it: reuse it for `{…}`'s rule.
- The grammar's refusal examples now count from the block's first number (`numberList` in `design-system/src/number-lists.ts`): under `start=0` they read `"1", "1-3", "1-" or "0-1, 4"`; from 1 they read as before.
- The catalog has a `start=0` plain block on `/catalog/`, a `start=0` one-block Stepper after the first code Stepper, and a `start=0` Stage ("Code numbered from 0") on `/catalog/stage/`, for the shared-part checks.

### 2026-11-09: resolved

**Result.** A fence marks lines with `{…}` after its language, beside any `start`: ` ```ts {3, 5-6} `, ` ```text start=0 {0} `. It takes the Stepper `lines` grammar through `numberList` and counts the shown number from `start`. The marked lines keep their ink and their numbers turn ink at the frame's strong weight. Every other line takes the one grey, comments and numbers included, on screen and in print, and GrayText in forced colours. A fence without `{…}` builds exactly as before. A list naming a line the block doesn't have, counted from `start`, or one the grammar refuses, fails at the fence as `code-marks` under **Code blocks**. `{…}` in a one-block `<Stepper lines>` or a Stage's code block fails as that component's `build` error.

**How.**

- The `code` visitor in `src/rich-content.ts` reads `{…}` from `node.meta` and keeps `{ code, first, marked }` per fence in `ctx.data.fences` (02's `fenceStarts`, extended). The hast plugin, now `shownLines`, writes `data-marks` on the block's `pre` and `data-off` on each line it doesn't mark, in the same pass that writes `data-line`.
- **One look.** The marked-line look lived in the Stepper's own styles. It now lives once, in `rich-content.css`, for `pre[data-marks] > code > .line`: `[data-off]` lines grey and the others' numbers are ink at 700. Every code line maps Shiki's token variables through `--code-line-colour`, so a single declaration greys a whole line.
- The one-block Stepper opts in: `steppedCode` adds `data-marks` to its `pre`, and the element's `data-off` toggling does the rest. Its print block resets `.stepper-code .line` to a block with no marks, since its steps are listed under the code.
- The Stage now renders its slot in the frontmatter (`Astro.slots.render`), so it can refuse a `pre[data-marks]` in its problems list.

**Commits.** a142d9b (claim), 53a3c65 (implementation, tests, docs, catalog, and the note on 04), and this one.

**Validation.**

- Test-first at `tests/check`. Each of these failed before the change and passes after it:
  - Built output: a plain block with `{3, 5-6}` leaves exactly lines 3, 5 and 6 without `data-off`, and one with `start=0 {0}` only line 0. The fixture's other blocks have no `data-marks` and no greyed line.
  - Visual only: the marked block's `outerHTML`, with `data-marks` and its four `data-off` removed, equals the same code's block without `{…}`. Its text, roles and every other attribute are the same, so what is heard is unchanged.
  - Failure fixtures: `{5}` on a four-line block, `start=5 {4}` (before the start) and `{3, a}` (refused by the grammar) each fail at the `{` in the fence as `code-marks`. The refusal names the block's range: "must list numbers from 5 to 8, such as …".
  - Component errors: a one-block `<Stepper lines>` and a Stage, each over a fence with `{1}`, fail as `Stepper: …` and `Stage: …` component errors at the component.
- Full `pnpm check` at the merged HEAD, in the final report.

**Shared parts reached and checked.**

- `rich-content.css` reaches every `pre`, and the fence reading reaches the whole site's Markdown.
- I built the integration tip (452d393) and this branch and captured `/catalog/` and `/catalog/stage/` in Chrome, with a script that records each code line's number, `data-off`, computed text colour, number colour and number weight:
  - every plain block, every code Stepper (stepped three times) and every Stage with code (started on its first option, stepped three times)
  - on screen and in print, light and dark, at 1280 and 393 px
- Text records:
  - 152 records are identical to the base's, covering every Stage step (their marks intact) and the `ts` code Stepper's steps (greying by step, numbers 700 on the step's lines, announcements unchanged).
  - The new marked block is new.
  - The `start=0` `text` code Stepper's records differ, as intended (see Decisions).
- Shots: the PNGs that differ belong to blocks below the new catalog block. Side by side they look the same and are a pixel taller or shorter from their new sub-pixel position.
- New block, as seen: lines 2, 4 and 5 are in ink with numbers at 700, and the rest are grey, comments and numbers included, in light, dark and print. The printed Stepper is all ink with grey numbers, as before.
- Forced colours: Puppeteer's emulation took only on a fresh page, so I checked it with a separate probe. Lines out of play in the marked block and in both code Steppers paint GrayText (`forced-color-adjust: none`), and the other lines paint CanvasText.

**Decisions.**

- The rule ID is `code-marks`, beside `code-language` and `code-start`. Its message is the grammar's refusal, "`{5}` must list numbers from 1 to 4, such as …", the same wording as a Stepper's `lines` failure.
- The marks are `data-marks` on the `pre` and `data-off` on lines out of play, the attribute the Stepper already toggled. The shared rule then reads one attribute pair for both forms.
- The look is shared through `--code-line-colour` rather than by listing Shiki's ten variables twice. That makes the Stepper's print reset and the forced-colours switch one declaration each. Stage keeps its own `--stage-code` rules. Stage text input 02 changes Stage code in parallel, so I didn't move Stage onto the new variable.
- Lines out of play also set `color`, not just the token variables. The `text` language's spans have no colour of their own and inherited the `pre`'s ink, so the catalog's `start=0` code Stepper had greyed numbers beside ink text on every step, on the base too. Its off lines now grey whole, as `DESIGN.md` says.
- In forced colours, lines out of play paint GrayText, as a Stage's `muted` line does, for plain blocks and the code Stepper alike. Before, the Stepper's step showed only by its numbers' weight. `DESIGN.md` › Stepper is updated to match.
- The Stage renders its slot in the frontmatter to see its code block, as the Stepper already does. The HTML it writes is unchanged: all Stage records match the base's.
- Impeccable's interview probe was skipped: the owner's 2026-11-09 comment on the spec authorizes autonomous decisions.

**Left undone.** Nothing in scope. A note for code display 04 records where the marks live, the Stepper's print reset scoped to `.stepper-code`, and the announcement of a block with no marks.
