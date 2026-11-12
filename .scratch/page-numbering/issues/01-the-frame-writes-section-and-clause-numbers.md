# 01: The frame writes section and clause numbers

Status: resolved
Blocked by: None (can start immediately)

Spec: [Page numbering](../spec.md). No number changes on any page, on screen or in print.

**What to build:** the frame writes each section's number and each clause's number into the markup, and CSS prints them without counting. A clause is one of a section's paragraphs, h3s or statements, in one series per section. A citation then prints the number written for its statement, and `statementsAndProofs` in `statements.ts` stops counting the elements the frame counted.

This ticket sets the pattern [02](02-the-frame-writes-question-numbers.md) and [03](03-the-frame-writes-equation-figure-and-diagram-numbers.md) follow, as `data-line` did for code lines. The section's number is written where 03's figures and diagrams can read it.

The cases the count has to keep: a proof and its paragraphs take no number; an example's solution is part of the example's clause; a statement before the first section, in a list or in a question has no number and fails the check as today; a note is never a clause.

This is design-system work: do it in a local session with impeccable (`design-system/CLAUDE.md`).

- [x] Each section and each clause carries its number in the built page, and the margin prints that number.
- [x] The `artifact-section` and `artifact-clause` counters are gone from `ArtifactFrame.astro`. The counters 02 and 03 replace still work.
- [x] One count gives a statement its number and its citations their text. The comments in `ArtifactFrame.astro` and `statements.ts` that name each other go with the second count.
- [x] `tests/check/valid-artifacts.test.ts` asserts the written number of a section and of a clause beside a paragraph, an h3 and a statement, in both languages. Its statement, citation, proof and example cases pass unchanged.
- [x] Every other `tests/check` case passes unchanged.
- [x] `design-system/DESIGN.md` › Numbering no longer says the page numbers everything with CSS counters, and `.impeccable/design.json` follows where it says so.
- [x] On the catalog and on the public sample, the margin numbers of a page with statements, proofs, an example and notes are the same before and after, on screen in both themes and in print. The closing comment records how that was compared.
- [x] The closing comment names the shared parts this reached (`page.css`, `statement-blocks.css`) and the other component checked for each.

## Comments

### 2026-11-11: implementation

Branch `impl/page-numbering-01`, commits 40b5afd (claim) and f9c1386 (the work).

**Result.** `withSectionAndClauseNumbers` in the new `design-system/src/page-numbers.ts` is the one count. The frame runs it on the content before `withStatementReferences`, and it writes `data-number` on the element whose margin prints the number: a section's on its h2 ("4"), and a clause's on a main-column paragraph or h3 after the first h2, or on a top-level statement's first child, its first line ("4.2"). `ArtifactFrame.astro` prints them with `content: attr(data-number)` (`/ ""` on a statement, as before). The `artifact-section` and `artifact-clause` counters are gone. `statementsAndProofs` in `statements.ts` no longer counts: it reads a statement's number from its first child's `data-number`, so a statement before the first section, in a list or in a question has none and fails the check as before. The comments in the frame and `statements.ts` that named each other went with the second count. The tag walk both modules use moved to `design-system/src/html-tags.ts` (`tags`, `attributeValue`, `withInserted`).

**For 03.** Figures and diagrams still count in CSS, but their section number is written: every `.figure-number` after the first h2 carries `data-section` ("4"), and `figure.figure|diagram .figure-number::after` prints `attr(data-section) "." counter(…)`. The frame's TS walk can also read the section from each h2's `data-number`.

**Validation.**
- `tests/check/valid-artifacts.test.ts`: a new case asserts the written number of every h2, paragraph, h3 and statement in `valor-medio` (pt) and `mean-value` (en), none on the lede, a proof's paragraphs or an example's solution. It failed before the change (no element carried a number), and all 48 cases pass after. The statement, citation, proof and example cases are unchanged.
- `ARTIFACTORY_BROWSER_ACCEPTANCE=1 … tests/check/browser-verification.test.ts`: 33 passed. look names figures by the number read from the accessibility tree ("Figure 1.2"), which now joins `attr(data-section)` with the counter.
- Before/after comparison: built the site at 40b5afd and at the change, then shot `/catalog/` (statements, proofs, two examples, notes, figures, diagrams), `/catalog/?lang=pt-BR`, `/catalog/stage/`, `/catalog/mepa/` and the sample `/rsa-from-scratch/` with puppeteer and the Nix Chromium: full page, light and dark at 1440 px (hanging numbers) and 393 px (inline numbers), and under print media emulation at 794 px. A second capture of the "before" build was pixel-identical to the first, so capture is deterministic. Page sizes are identical. The only pixels that differ are caption text after a figure's or diagram's number. Measured with DOM ranges, every section and clause's first line sits where it did, to 1/1000 px, on every page and width. Every figure and diagram number is 0.016 px narrower, so the caption after it starts 1/64 px to the left: Chromium now shapes `"4."` as one text run where it shaped the counter and the "." apart. The numbers' own pixels don't change. 03's written figure numbers will meet the same thing.
- Print was compared as print-media screenshots, not PDFs.
- impeccable audit (accessibility): Chromium left a counter out of a computed name, so the catalog's first h2 was named "Text" and its h3 ". A subsection". With `attr()` they are named "1 Text" and "1.2 A subsection", as shown. A paragraph's text reads "1.1" where it read "1", ".", "1". The statement group's name is unchanged ("Definition 2.2 (…)"). No colour, spacing or breakpoint changed.

**Shared parts.** `page.css` and `statement-blocks.css` weren't reached: the margin numbers' rules live in `ArtifactFrame.astro`, and neither file changed. The frame now writes into the markup `SvgImage.astro` (Figure, Diagram) and `Stage.astro` give a figure's number. Figure and Diagram were checked on `/catalog/` and the sample, and the Stage on `/catalog/stage/`, in the comparison above.

**Not done.** `docs/agents/test-seams.md` › `tests/check` doesn't list the written numbers yet: 03's checklist owns that line, and the file was outside this ticket's files. `.impeccable/design.json` needed no change: it never says CSS counters, nor how a citation gets its number.


### 2026-11-12: resolved

Orchestrator, implement-spec session (integration branch `architecture-review-implementation`). This ticket's work landed on the integration branch, and a full `pnpm check` passed (`current`) on each landed HEAD. The last was `7c62489`, after the review fixes. A two-axis code review (Standards and Spec) of the whole branch ran on 2026-11-11. Its findings, and the owner's four decisions on them (recorded on the specs), were fixed in `impl/review-fixes` (`bcd4fab`…`7c62489`). It reaches `main` through the integration branch's PR.
