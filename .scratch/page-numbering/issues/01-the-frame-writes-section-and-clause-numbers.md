# 01: The frame writes section and clause numbers

Status: claimed
Blocked by: None (can start immediately)

Spec: [Page numbering](../spec.md). No number changes on any page, on screen or in print.

**What to build:** the frame writes each section's number and each clause's number into the markup, and CSS prints them without counting. A clause is one of a section's paragraphs, h3s or statements, in one series per section. A citation then prints the number written for its statement, and `statementsAndProofs` in `statements.ts` stops counting the elements the frame counted.

This ticket sets the pattern [02](02-the-frame-writes-question-numbers.md) and [03](03-the-frame-writes-equation-figure-and-diagram-numbers.md) follow, as `data-line` did for code lines. The section's number is written where 03's figures and diagrams can read it.

The cases the count has to keep: a proof and its paragraphs take no number; an example's solution is part of the example's clause; a statement before the first section, in a list or in a question has no number and fails the check as today; a note is never a clause.

This is design-system work: do it in a local session with impeccable (`design-system/CLAUDE.md`).

- [ ] Each section and each clause carries its number in the built page, and the margin prints that number.
- [ ] The `artifact-section` and `artifact-clause` counters are gone from `ArtifactFrame.astro`. The counters 02 and 03 replace still work.
- [ ] One count gives a statement its number and its citations their text. The comments in `ArtifactFrame.astro` and `statements.ts` that name each other go with the second count.
- [ ] `tests/check/valid-artifacts.test.ts` asserts the written number of a section and of a clause beside a paragraph, an h3 and a statement, in both languages. Its statement, citation, proof and example cases pass unchanged.
- [ ] Every other `tests/check` case passes unchanged.
- [ ] `design-system/DESIGN.md` › Numbering no longer says the page numbers everything with CSS counters, and `.impeccable/design.json` follows where it says so.
- [ ] On the catalog and on the public sample, the margin numbers of a page with statements, proofs, an example and notes are the same before and after, on screen in both themes and in print. The closing comment records how that was compared.
- [ ] The closing comment names the shared parts this reached (`page.css`, `statement-blocks.css`) and the other component checked for each.

## Comments
