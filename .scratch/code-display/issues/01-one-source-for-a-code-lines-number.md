# 01: One source for a code line's shown number

Blocked by: None (can start immediately)
Status: ready-for-agent

Prefactor for [Code display](../spec.md). No behaviour changes: every page looks, steps, announces and prints as it does today.

**What to build:** today four places each count a code block's lines from 1 on their own: the gutter's CSS counter in `rich-content.css`, the one-block Stepper's check of `lines` and its announced and printed lines, and the Stage's check of a step's `lines` and the marks it applies (by position plus one). `start=N` would have to be taught to all four. Make the number the page shows for each line live in one place that the gutter, the Stepper and the Stage all read, so that ticket 02 changes only where numbering begins. The [machine-trace](../../machine-trace/spec.md) spec also reads "code lines by the number the page shows", and this gives it that number.

In the same pass, make the Stepper's line-list grammar (`3`, `3-5`, `3-`, `1-2, 6`) a parse against a block's own first and last line number that hands back the refused list's reason, rather than one that throws a `Stepper` component error and assumes the first line is 1. The Stepper keeps reporting its own component errors from that reason, with the same wording. Ticket 03 then reuses the same grammar for a fence's `{…}`, reported at the fence. The figure Stepper's `data-step` lists use the same grammar, so they must keep working unchanged. Put the grammar where the site's Markdown processing can import it from the design system, as it already imports other design-system modules.

This is design-system work: do it in a local session with impeccable (`design-system/CLAUDE.md`).

- [ ] Each rendered code line, in a plain block, a one-block Stepper and a Stage, carries the number the page shows for it, and the gutter shows that number.
- [ ] The one-block Stepper's check of `lines`, its announced lines ("Lines 2 to 3.") and its printed step list ("2 (lines 2–3): caption") take line numbers from that source, not from a line's position.
- [ ] The Stage's check of a step's `lines` and the marks it applies take line numbers from that source, and its failures keep their wording.
- [ ] The line-list grammar takes a first and last number and returns the refusal reason, and Stepper `lines` and `data-step` failures read as they do today.
- [ ] Existing `tests/check` cases for code rendering, Stepper failures and Stage `stage-run` line failures pass unchanged. Extend the built-output code assertion so it checks each line's shown number (1 to n) in the page. Ticket 02 extends this assertion.
- [ ] Shared part: `rich-content.css` reaches plain blocks, Stepper code and Stage code, and `stepper.ts` reaches every Stepper form. On their catalog pages, check a plain block, the one-block code Stepper, a Stage with code, a D2 Stepper and a figure Stepper on screen and in print, and record that nothing changed.
