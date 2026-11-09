# 01: One source for a code line's shown number

Blocked by: None (can start immediately)
Status: resolved

Prefactor for [Code display](../spec.md). No behaviour changes: every page looks, steps, announces and prints as it does today.

**What to build:** today four places each count a code block's lines from 1 on their own: the gutter's CSS counter in `rich-content.css`, the one-block Stepper's check of `lines` and its announced and printed lines, and the Stage's check of a step's `lines` and the marks it applies (by position plus one). `start=N` would have to be taught to all four. Make the number the page shows for each line live in one place that the gutter, the Stepper and the Stage all read, so that ticket 02 changes only where numbering begins. The [machine-trace](../../machine-trace/spec.md) spec also reads "code lines by the number the page shows", and this gives it that number.

In the same pass, make the Stepper's line-list grammar (`3`, `3-5`, `3-`, `1-2, 6`) a parse against a block's own first and last line number that hands back the refused list's reason, rather than one that throws a `Stepper` component error and assumes the first line is 1. The Stepper keeps reporting its own component errors from that reason, with the same wording. Ticket 03 then reuses the same grammar for a fence's `{…}`, reported at the fence. The figure Stepper's `data-step` lists use the same grammar, so they must keep working unchanged. Put the grammar where the site's Markdown processing can import it from the design system, as it already imports other design-system modules.

This is design-system work: do it in a local session with impeccable (`design-system/CLAUDE.md`).

- [x] Each rendered code line, in a plain block, a one-block Stepper and a Stage, carries the number the page shows for it, and the gutter shows that number.
- [x] The one-block Stepper's check of `lines`, its announced lines ("Lines 2 to 3.") and its printed step list ("2 (lines 2–3): caption") take line numbers from that source, not from a line's position.
- [x] The Stage's check of a step's `lines` and the marks it applies take line numbers from that source, and its failures keep their wording.
- [x] The line-list grammar takes a first and last number and returns the refusal reason, and Stepper `lines` and `data-step` failures read as they do today.
- [x] Existing `tests/check` cases for code rendering, Stepper failures and Stage `stage-run` line failures pass unchanged. Extend the built-output code assertion so it checks each line's shown number (1 to n) in the page. Ticket 02 extends this assertion.
- [x] Shared part: `rich-content.css` reaches plain blocks, Stepper code and Stage code, and `stepper.ts` reaches every Stepper form. On their catalog pages, check a plain block, the one-block code Stepper, a Stage with code, a D2 Stepper and a figure Stepper on screen and in print, and record that nothing changed.

## Comments

### 2026-11-09: resolved

**Result.** Each code line's shown number now lives in one place: the `shownLineNumbers` Shiki transformer in `src/rich-content.ts` writes it as `data-line` on every `span.line`, for `.md` and `.mdx` alike. Everything else reads it:

- the gutter (`design-system/src/rich-content.css`: `content: attr(data-line)` replaces the `code-line` counter)
- the one-block Stepper: `steppedCode` in `stepper.ts` checks `lines` and builds the printed list from the numbers it matches, and the element's announced lines read `line.dataset.line`
- the Stage: `writtenContent` in `step-applier.ts` gives `codeLineNumbers`, the shown numbers per block, which the step check validates `lines` keys against, and the element paints marks by them

The line-list grammar is `numberList(list, first, last)` in `design-system/src/number-lists.ts`, exported as `@artifactory/design-system/number-lists` for ticket 03's fence `{…}`. It returns `{ numbers }` or `{ refused }`, and the Stepper wraps the reason in its own component error with the old wording.

**Commits.** f4da272 (claim), a06d669 (implementation and test), acfef90 (notes on later tickets), and this one.

**Validation.**

- Test-first: the new built-output case "gives each code line the number the page shows for it, from 1" in `tests/check/valid-artifacts.test.ts` failed (`data-line` null) before the change and passes after it.
- `valid-artifacts`, `artifact-failures` and `artifact-checks` (81 tests) pass unchanged, the Stage `stage-run` line failures included.
- No test pins the Stepper's `lines`/`data-step` failure wording. A throwaway script ran the old and new `stepper.ts` over bad and good lists (`9`, `0`, `2-1`, `a`, `2-`, `1-2, 4`, figure `data-step` `0`, `3-1`, `2-`, `1, 3`). Messages and results were identical.
- Full `pnpm check` at the merged HEAD, recorded in the final report.

**Shared parts reached and checked.** `rich-content.css` reaches plain blocks, Stepper code and Stage code, and `stepper.ts` reaches every Stepper form. I built the integration tip and this branch and captured both catalogs in Chrome:

- what was captured: on `/catalog/`, the two plain blocks, the D2 Stepper, the figure Stepper and the one-block code Stepper; on `/catalog/stage/`, both Stages with code
- conditions: screen and print, light and dark, 1280 px and 393 px, four steps each on screen, with the announcements, lit lines, printed step lists and line marks recorded
- result: all 116 element shots and the text record are byte-identical before and after. Nothing changed.

**Decisions.**

- The number is carried as a `data-line` attribute written at build time, not computed by each reader. CSS `attr()` shows it, and both the page and `pnpm check`'s Stage runs read the same built HTML.
- The transformer lives in the site's Markdown processing (`src/rich-content.ts`), which already reads fences and is where ticket 02 reads `start`. The design system only reads the attribute, so it gains no Shiki dependency.
- The grammar module is named for what it parses, number lists, since `data-step` lists are step numbers, not lines.
- A Stage `lines` key must equal one of the block's shown numbers written as text, so `"01"` and `"1.0"` stay refused as before.

**Left undone.** Nothing in scope. Ticket 02 owns rewording "it has N lines" and the list examples for a block that doesn't start at 1 (see its comment).
