# 03: The frame writes equation, figure and diagram numbers

Status: resolved
Blocked by: 01

Spec: [Page numbering](../spec.md). No number changes on any page, on screen or in print.

**What to build:** the frame writes the number of each displayed equation, figure and diagram into its markup, and CSS prints it without counting. Equations run in one series across the page, "(1)". Figures and diagrams each run in their own series per section, "Figura 4.1" and "Diagrama 4.1", from the section number [01](01-the-frame-writes-section-and-clause-numbers.md) wrote. A Stage is numbered on the figures' series, and a Stepper takes no number, both as today.

The rules the count has to keep:

- Nothing inside a question's model answer or explanation is numbered. Its equations stay off the series, and its figures and diagrams show their captions alone.
- An example's solution keeps its equations and figures on their series.
- A figure or diagram before the first section has no section number, as today.

`DESIGN.md` gives the revealed-part rule's reason as "CSS can't count what a closed model answer or a hidden explanation hides". Rewrite the reason, not the rule: a number on a figure the page hides would leave a gap in the series the owner sees.

This is design-system work: do it in a local session with impeccable (`design-system/CLAUDE.md`).

- [x] Each displayed equation, figure and diagram outside a revealed part carries its number in the built page, and the page prints that number.
- [x] The `artifact-equation`, `artifact-figure` and `artifact-diagram` counters are gone, and `ArtifactFrame.astro` counts nothing in CSS.
- [x] A figure, a diagram and an equation inside a model answer or an explanation carry no number, and the ones after the question keep the numbers they had.
- [x] `tests/check/valid-artifacts.test.ts` asserts the written number of an equation, of a figure and a diagram in two sections, of a Stage on the figures' series, and none inside a revealed part.
- [x] Every other `tests/check` case passes unchanged, the look acceptance cases included (`ARTIFACTORY_BROWSER_ACCEPTANCE=1`): look names each item by the number its page shows.
- [x] `design-system/DESIGN.md` › Numbering gives the revealed-part rule its new reason, and `.impeccable/design.json` follows where it carries the old one.
- [x] `docs/agents/test-seams.md` › `tests/check` lists the numbers the built page shows.
- [x] On the catalog and on the public sample, every equation, figure and diagram number is the same before and after, on screen in both themes and in print. The closing comment records how that was compared.
- [x] The closing comment names the shared parts this reached (`math.css`, `figure.css`, `SvgImage.astro`, `InlineSvg.astro`) and the other component checked for each.

## Comments

### 2026-11-11: from 01

01 (`impl/page-numbering-01`) writes `data-number` on each h2 ("4") and `data-section` ("4") on every `.figure-number` after the first h2, and `ArtifactFrame.astro` prints a figure's and a diagram's number as `attr(data-section) "." counter(…)`. Replace `data-section` with the written number. The tag walk is `tags()` in `design-system/src/html-tags.ts`, and the count is `withSectionAndClauseNumbers` in `page-numbers.ts`. Moving from counters to text makes Chromium shape the number as one run, so a caption after it moves by under 1/64 px. 01 found this by pixel diff and measured it with DOM ranges, and the numbers themselves don't change.


### 2026-11-11: implementation

Branch `impl/page-numbering-03`, commits 15e4508 (claim), 6689ad4 (the work) and 7672c13 (docs).

**Result.** `withEquationFigureAndDiagramNumbers` in `design-system/src/page-numbers.ts` is the one count, a function of its own beside 01's `withSectionAndClauseNumbers`. The frame runs it after 01's, and it reads each section's number from the h2's `data-number`. It writes `data-number` on each displayed equation ("3") and on each figure's and diagram's `.figure-number` ("4.1", or "2" before the first section). The equations it numbers are the ones the CSS counted: those in the main column, and those directly in a top-level statement or proof, an example's solution included. Figures and diagrams are numbered wherever they stand, a Stage (`figure.figure.stage`) on the figures' series. A figure Stepper draws a `div`, not a `figure`, so it takes none. Nothing inside a `.question-revealed` is numbered. `ArtifactFrame.astro` prints the numbers with `"(" attr(data-number) ")"` and `attr(data-number)`, and the `artifact-equation`, `artifact-figure` and `artifact-diagram` counters are gone. 01's interim `data-section` is gone too. The revealed-part rule is kept in the frame (the number label is hidden, as before), with its new reason. One difference from the CSS: before the first section, the old counter restarted inside each wrapper, and the count now runs in one flat series. No page in the catalog, the sample or the fixtures has a figure inside a wrapper there.

