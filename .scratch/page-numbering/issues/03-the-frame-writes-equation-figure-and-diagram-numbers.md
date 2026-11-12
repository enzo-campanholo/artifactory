# 03: The frame writes equation, figure and diagram numbers

Status: ready-for-agent
Blocked by: 01

Spec: [Page numbering](../spec.md). No number changes on any page, on screen or in print.

**What to build:** the frame writes the number of each displayed equation, figure and diagram into its markup, and CSS prints it without counting. Equations run in one series across the page, "(1)". Figures and diagrams each run in their own series per section, "Figura 4.1" and "Diagrama 4.1", from the section number [01](01-the-frame-writes-section-and-clause-numbers.md) wrote. A Stage is numbered on the figures' series, and a Stepper takes no number, both as today.

The rules the count has to keep:

- Nothing inside a question's model answer or explanation is numbered. Its equations stay off the series, and its figures and diagrams show their captions alone.
- An example's solution keeps its equations and figures on their series.
- A figure or diagram before the first section has no section number, as today.

`DESIGN.md` gives the revealed-part rule's reason as "CSS can't count what a closed model answer or a hidden explanation hides". Rewrite the reason, not the rule: a number on a figure the page hides would leave a gap in the series the owner sees.

This is design-system work: do it in a local session with impeccable (`design-system/CLAUDE.md`).

- [ ] Each displayed equation, figure and diagram outside a revealed part carries its number in the built page, and the page prints that number.
- [ ] The `artifact-equation`, `artifact-figure` and `artifact-diagram` counters are gone, and `ArtifactFrame.astro` counts nothing in CSS.
- [ ] A figure, a diagram and an equation inside a model answer or an explanation carry no number, and the ones after the question keep the numbers they had.
- [ ] `tests/check/valid-artifacts.test.ts` asserts the written number of an equation, of a figure and a diagram in two sections, of a Stage on the figures' series, and none inside a revealed part.
- [ ] Every other `tests/check` case passes unchanged, the look acceptance cases included (`ARTIFACTORY_BROWSER_ACCEPTANCE=1`): look names each item by the number its page shows.
- [ ] `design-system/DESIGN.md` › Numbering gives the revealed-part rule its new reason, and `.impeccable/design.json` follows where it carries the old one.
- [ ] `docs/agents/test-seams.md` › `tests/check` lists the numbers the built page shows.
- [ ] On the catalog and on the public sample, every equation, figure and diagram number is the same before and after, on screen in both themes and in print. The closing comment records how that was compared.
- [ ] The closing comment names the shared parts this reached (`math.css`, `figure.css`, `SvgImage.astro`, `InlineSvg.astro`) and the other component checked for each.

## Comments

### 2026-11-11: from 01

01 (`impl/page-numbering-01`) writes `data-number` on each h2 ("4") and `data-section` ("4") on every `.figure-number` after the first h2, and `ArtifactFrame.astro` prints a figure's and a diagram's number as `attr(data-section) "." counter(…)`. Replace `data-section` with the written number. The tag walk is `tags()` in `design-system/src/html-tags.ts`, and the count is `withSectionAndClauseNumbers` in `page-numbers.ts`. Moving from counters to text makes Chromium shape the number as one run, so a caption after it moves by under 1/64 px. 01 found this by pixel diff and measured it with DOM ranges, and the numbers themselves don't change.

