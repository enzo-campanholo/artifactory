# 02: A fence starts its line numbers at `start=N`

Blocked by: 01
Status: resolved

**What to build:** an agent writes ` ```pascal start=0 ` and the block's first line shows 0, with each line after it counting up by one. Without `start`, numbering starts at 1, as today. Every line reference then counts the number the page shows: in a block with `start=0`, line 0 is its first line. That covers a one-block Stepper's `lines` and a Stage step's `lines`, and ticket 03 adds `{…}`. The Stepper's announced lines ("Line 0.") and printed step list, and the Stage's "Linha L." announcement, all use the shown number. This holds wherever a fence sits: a plain block, a one-block Stepper and a Stage's code block.

`start` takes a non-negative integer. Anything else (`start=-1`, `start=x`, `start=1.5`, a bare `start`) fails the build at the fence, under the `artifact` skill's **Code blocks** section, as `code-language` does: point at the `start` in the fence. Give the failure its own rule ID beside `code-language` (the spec names none) and list it on that section's "Rule" line. A Stepper `lines` entry or Stage step `lines` key outside the block's lines, counted from its `start`, fails as those props fail today. Reword the failures that assume a first line of 1 so they name the block's real range. The Stage's message "it has 4 lines" and the Stepper's "from 1 to N" both assume it.

Out of scope: turning numbers off, and free-form labels (addresses with gaps, hex).

This is design-system work: do it in a local session with impeccable (`design-system/CLAUDE.md`).

- [x] A plain block with `start=0`, one with `start=10` and one without `start` show 0…, 10… and 1… in the built page. Assert this at the `tests/check` built-output seam, extending the code assertion from ticket 01.
- [x] A bad `start` fails at its fence with the new rule ID and the **Code blocks** skill section. Add it to the `tests/check` failure fixtures beside `code-language`.
- [x] A one-block Stepper over a `start=0` block takes `lines={["0", "1-"]}`, and `"4"` on a four-line block fails as a `Stepper` component error naming lines 0 to 3. Its announcement and print name lines by shown number.
- [x] A Stage over a `start=0` block takes a step with `lines: { 0: "reversed" }` and announces "Linha 0.". A key past the last shown line fails as `stage-run`, naming the block's range. Cover both at the `tests/check` Stage-run seam.
- [x] Docs: the `Stepper` doc comment's `lines` prop counts the shown number. The `Stage` doc comment's **Code** paragraph and the `lines` doc on the stage-build `Step` type say `lines` counts the shown number, "from 1" only when there is no `start`. Run `pnpm components`.
- [x] The `artifact` skill's **Code blocks** section documents `start` and its failure. It tells agents to use `start` when the source numbers its lines from something other than 1, and to keep the source's numbers rather than renumbering. This lands in the same commit as the check change.
- [x] The catalog shows a plain block with `start=0`.
- [x] Shared part: `rich-content.css` and the Markdown fence reading reach every code block, so check a one-block Stepper and a Stage with code on their catalog pages, each with a `start` block, with the same evidence as the plain block.

## Comments

### 2026-11-09: where 01 left the shown number

From code display 01's implementation:

- The number lives in one place: the `shownLineNumbers` Shiki transformer in `src/rich-content.ts` writes it as `data-line` on each `span.line`. Its `line(node, line)` hook gets the line's position from 1; `this.options.meta` holds the fence's info string after the language, so reading `start` there and adding `start - 1` is the whole numbering change. Satteri hands `meta` to Shiki for `.md` and `.mdx` alike.
- The gutter (`rich-content.css`, `content: attr(data-line)`), the one-block Stepper (`steppedCode` in `stepper.ts` reads the `data-line` it matches; the element's announcement reads `line.dataset.line`) and the Stage (`writtenContent` in `step-applier.ts` gives `codeLineNumbers`, the shown numbers per block; the element paints marks by them) need no change for `start`.
- The Stepper already parses `lines` against the block's first and last shown numbers, so its range check follows `start` by itself. Its message comes from `numberList` in `design-system/src/number-lists.ts`, `must list numbers from ${first} to ${last}, …`, which already names the real range. The examples in it (`"2", "2-4", "2-" or "1-2, 5"`) stay fixed text: decide whether they should follow `first`.
- The Stage's check accepts a `lines` key only when it is exactly one of the block's shown numbers as text (so `"01"` stays refused). Its message still says "it has N lines": that is the wording to change to name the range.
- `codeLine` in `stepper.ts` matches `<span class="line…" data-line="N"`, the order Shiki writes. A transformer that adds attributes before `data-line` would need it widened.

### 2026-11-09: resolved

**Result.** A fence takes `start=N` after its language, and its first line shows N; without it, lines count from 1. Every line reference counts the shown number: a one-block Stepper's `lines` and a Stage step's `lines` take `0` as a `start=0` block's first line, and the Stepper's announcement ("Line 0."), its printed list ("1 (lines 0–1): …") and the Stage's "Line 0." follow. A `start` that isn't a whole number from 0 fails at the fence as `code-start`, under **Code blocks**. The Stage's line refusal now names the range ("it has lines 0 to 3", "it has only line 1"), and the Stepper's ("must list numbers from 0 to 3, such as "1", "1-3", "1-" or "0-1, 4"") gives examples counted from the block's first number.

**How the number gets there.** Code display 01's Shiki transformer can't see `start`: with `features.rawHtml` on, as math needs, Satteri drops the code element's `data` (the info string included) before the highlight plugin, so `this.options.meta` is always undefined. The `code` visitor in `src/rich-content.ts` now keeps each fence's code and first number in the document's `ctx.data`, and the `shownLineNumbers` hast plugin, which runs after highlighting, finds each block's entry by its code and writes `data-line` on its lines. It replaces the transformer, so the number still lives in one place, and the gutter, Stepper and Stage read it unchanged.

**Commits.** 8d009fc (claim), d579b7a (implementation, tests, docs and catalog), and this one.

**Validation.**

- Test-first at `tests/check`: the built-output case now checks `start=0`, `start=10` and no `start` (0…, 10…, 1…), and a new case checks a one-block Stepper over a `start=0` block with `lines={["0", "1-"]}`: each line's steps and the printed list "1 (linha 0)", "2 (linhas 1–3)". Both failed first (the Stepper refused `"0"`, and every block counted from 1), then passed.
- The Stage-run seam sees which `lines` keys a step may take, not what the page announces, so the announcement is checked in the browser (below): the catalog is English, and "Linha L." is the pt-BR text of the same `line` call, fed the same shown number.
- Failure fixtures: `start=-1`, `start=x`, `start=1.5`, a bare `start` and `start=01` each fail at the `start` in the fence as `code-start`; a new fixture repo fails `lines={["0", "4"]}` on a four-line `start=0` block as a `Stepper` component error naming 0 to 3; a Stage over a `start=0` block takes `lines: { 0: "reversed" }` and fails `4` as `stage-run` with "it has lines 0 to 3". The existing Stage cases' "it has 4 lines" and "it has 1 line" are reworded.
- `valid-artifacts`, `artifact-failures` and `artifact-checks`: 83 tests pass. Full `pnpm check` at the merged HEAD, in the final report.

**Shared parts reached and checked.** `rich-content.css` and the fence reading reach every code block. I built this branch and its base (8d009fc) and captured both catalogs in Chrome with code display 01's script: plain blocks, every Stepper and every Stage with code on `/catalog/` and `/catalog/stage/`, on screen and in print, light and dark, at 1280 px and 393 px, four steps each.

- New items: the plain `start=0` block shows 0 to 3; the `start=0` code Stepper lights 0–1, then 2, then 3, announces "Step 2 of 3. Line 2. …" and prints "1 (lines 0–1): …"; the `start=0` Stage reverses line 0 at step 1, announced "Step 1 of 4. Line 0. …".
- Existing items: all 116 text records (announcements, lit lines, printed lists, marks) are identical to the base's. 62 of the 116 shots are byte-identical. The rest are the factorial Stage, whose figure number moved from 6.1 to 7.1 because a new Stage comes before it, and Steppers below the new plain block, which look identical side by side and differ only in where they sit on the page.
- The sample's page differs from the base only in the Stage script's hash and so its content hash; its code lines are byte-identical.

**Decisions.**

- The rule ID is `code-start`, beside `code-language`.
- `start` must be written as a plain whole number: `start=01` is refused, as a Stage `lines` key `"01"` is, and so is one past `Number.MAX_SAFE_INTEGER`.
- The Stepper's refusal examples count from the block's first number, so they read as before for a block numbered from 1, and name lines the block has under `start=0`.
- The Stage refusal names the range by its first and last shown numbers, "lines 0 to 3", or "only line N" for a one-line block.
- The catalog's `start=0` examples are a four-instruction stack listing, in `text`, as the spec's motivating case is; the Stage gets its own section and build (`sum-listing.build.ts`) rather than renumbering an existing one.
- The gutter stays 2.4em (`DESIGN.md`): three digits sit with a gap, and a fourth fills it. No artifact has needed a `start` past 999, so the world doesn't change.

**Left undone.** Nothing in scope. Notes for code display 03 (where to read `{…}` now that Shiki never sees the info string) and machine trace 01 are on their tickets.