**Validation.**
- `tests/check/valid-artifacts.test.ts`, `describe("equation, figure and diagram numbers")`: a new fixture, `numeracao`, has two figures and an equation before the first section, then two sections. They hold a diagram, figures, a Stage, a figure Stepper, an example with equations and a figure in its solution, a proof with an equation, and an `OpenQuestion` and a `SingleChoice`. Each question has a figure, a diagram and an equation in its model answer or explanation, and the `OpenQuestion` has a figure in its prompt. Two cases assert each equation's and each drawing's written number, or none. Both failed before the change (no number written) and pass after: 50 of 50 in the file. happy-dom's parser drops everything after a `<style>` inside an SVG, which D2 writes in every diagram, so the case reads the page without its styles.
- `ARTIFACTORY_BROWSER_ACCEPTANCE=1 … tests/check/browser-verification.test.ts`: 32 passed. A first run failed one case, `look-groups`, on `net::ERR_CONNECTION_REFUSED` from look's own local server, before any shot, and the rerun passed.
- Before/after comparison: built the site at 5041b9f (the integration tip, in a scratch worktree) and at 6689ad4. A puppeteer script with the Nix Chromium opened `/catalog/`, `/catalog/?lang=pt-BR`, every `/catalog/<page>/` and the sample `/rsa-from-scratch/`. Each page was captured at 1440 px and 393 px in light and dark, and under print media emulation at 794 px. On each, it read every equation's and `.figure-number`'s text from the accessibility tree: 115 page and setting pairs (23 pages, 5 settings each), and the numbers are the same in every one. It also compared page heights, screenshots in viewport-high strips pixel by pixel, and DOM geometry. A run of the "before" build against itself showed `/catalog/attempt-switched/`, `/catalog/load-failed/` and `/catalog/started-over/` changing height between two captures of the same build, so their screenshot diffs aren't evidence. Their numbers matched. On every other page the heights are equal. The only pixels that differ are a figure or diagram number's glyphs, the caption text after a two-digit-section number ("10.1", "11.1" on `/catalog/stage/`), and one wide equation's math on the sample at 393 px. Measured with DOM boxes and ranges, every number box's left edge and top are unchanged. A number's width changed by at most 0.0156 px, and so did where its caption text or its equation's math starts: on `/catalog/stage/` and the sample, and nowhere on `/catalog/`. This is the same thing 01 met: Chromium shapes "4.1" and "(2)" as one text run. The strips that differ were checked by eye and look the same.
- Print was compared as print-media screenshots, not PDFs.
- impeccable audit (accessibility): before and after, Chromium gives a figure no computed name, and its number reaches the accessibility tree's text either way (look reads it there). An equation's `innerText` leaves out the number in both. No colour, spacing, type or breakpoint changed.

**Shared parts.** None of `math.css`, `figure.css`, `SvgImage.astro` or `InlineSvg.astro` changed: the numbers print from rules in `ArtifactFrame.astro`, beside markup these files draw.
- `math.css` sets the math the equation number stands beside. Also checked: a statement's and a proof's equations (`/catalog/` and the fixture), and the sample's wide equation at 393 px.
- `figure.css` frames Figure, Diagram and Stage. All three were checked on `/catalog/`, `/catalog/stage/`, `/catalog/mepa/` and the sample.
- `SvgImage.astro` draws Figure's and Diagram's caption. Both were checked as above.
- `InlineSvg.astro` draws every drawing. The figure Stepper was checked, in the fixture and on `/catalog/`: it still takes no number.

**Not done.**
- `ArtifactFrame.astro` still counts questions (`artifact-question`), which is 02's. The second half of "counts nothing in CSS" holds once 02 lands, so that item stays unticked.
- Two texts outside this ticket's files still give the old CSS reason. `OpenQuestion.astro`'s doc comment, and `COMPONENTS.md` generated from it, says a figure in the model answer is unnumbered "since the page can't count what the closed model answer hides". The comment on `accessibleText` in `scripts/look.ts` says figure numbers are CSS counters. The spec rules out `COMPONENTS.md` changes, so this needs a decision: either the orchestrator or owner approves rewording the doc comment to the new reason (and running `pnpm components`), or it stays. The look comment can go once 02 lands.
- `.impeccable/design.json` needed no change: it carries neither the old reason nor how a number is made.

### 2026-11-11: merge with 02

Merging this into `impl/page-numbering-02` removed `artifact-question` with the last `counter-reset`, so `ArtifactFrame.astro` counts nothing in CSS.

### 2026-11-12: resolved

Orchestrator, implement-spec session (integration branch `architecture-review-implementation`). This ticket's work landed on the integration branch, and a full `pnpm check` passed (`current`) on each landed HEAD. The last was `7c62489`, after the review fixes. A two-axis code review (Standards and Spec) of the whole branch ran on 2026-11-11. Its findings, and the owner's four decisions on them (recorded on the specs), were fixed in `impl/review-fixes` (`bcd4fab`…`7c62489`). Review fixes: figures before the first section keep one series (owner decision, pinned by a `valid-artifacts` case and stated in `DESIGN.md` › Numbering), `OpenQuestion.astro`'s doc comment gives the new reason and `COMPONENTS.md` was regenerated (owner decision), and `test-seams.md` › `tests/check` lists every number the page writes. It reaches `main` through the integration branch's PR.
