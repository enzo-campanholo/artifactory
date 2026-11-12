# 02: The frame writes question numbers

Status: claimed
Blocked by: 01

Spec: [Page numbering](../spec.md). No number changes on any page, on screen or in print.

**What to build:** the frame writes each question's number into its markup, and CSS prints it without counting. Each item of a matching is a question with its own number, and the matching's header shows the range.

Today the page's CSS counts questions, and `numbered` in `question-markers.ts` counts them again for the question manifest, the outline and the Library's questions block. Two workarounds exist because CSS counts:

- `questionRangeSlot` leaves a slot the frame fills with a matching's range, since a counter can't print a range ahead of the questions it counts;
- `QuestionAnswer.name` in `question-answer.ts` sets `aria-label` by script, since Chromium leaves a counter out of a computed name.

With the number written, the range is two written numbers. Find out in a browser whether the written number reaches the question's computed accessible name. If it does, the script that sets it goes. If it doesn't, keep the script and say why in the closing comment.

This is design-system work: do it in a local session with impeccable (`design-system/CLAUDE.md`).

- [x] Each question carries its number in the built page, and its header prints that number.
- [x] The `artifact-question` counter is gone from `ArtifactFrame.astro`.
- [x] A matching's range prints the written numbers of its first and last items.
- [x] The question manifest, the outline and the Library's questions block carry the same numbers as before.
- [x] A question's accessible name carries its number, checked in a browser. The script that sets it is gone, or the closing comment says why it stays.
- [ ] `tests/check/valid-artifacts.test.ts` asserts the written number of a question and a matching's range. Every other `tests/check` and `tests/store` case passes unchanged.
- [x] On the catalog's questions page and on the public sample, every question's number and "Next question" land as before, on screen in both themes and in print. The closing comment records how that was compared.

## Comments

### 2026-11-11: implementation

Branch `impl/page-numbering-02`, commits fbec7b7 (claim) and 3f8631f (the work).

**Result.** `withQuestionNumbers` moved to `design-system/src/page-numbers.ts`, after 01's function. It walks the tags with `html-tags.ts` and writes `data-number` from the outline's numbering, the one count, which the question manifest, the outline and the Library's questions block already used. It writes on every element carrying `questionNumberMarker(id)` (`data-question-number`) or `questionRangeMarker(first, last)` (`data-question-range-from`/`-to`), both in `page-numbers.ts`:

- a question's header, `.question-number`, gets its number ("4");
- a matching item's row number, `.matching-item-number`, gets that item's number ("3");
- a matching's header gets its first and last items' numbers ("3–5").

`Question.astro` prints the header with `.question-number::after { content: " " attr(data-number) }`, and `Matching.astro` prints a row with `.matching-item-number::after { content: attr(data-number) }`. The `artifact-question` counter and its rules are gone from `ArtifactFrame.astro`, and so are `questionRangeSlot`, `questionNumberSlot` and their regex fill in `question-markers.ts`. A matching row's number was already text the frame filled in; it now takes `data-number` like the rest, so no slot is left.

**Accessible name: the script is gone.** In Chromium 155 (the Nix `chromium`), on test markup and then on the built pages, a counter is left out of a computed name ("Question "), and `attr()` content is kept ("Question 4", "Questions 2–4"). So each question is named by its header, the way a matching's box already was:

