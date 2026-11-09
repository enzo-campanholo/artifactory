# 02: A SingleChoice shows its explanation once its answer locks

Status: ready-for-agent
Blocked by: 01

Spec: [Question explanations](../spec.md), sections Writing one, When it shows, How it looks and Documentation. The decisions are in the map ticket's `## Answer` (`artifact-generation-gaps` 01); don't reopen them.

**What to build:** An agent writes a `SingleChoice`'s question and options as today, then a blank line, `---`, a blank line and one **explanation** (`GLOSSARY.md`): paragraphs, math, code, lists and figures, as a model answer can hold. The owner sees nothing of it until their answer locks. Once it does, right or wrong, the explanation appears after the options (after the ticked right option on a wrong answer) under a 1px rule with the caption heading "Explicação" / "Explanation" in the artifact's main language, drawn by the revealed part from 01. Focus stays where it was; the status still announces right or wrong and the explanation is next in reading order. Starting over hides it again. A question with no `---` builds and behaves as today. This ticket also builds the frame's shared showing and hiding of an explanation, which `NumericQuestion` reuses in 03.

"Locks" means what the code, `DESIGN.md` › Questions › States and `GLOSSARY.md` › Answer mean by a locked answer: saved, or answered elsewhere, the states that show the mark and tick the right option. While the answer is saving, not saved or lost to a sign-out, it isn't locked, so the explanation stays hidden, exactly as the right option's tick does.

Design-system work: run it in a local session with impeccable (`design-system/CLAUDE.md`).

- [ ] The options are the numbered list at the end of what comes before `---`; a numbered list, a figure or code inside the explanation is never taken for an option, and the existing option errors still read correctly when an explanation follows.
- [ ] A `---` with nothing after it fails the build with a component error naming `SingleChoice` and saying what to write, as `OpenQuestion` does for an empty model answer; `pnpm check` reports it at the entry under `build`. Tested at the `tests/check` seam.
- [ ] Before the answer locks the page shows nothing of the explanation: no heading, no rule, no disabled button. This holds in the page's HTML before its script runs and with no JavaScript (the question is inert), and in print.
- [ ] It shows on a locked answer however the answer got there: checked on this page, restored from the device copy, or loaded from the server or another device; and on both a right and a wrong answer. Starting over, or switching to an attempt that hasn't answered the question, hides it. While the answer is saving, not saved or lost to a sign-out it stays hidden, as the right option's tick does, and it shows once the save succeeds. Its shown or hidden state is visible on the element itself, not only through CSS, so the `tests/store` seam asserts each of these cases.
- [ ] In print it shows only under a locked answer, as an opened model answer does.
- [ ] A visitor's page behaves the same on throwaway state (catalog `/catalog/visitor/`).
- [ ] Nothing about it reaches artifact state, the question manifest or the store: the saved answer is the same with or without an explanation (ADR 0001).
- [ ] The built page of a pt-BR and of an English artifact carries the explanation after the options with its heading in that language, hidden; asserted on the build's deployable output at the `tests/check` seam.
- [ ] `DESIGN.md` › Questions describes the explanation's look, its place after the options and the ticked right option, and when it shows.
- [ ] `SingleChoice`'s doc comment says how to write the explanation (its example shows one), that it shows once the answer locks, and that it reasons about the answer but never teaches a fact for the first time, since an owner who skips the question never reads it; `pnpm components` regenerates `COMPONENTS.md`.
- [ ] The `artifact` skill, in the same commit: "Ask questions that test understanding" says to write an explanation whenever the brief or source material gives a reason for an option, with reasons for wrong options in its prose ("b) confunde …"), and every fact the owner must learn also in the text; "Explanations stay in paragraphs." in "State definitions and results as statements" is reworded so the skill uses **explanation** only in the glossary's sense; the Build failures list of `SingleChoice: …` messages covers the empty explanation.
- [ ] The catalog's questions page gives its `SingleChoice` an explanation, so `/catalog/unanswered/`, `/catalog/saved-right/`, `/catalog/saved-wrong/`, `/catalog/started-over/` and the others show it hidden, after a right answer and after a wrong one with the ticked option, at phone and desktop widths, in both languages and in print.
- [ ] Shared parts: the question frame and the shared question element reach `NumericQuestion` and `OpenQuestion`, so check their catalog states with the same evidence; `OpenQuestion`'s model answer and own-mark buttons are unchanged. Reuse the shared rule split unchanged; if it must change, it also reaches `OpenQuestion` and `Statement` (an example's solution): check both.

## Comments

### 2026-11-09: from 01

Implementer of [01](01-question-revealed-part.md#comments). The revealed part is `design-system/src/RevealedPart.astro`: `<RevealedPart heading={{ en: "Explanation", pt: "Explicação" }} content={html} />` draws the rule, the caption heading and the trimmed content (`.question-revealed`, `-heading`, `-content`). Leave out `tabindex`: only the model answer takes focus, and the spec says focus doesn't move for an explanation. The part has no top margin; the model answer's `--space-3` sits on its `<details>`, so give the explanation's wrapper its own `margin-block-start: var(--space-3)` (or move the gap onto the part for both, and recheck the closed model answer's summary).

### 2026-11-09: from Content types 02

Implementer of [Content types 02](../../content-types/issues/02-question-box-holds-several-questions.md#comments). `question-element.ts` is now `QuestionBox` (the form, Check, status and recovery line) driving `QuestionAnswer`s (`question-answer.ts`), and `QuestionElement` is the one-question box, so `SingleChoice` behaves as before. Locking and reopening still land as `data-status`/`data-mark` on the `SingleChoice` element itself (set by its `QuestionAnswer`), so its `attributeChangedCallback`, which ticks the right option today, sees every lock, restore, answered-elsewhere, Start over and attempt switch: the explanation can show and hide there, alongside the tick, keyed on the same "locked" test as `wrongAnswerLocked` without the mark. Keep the shared showing in `QuestionElement` or a helper it calls, not in `QuestionBox`: a matching's explanation (Content types 05) shows once its last item locks, a box-level rule.
