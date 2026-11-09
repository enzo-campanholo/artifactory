# 02: Let one question box hold several questions

Status: resolved
Blocked by: [Question explanations 01](../../question-explanations/issues/01-question-revealed-part.md)

Spec: [Content types](../spec.md) › Behaviour: the matching, and Shared parts. A prefactor for 03: no behaviour changes.

**What to build:** today one question box is one question. The box (its header, prompt, Check button, status and recovery line) and the question's answer on the page (reading and showing the response, checking and saving it, locking with a mark, naming itself "Questão N", reopening when an attempt reopens it, the restored-answer and answered-elsewhere rules) are one element, and the question's markers sit on the box. A matching (`GLOSSARY.md`) needs one box whose single Check saves several questions, each item locking with its own mark on its own row. Separate the two, so a box can drive one question (every kind today, unchanged) or several (the matching, in 03), and the answer logic exists once, not copied into the matching.

Make the change easy, then make the easy change: this ticket only moves code. `SingleChoice`, `NumericQuestion` and `OpenQuestion` look, read out and behave exactly as before, and the built page keeps each question's markers where the build reads them, so the question manifest, the questions block and question numbering are unchanged.

This touches shared question parts (`Question.astro`, `question-element.ts`, `question-markers.ts`), so it is design-system work: do it in a local session, through impeccable (`design-system/CLAUDE.md`). Question explanations' tickets change the same parts. The edge to Question explanations 01 exists only because both prefactors rewrite the same seam of the question frame, so their rewrites don't conflict; nothing here depends on its behaviour. Its later tickets are file overlap, not a dependency: whichever lands second rebases.

- [x] The answer on the page can be driven for one question inside a box that holds others, with the box's Check submitting, enabling and locking for all of its questions, and the status and recovery line belonging to the box.
- [x] Every existing test at the store seam passes with its assertions unchanged (each question kind's behaviour, attempts, the stopping point, Next question); only a test's mounting markup may change, if the element's parts move.
- [x] The `pnpm check` seam's built-site tests (question manifest, Library questions block, question numbers) pass unchanged.
- [x] Shared parts: these reach `SingleChoice`, `NumericQuestion` and `OpenQuestion`. The closing comment records each one on every catalog state page (unanswered, model answer shown, saving, saved right and wrong, not saved, answered elsewhere, signed out, attempt switched, started over …) checked before and after with the same evidence, in English and `?lang=pt-BR`, and in print.
- [x] No doc comment or `Props` changes, so `COMPONENTS.md` is unchanged; if one does, `pnpm components` regenerates it.

## Comments

### 2026-11-09: from Question explanations 01

Implementer of [Question explanations 01](../../question-explanations/issues/01-question-revealed-part.md#comments). The model answer now renders through `design-system/src/RevealedPart.astro` (`.question-revealed`, `-heading`, `-content`), and `open-question-element.ts` focuses `.question-revealed` on the owner's reveal. If the box/question split moves the model answer, keep it inside the part. Explanations (Question explanations 02, 03) use the same part.

### 2026-11-09: closed

Implementer, impeccable-gaps-implementation pass, branch `t3/question-box-several-questions`.

- **Result:** `design-system/src/question-element.ts` now holds `QuestionBox`, the box: the form, Check, `.question-status`, `.question-recovery`, the store subscription, the inert start and the restored-response sync. It drives a list of `QuestionAnswer`s from the new internal `design-system/src/question-answer.ts`, one question's answer on the page each: reading and showing the response, checking and saving, locking with a mark (`data-status`/`data-mark` on the element carrying the question's markers), naming it "Questão N", reopening, and the restored-answer rule. Check is enabled once every answer not yet shown has a response, and it saves every unanswered answer together. `QuestionElement` is the one-question box (`answers = [new QuestionAnswer(this, this)]`), so `SingleChoice`, `NumericQuestion` and `OpenQuestion` and their markers on the box are unchanged. `Question.astro` and `question-markers.ts` didn't need to change.
- **Commits:** `7732601` (claim), `dd9fb00` (the refactor), `9c43768` (notes on Content types 03 and Question explanations 02), `2864839` (merge of the integration tip), this closing commit.
- **Validation:** every `tests/store` test passed unchanged, assertions and mounting markup both (14 files, 177 tests), before the full gate. `pnpm check` passed with 0 failures on `2864839`, including the `tests/check` built-site tests for the question manifest, the Library questions block and question numbers. One capture script ran on a build of `b93578b` and on one of `dd9fb00`. It captured every `.question` on `/catalog/` `unanswered`, `model-answer-shown`, `saving`, `saved-right`, `saved-wrong`, `not-saved`, `answered-elsewhere`, `load-failed`, `signed-out`, `artifact-updated`, `attempt-switched`, `started-over`, `visitor`, `public-signed-out`, `short` and `many-questions`, in English and `?lang=pt-BR`, at 393 × 852 (×3) and 1920 × 1080, on screen in light and dark and in print. That made 888 element screenshots (296 printed), byte-identical before and after, with identical boxes, `innerText` and full `outerHTML`, attributes, status text, `aria-live`, fieldset states, Check and summary `aria-disabled`, and focused element. It also ran an interaction pass on `/catalog/unanswered/` in both languages: Check with no choice, choose, check wrong; numeric refused with its message, then wrong; open typed, revealed, marked right. Every step's DOM, status and focus were identical (focus moved to `.question-status` on locking and to `.question-revealed` on the reveal, as before), and its 60 shots matched pixel for pixel. Four of them differ in bytes only where the validation bubble or the text caret was caught at a different moment. impeccable `detect` found the same three findings on the built pages before and after (state notices and the contents sheet, none on a question).
- **Shared parts:** `question-element.ts` reaches `SingleChoice`, `NumericQuestion` and `OpenQuestion`, all three in every capture above. `Question.astro`, `question-markers.ts`, `split-at-rule.ts`, `COMPONENTS.md`, `DESIGN.md` and `.impeccable/design.json` are unchanged: no doc comment, `Props` or look changed.
- **Decisions:**
  - The answer is a plain object kept on an element, not a custom element. A matching's rows then need no element of their own, and a one-question box passes itself as both element and response.
  - Box and one-question box share `question-element.ts`, the shared part the tickets name. The answer has its own module.
  - The box resets its whole form once, then reopens each reopened answer. Locked answers show their responses again after the reset, so an added item can open alone.
  - The box reports the first shown answer's status: exactly the old behaviour for one question, and the place 03 puts the set's rule.
  - No test was added. Nothing yet holds several questions, and 03 owns the set's behaviour and its tests at the store seam.
- **Workaround:** the worktree's `README.md` was mode 0600, so it was set to 0644 before the gate, for the known `tests/check/reporting.test.ts` flake. Its content is unchanged.
- **Left undone:** nothing.