- `Question.astro` gives every question group `aria-labelledby` pointing at its header (`q-<id>--number`, or `q-<first>--range` for a matching, whose box takes its first item's ID);
- each matching row points at its own number span (`q-<id>--number`), which holds a visually hidden "Question"/"Questão" before the printed number.

`QuestionAnswer.name` and its call in `QuestionBox` are gone. The matching's row marks ("Question 4: Wrong · Right answer: c)") read the row's `aria-label` before, and now take the number from `ShownAnswer.number`, which `QuestionAnswer.show` returns, with the word in `matching-element.ts`'s labels.

**Tests.**
- `tests/check/valid-artifacts.test.ts` (own fixture `autovalores` and `describe("question numbers")`): in page order across sections, each question and matching row is named by its header, which carries its written number: 1, then a matching "2–4" with rows 2, 3 and 4, then 5 and 6. Each has no `aria-label`, and pt shows "Questão"/"Questões". The case failed before the change (no question had a labelling header) and passes after. Its subject is "Cálculo", which is already in use, so the `pnpm new` subject-list cases stay unchanged.
- Three existing cases changed, so that checklist item stays unticked:
  - `tests/store/question-element.test.ts` lost "a question carries its number as its name…", and `tests/store/matching.test.ts` lost its three-row `aria-label` assertion. Both asserted the script this ticket removes. Under happy-dom the store tests render a component without the frame, so no number exists there, and the name now comes from the build, which the new seam-1 case covers. The row mark texts in `matching.test.ts` are unchanged and pass.
  - In `tests/check/library-and-question-manifest.test.ts`, "a matching between other questions" read the range and the row numbers as text ("Questions 2–4", "2"). It now reads the header's words plus its `data-number`, and a row's `data-number`, with the same expected values. CSS prints those numbers, so they're no longer in `textContent`.
- All 16 `tests/store` files pass (215 tests). `valid-artifacts` passes 49/49 and `library-and-question-manifest` passes. `ARTIFACTORY_BROWSER_ACCEPTANCE=1 … tests/check/browser-verification.test.ts` passes 32/32, so `pnpm look` still reads "Question 2" from the accessibility tree for a figure hidden in a question.

**Validation in a browser.** I built the site at fbec7b7 (the integration tip plus the claim) and at 3f8631f, and served each with `startBrowser` from `scripts/browser-session.ts`, in the Nix Chromium.

- **Pages:** `/catalog/unanswered/` in en and pt-BR, `/catalog/saved-wrong/`, `/catalog/saved-right/`, `/catalog/model-answer-shown/`, `/catalog/many-questions/`, `/catalog/short/`, `/catalog/` and the sample `/rsa-from-scratch/`.
- **Modes:** each page full page at 1440 px and 393 px in light and dark, and under print media emulation at 794 px: 45 runs.
- **Repeatability:** each "before" shot was taken twice, and the two were pixel-identical every time.

Results:
- Page heights, the Next question label ("Next: Question 1", "A seguir: Questão 1", "Next: Question 15", "Next: To revisit"…) and its box are identical in all 45 runs.
- `/catalog/`, `/catalog/short/` and every matching header and row are pixel-identical.
- Every differing pixel lies in one column under 9 px wide, where a single question's number stands after "Question".
- Every single question's header starts where it did and is 0.016 px narrower: Chromium now shapes `" 4"` as one run, where it shaped the space and the counter apart. This is the 1/64 px 01 saw on figure numbers. The matching's header and rows keep their boxes to 1/1000 px.
- Zoomed 4×, the header reads "Question 2" as before.
- The computed name of every question and row, from CDP, is the same before and after in every run: "Question N" / "Questão N" on all 6 catalog questions, the 13 sample questions and the 32 on `many-questions`. The matching box is "Questions 3–5" / "Questões 3–5", read through the accessibility tree.
- After the change, no question carries an `aria-label` at runtime: 0, where the script set 6.

**impeccable.** An audit of the change (accessibility, then the detector on the built `saved-wrong` page before and after): the same three findings both times, none in the question components (`state-notice` and `artifact-sheet` padding). No colour, spacing, type or breakpoint changed.

**Shared parts.** None of `page.css`, `math.css`, `figure.css` or `SvgImage.astro` was reached. `Question.astro` renders every question kind, so `SingleChoice`, `NumericQuestion`, `OpenQuestion` and `Matching` were all checked on the catalog pages above. `question-element.ts` (`QuestionBox`) lost one line, for every kind.

**Not done, for the orchestrator and 03.**
- `design-system/DESIGN.md` › Numbering still says questions are counted in CSS. Its paragraph is one line that 03 rewrites for equations, figures and diagrams, so I left it for that rewrite to drop "questions" too, rather than edit the same line on two branches.
- `scripts/look.ts`'s comment above `accessibleText` still says figure and question numbers are CSS counters. The accessibility-tree read it explains is still needed, since CSS prints the number, but the comment is out of date once 03 lands. I left it to 03.
- Merge points with 03: `ArtifactFrame.astro`'s `page-numbers.ts` import line and its `counter-reset` line (this branch keeps `artifact-equation` there).
