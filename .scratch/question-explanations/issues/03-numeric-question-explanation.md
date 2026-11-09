# 03: A NumericQuestion shows its explanation once its answer locks

Status: resolved
Blocked by: 02

Spec: [Question explanations](../spec.md). The decisions are in the map ticket's `## Answer` (`artifact-generation-gaps` 01); don't reopen them.

**What to build:** An agent writes a `NumericQuestion`'s question, then a blank line, `---`, a blank line and its **explanation**, typically the worked solution the brief gives. It shows and hides exactly as a `SingleChoice`'s does since 02 (on a locked answer, saved or answered elsewhere, right or wrong, wherever the answer came from; hidden before, while saving, not saved or lost to a sign-out, after starting over, without JavaScript, and in print unless locked), through the same shared parts. It comes after everything the lock already shows: after the "Resposta certa" / "Right answer" line on a wrong answer, and after the locked field (and its unit) on a right one. The right-answer line keeps its place and stays the field's description; the explanation is never part of that description. A question with no `---` builds and behaves as today.

Design-system work: run it in a local session with impeccable (`design-system/CLAUDE.md`).

- [x] The question is what comes before `---`; a question that is empty before it still fails as "write the question inside it", and a `---` with nothing after it fails the build with a component error naming `NumericQuestion`, reported by `pnpm check` at the entry under `build`. Tested at the `tests/check` seam.
- [x] On a wrong answer the explanation comes after the right-answer line, and on a right answer after the locked field; the field's `aria-describedby` still names the unit and the right-answer line only. Asserted at the `tests/store` seam, with the lock, restore and start-over cases 02 covers for `SingleChoice` repeated only where `NumericQuestion` places or wires something of its own.
- [x] Nothing about it reaches artifact state, the question manifest or the store (ADR 0001).
- [x] `DESIGN.md` › Questions gives the explanation's place in a numeric question, after the right-answer line or the locked field.
- [x] `NumericQuestion`'s doc comment says how to write the explanation (its example shows a worked one), that it shows once the answer locks, and that it never teaches a fact for the first time; `pnpm components` regenerates `COMPONENTS.md`.
- [x] The `artifact` skill, in the same commit: "Ask questions that test understanding" says to write an explanation whenever the brief or source material gives a worked solution for a numeric answer, with every fact the owner must learn also in the text; the Build failures line on `NumericQuestion: …` messages covers the empty explanation.
- [x] The catalog's questions page gives its `NumericQuestion` an explanation, shown hidden on `/catalog/unanswered/`, after the locked field on a right answer and after the right-answer line on `/catalog/saved-wrong/`, at phone and desktop widths, in both languages and in print.
- [x] Shared parts: if the question frame or the shared question element changes again, check `SingleChoice`'s and `OpenQuestion`'s catalog states with the same evidence; otherwise say the change stays inside `NumericQuestion`.

## Comments

### 2026-11-09: from 02

