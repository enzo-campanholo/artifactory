# 02: A fence starts its line numbers at `start=N`

Blocked by: 01
Status: ready-for-agent

**What to build:** an agent writes ` ```pascal start=0 ` and the block's first line shows 0, with each line after it counting up by one. Without `start`, numbering starts at 1, as today. Every line reference then counts the number the page shows: in a block with `start=0`, line 0 is its first line. That covers a one-block Stepper's `lines` and a Stage step's `lines`, and ticket 03 adds `{…}`. The Stepper's announced lines ("Line 0.") and printed step list, and the Stage's "Linha L." announcement, all use the shown number. This holds wherever a fence sits: a plain block, a one-block Stepper and a Stage's code block.

`start` takes a non-negative integer. Anything else (`start=-1`, `start=x`, `start=1.5`, a bare `start`) fails the build at the fence, under the `artifact` skill's **Code blocks** section, as `code-language` does: point at the `start` in the fence. Give the failure its own rule ID beside `code-language` (the spec names none) and list it on that section's "Rule" line. A Stepper `lines` entry or Stage step `lines` key outside the block's lines, counted from its `start`, fails as those props fail today. Reword the failures that assume a first line of 1 so they name the block's real range. The Stage's message "it has 4 lines" and the Stepper's "from 1 to N" both assume it.

Out of scope: turning numbers off, and free-form labels (addresses with gaps, hex).

This is design-system work: do it in a local session with impeccable (`design-system/CLAUDE.md`).

- [ ] A plain block with `start=0`, one with `start=10` and one without `start` show 0…, 10… and 1… in the built page. Assert this at the `tests/check` built-output seam, extending the code assertion from ticket 01.
- [ ] A bad `start` fails at its fence with the new rule ID and the **Code blocks** skill section. Add it to the `tests/check` failure fixtures beside `code-language`.
- [ ] A one-block Stepper over a `start=0` block takes `lines={["0", "1-"]}`, and `"4"` on a four-line block fails as a `Stepper` component error naming lines 0 to 3. Its announcement and print name lines by shown number.
- [ ] A Stage over a `start=0` block takes a step with `lines: { 0: "reversed" }` and announces "Linha 0.". A key past the last shown line fails as `stage-run`, naming the block's range. Cover both at the `tests/check` Stage-run seam.
- [ ] Docs: the `Stepper` doc comment's `lines` prop counts the shown number. The `Stage` doc comment's **Code** paragraph and the `lines` doc on the stage-build `Step` type say `lines` counts the shown number, "from 1" only when there is no `start`. Run `pnpm components`.
- [ ] The `artifact` skill's **Code blocks** section documents `start` and its failure. It tells agents to use `start` when the source numbers its lines from something other than 1, and to keep the source's numbers rather than renumbering. This lands in the same commit as the check change.
- [ ] The catalog shows a plain block with `start=0`.
- [ ] Shared part: `rich-content.css` and the Markdown fence reading reach every code block, so check a one-block Stepper and a Stage with code on their catalog pages, each with a `start` block, with the same evidence as the plain block.
