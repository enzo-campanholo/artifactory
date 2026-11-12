# Page numbering

Source: the architecture review of 2026-11-10, candidate 4. Every decision below was made with the owner that day, and [Comments](#comments) records them.

## Problem

An artifact's page numbers its sections, clauses, equations, figures, diagrams and questions, so an artifact never writes a number. The page counts them with CSS counters in `design-system/src/ArtifactFrame.astro`, and TypeScript counts some of them a second time wherever a number is needed as text:

- **Clauses:** CSS counts a section's paragraphs, h3s and statements. `statementsAndProofs` in `statements.ts` counts the same elements again so a citation prints the number the margin shows. Each side carries a comment naming the other, and nothing else holds them equal.
- **Questions:** CSS counts them. `numbered` in `question-markers.ts`, the outline in `artifact-outline.ts` and the Library's questions block count them again.
- **Workarounds where CSS can't count:**
  - a matching's range of numbers is filled into a slot by the frame, because "a CSS counter can't print a range ahead of the questions it counts";
  - a question's accessible name is set by script, because Chromium leaves a counter out of a computed name (`QuestionAnswer.name` in `question-answer.ts`).
- **Figures, diagrams and equations** are numbered only in CSS, so no test can assert their numbers. The ticket that left figures inside a question's revealed part unnumbered checked 54 readings by hand and recorded "Figure numbers are CSS and not tested automatically".

A code line's number already made this move. [Code display](../code-display/spec.md) 01 replaced the gutter's CSS counter with `data-line` on each line, printed with `content: attr(data-line)`, and everything else reads that one number.

## Behaviour

Every number on the page looks as it does today, on screen and in print. Only where the number comes from changes.

- The frame, which already rewrites the content for statements and questions, writes every number into the markup. CSS prints it and counts nothing.
- That covers every series: sections, clauses, equations, figures, diagrams and questions. Figures, diagrams and clauses print their section's number, so a partial move would leave sections counted twice.
- A citation prints the number written for its statement. `statements.ts` no longer counts what the frame counted.
- A matching's range and a question's accessible name read the same written numbers. The script that sets the accessible name goes if the written number reaches the computed name; ticket 02 finds out, and keeps it if not.
- The question manifest, the outline and the Library's questions block keep the numbers they have.

### Rules that stay

- An artifact never writes a number.
- Nothing inside a question's model answer or explanation is numbered. `DESIGN.md` gives the reason as "CSS can't count what a closed model answer or a hidden explanation hides". That reason goes with the counters, and the rule stays for another one: a number on a figure the page hides would leave a gap in the series the owner sees.
- A proof and its paragraphs take no number. An example's solution is part of the example's clause, so its paragraphs take none, while its equations and figures keep their series.

## Tests

Seam 1. `tests/check/valid-artifacts.test.ts` asserts, in the built page, the number each series shows: a section, a clause beside a paragraph, an h3 and a statement, an equation, a figure and a diagram by section, a question, and a matching's range. Its existing statement and citation cases pass unchanged.

## Documentation

- `design-system/DESIGN.md` › Numbering: its first sentence ("The page numbers everything with CSS counters") and the reason for the revealed-part rule. The same change goes to `.impeccable/design.json` where it carries either.
- `docs/agents/test-seams.md` › `tests/check`: the numbers the built page shows.
- No `COMPONENTS.md` or `artifact` skill text changes: an agent still writes no number.

## Shared parts

`page.css`, `math.css`, `figure.css` and `SvgImage.astro` may each be reached, since the numbers print through them. Each ticket names the ones it reached and checks another component they reach on its catalog page. The catalog's own pages use the frame, so their numbers move too.

## Out of scope

- Citing a figure, a diagram or an equation. No artifact needs it. The written numbers make it possible later.
- Numbering anything inside a question's revealed part.
- Any change to how a number looks or where it stands.

## Comments

### 2026-11-10: owner decisions at the architecture review

Owner, architecture review session, 2026-11-10 (thread 8d57bee0-37b7-4277-bf58-cace669ef571), every recommendation accepted.

- **Approved, round 1 Q6:** `DESIGN.md` › Numbering is reopened for its mechanism, not its look: the frame writes every number into the markup and CSS prints it, for every series, done last among the design-system features and in a local session with impeccable.
- **Approved, round 2 Q9:** figures inside a model answer or explanation stay unnumbered, with the reason rewritten; citing a figure stays out.
- **Approved, round 3 Q1:** the three tickets in `issues/`.
- **Order of work, round 2 Q12:** fifth, after [The Stage on its page](../stage-on-its-page/spec.md).

### 2026-11-11: owner decisions at the code review

Owner, implement-spec orchestration session, 2026-11-11, on the code review of the integration branch (`c6b9706...622fa5d`).

- **Approved, decision 1 (figures before the first section):** the flat series `page-numbers.ts` counts stays. Before the first section, figures and diagrams take one series of each kind, a figure inside a question's prompt included, where the CSS counter restarted inside each wrapper. `design-system/DESIGN.md` › Numbering records it, and one `tests/check/valid-artifacts.test.ts` case pins it.
- **Approved, decision 4 (OpenQuestion's reason):** `OpenQuestion.astro`'s doc comment gives the reason `DESIGN.md` › Numbering now gives for leaving a model answer's figures unnumbered, and `design-system/COMPONENTS.md` is regenerated with `pnpm components`. Only the reason changes. This narrows [Documentation](#documentation)'s "No `COMPONENTS.md` … text changes" for that one sentence.
