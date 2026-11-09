# 03: A plain code block highlights lines with `{…}`

Blocked by: 01, 02
Status: claimed

**What to build:** an agent writes ` ```ts {3, 5-6} ` and the block marks lines 3, 5 and 6. The fence can combine this with `start` (` ```pascal start=0 {0-2} `). `{…}` uses the Stepper `lines` grammar (`3`, `3-5`, `3-` to the end, `1-2, 6`) and counts the number the page shows, from the block's `start`. Marked lines look like the lines of one Stepper step: ink, with the line number at the frame's strong weight. Every other line, its line number and comments included, takes the one grey. The highlight shows the same in print, since a plain block has no steps to list, and stays readable in forced colours, as the Stepper step does. A fence without `{…}` shows in full ink, as today. The highlight is visual only: screen readers hear the block as they do without it, since the prose names the lines.

A `{…}` that names a line the block doesn't have fails the build at the fence, under the **Code blocks** skill section. So does one the grammar refuses. The spec names no rule ID, so give it one beside `code-language` and list it on that section's "Rule" line. Use the shared grammar from ticket 01.

`{…}` inside a one-block `<Stepper lines>` or a Stage's code block fails as a component error naming `Stepper` or `Stage`: both mark their lines themselves, step by step. Ticket 04 gives `{…}` its meaning inside a Stepper with one code block per step, so a Stepper holding several blocks isn't this ticket's case.

This is design-system work: do it in a local session with impeccable (`design-system/CLAUDE.md`). The marked-line look is the Stepper step's look, which today lives in the Stepper's own styles, so share one definition rather than copying it.

- [ ] In the built page, a plain block with `{3, 5-6}` marks exactly lines 3, 5 and 6, and one with `start=0 {0}` marks its first line. Assert this at the `tests/check` built-output seam.
- [ ] Marked lines are ink with strong-weight numbers, the rest are the one grey, comments and numbers included, on screen, in print and in forced colours. Check on the catalog in both themes and print.
- [ ] The highlight is visual only: the block's accessible text and announcements are the same with and without `{…}`.
- [ ] `{…}` naming a line past the block's end, or before its `start`, fails at the fence with its rule ID and the **Code blocks** section. So does a list the grammar refuses. Add both to the `tests/check` failure fixtures.
- [ ] `{…}` in a one-block `<Stepper lines>` and in a Stage's block each fail as a component error naming the component, at the `tests/check` seam.
- [ ] `DESIGN.md`: The One Grey Rule covers lines outside a plain block's highlight as well as a Stepper's step, and the Code block entry under "Code, math and figures" mentions the highlight. Keep `.impeccable/design.json` in step if the world changes.
- [ ] The `artifact` skill's **Code blocks** section documents `{…}`, its grammar, that it counts the shown number, that it is visual only so the prose names the marked lines, its failures, and that a one-block Stepper and a Stage refuse it. This lands in the same commit as the check change. The `Stage` doc comment's **Code** paragraph says `{…}` isn't allowed in its block, and the `Stepper` doc comment says the same for `lines`. Run `pnpm components`.
- [ ] The catalog shows a plain block with `{…}`.
- [ ] Shared part: the look reaches every `pre` through `rich-content.css`, so check the one-block code Stepper's catalog page (still greying by step, not by fence) and a Stage with code (unmarked, its own marks intact), with the same evidence as the plain block.

### 2026-11-09: where 02 left the fence's info string

From code display 02's implementation:

- **Shiki never sees the info string.** Code display 01's note says Satteri hands `meta` to Shiki; it doesn't in this site. With `features.rawHtml` on (math needs it), Satteri drops the code element's `data`, `meta` included, on the way to the highlight plugin, so `this.options.meta` is undefined in every Shiki transformer. Read `{…}` where 02 reads `start`: in the `code` visitor of `mathAndCode` in `src/rich-content.ts`, from `node.meta`.
- **How 02 carries it past highlighting.** The `code` visitor pushes `{ code, first }` for every fence onto `ctx.data.fenceStarts` (typed by a `DataMap` augmentation of `satteri`), in document order. The `shownLineNumbers` hast plugin runs after Shiki, finds each `pre`'s entry by its code text (`ctx.textContent`), and writes `data-line` on each `span.line` with `ctx.setProperty`. Extend that entry with the marked lines, and mark them in the same pass, rather than adding a second lookup. Shiki writes the line class as `properties.class` ("line"), not `className`.
- `fenceStart` in `src/rich-content.ts` finds `start` in the info string by a whitespace-bounded token, so a `{…}` beside it doesn't disturb it. Its failures report at the fence through the `atFence` helper in the same visitor, which takes the rule ID, the written text and where on the fence line to look for it: reuse it for `{…}`'s rule.
- The grammar's refusal examples now count from the block's first number (`numberList` in `design-system/src/number-lists.ts`): under `start=0` they read `"1", "1-3", "1-" or "0-1, 4"`; from 1 they read as before.
- The catalog has a `start=0` plain block on `/catalog/`, a `start=0` one-block Stepper after the first code Stepper, and a `start=0` Stage ("Code numbered from 0") on `/catalog/stage/`, for the shared-part checks.