Implementer of [02](02-single-choice-explanation.md#comments). The shared parts are in place; 03 only wires `NumericQuestion` to them.

- **Markup:** `Question.astro` takes an optional `explanation` (auto-checked kinds only) and renders `<div class="question-explanation" hidden>` holding the `RevealedPart` ("Explanation" / "Explicação") right after the `<fieldset>`, with `margin-block-start: var(--space-3)`. Pass `explanation={…}` from `NumericQuestion.astro`; the prop is typed `string | undefined`, so pass the split result as it is.
- **Showing:** `QuestionElement` now owns `static observedAttributes = ["data-status", "data-mark"]` and an `attributeChangedCallback` that sets the explanation's `hidden` from the locked test (saved or answered elsewhere). `NumericQuestion` already overrides it with `super.attributeChangedCallback()` first, so its explanation shows and hides with no more code.
- **Order:** the right-answer line goes after `.numeric-question-answer`, inside the fieldset, and the explanation sits after the fieldset, so on a wrong answer it already follows the line. The field's `aria-describedby` is built in `#showRightAnswer` and never names the explanation.
- **Splitting:** `split-at-rule.ts` is unchanged. `single-choice.ts` shows the shape: split first, run the existing rules on `before`, and fail on `after === ""` with "write the explanation after `---`, or leave out the `---`" (my wording; reuse it for `NumericQuestion` so the skill's Build failures line can name one message for both).
- **Tests:** `tests/store/single-choice.test.ts` covers the lock cases (saving, saved right and wrong, device copy, server, answered elsewhere, not saved then retried, signed out, Start over and Undo, attempt switch). The empty-explanation failure is its own fixture repo in `tests/check/reporting.test.ts`; the built output (heading per language, hidden, after the options) is in `tests/check/library-and-question-manifest.test.ts` › "a single choice's explanation".

### 2026-11-09: closing (implementer)

**Result:** done. `NumericQuestion` splits its content at `---` with the shared `split-at-rule.ts`, the same way `single-choice.ts` does. The question is what comes before it, and an empty question still fails as "write the question inside it". An empty explanation fails as `NumericQuestion: write the explanation after \`---\`, or leave out the \`---\``, 02's wording, so one Build failures line covers both components. The split result goes to `Question.astro`'s `explanation` prop. Showing and hiding needed no new code: `numeric-question-element.ts` already calls `super.attributeChangedCallback()` (02), and `#showRightAnswer` still builds `aria-describedby` from the unit and the right-answer line only.

**Commits:** `e26abf5` (claim), `c22e075` (implementation, docs, skill, catalog, tests in one commit), `f81d1be` (note on Look captures 06), and this closing commit.

**Validation:**

- **`tests/check`:**
  - `reporting.test.ts` adds two fixture repos: `---` with no explanation, and an explanation with no question before it. Both fail at `11:1` under `build`. Before the change, each failed instead as `html-validate/void-style` on a stray `<hr/>` in the prompt.
  - In `library-and-question-manifest.test.ts`, the `derivadas` fixture gains a pt-BR `NumericQuestion` with an explanation. The test asserts the prompt is only the question, and that the explanation is hidden, comes after the field, carries the "Explicação" heading and holds a paragraph and a list, with no `aria-describedby` on a field without a unit. `spring-frequency` has no `---`: it has no explanation, and its field is still described by its unit. The question manifest gains the new question as `{ id, kind: "numeric", key: { value: "6" } }`, with nothing about its explanation (ADR 0001). The Library block and the masthead counts move from 2 to 3 questions.
- **`tests/store`:** `numeric-question.test.ts` checks four things:
  - a saved wrong answer shows the explanation after the right-answer line;
  - a saved right answer shows it after the locked field and its unit;
  - it stays hidden through a refused input and while saving, and shows once saved;
  - Start over hides it again.

  Each case also asserts the field's description. I confirmed the first three fail when the `super.attributeChangedCallback()` call is removed. 02's single-choice tests already cover the device copy, the server, answered elsewhere, not saved, sign-out, Undo and the attempt switch through the shared `QuestionElement`, and `NumericQuestion` wires none of these itself, so they aren't repeated.
- **Catalog, built and checked in Chrome:** `/catalog/unanswered/`, `/catalog/saved-right/` and `/catalog/saved-wrong/`, in en and `?lang=pt-BR`, at 1280 and 393, on screen in light and dark, and in print.
  - Unanswered: the explanation is hidden in every case, print included.
  - Right answer: it shows after the field and unit, 16px (`--space-3`) below, under "Explanation" / "Explicação".
  - Wrong answer: it shows after the "Right answer" / "Resposta certa" line, and the field is described by `cm²` and that line only.
  - At 393 in print the page overflows horizontally, but unanswered pages do too with the explanation hidden, so the overflow comes from elsewhere.
  - The impeccable detector found nothing on `NumericQuestion.astro` or `questions.mdx`.
- **Full gate:** `pnpm check` runs on the branch's final HEAD after the integration merge, as the brief orders.

**Decisions:**

- I reused 02's empty-explanation message word for word, so the skill names one rule for both components.
- `.impeccable/design.json` is unchanged: the caption token already names the explanation's heading, and nothing about the world changed.
- The built-output fixture puts the explanation on a new question in `derivadas`, not on `spring-frequency`, so the "no `---` builds as today" case keeps a real fixture.
- The catalog's explanation is a worked solution with a display equation, plus the likely mistake (squaring after multiplying), so it reasons about the answer without teaching a new fact.
- Impeccable asks to put design questions to the owner. The owner authorized autonomous decisions, and the spec fixes the look, so I asked nothing.

**Shared parts:** the change stays inside `NumericQuestion` (`NumericQuestion.astro` and its doc comment). `Question.astro`, `RevealedPart.astro`, `question-element.ts`, `numeric-question-element.ts` and `split-at-rule.ts` are unchanged, so `SingleChoice`'s and `OpenQuestion`'s catalog states needed no re-check.

**Left undone:** nothing.
