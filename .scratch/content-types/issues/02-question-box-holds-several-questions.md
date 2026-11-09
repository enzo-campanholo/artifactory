# 02: Let one question box hold several questions

Status: claimed
Blocked by: [Question explanations 01](../../question-explanations/issues/01-question-revealed-part.md)

Spec: [Content types](../spec.md) › Behaviour: the matching, and Shared parts. A prefactor for 03: no behaviour changes.

**What to build:** today one question box is one question. The box (its header, prompt, Check button, status and recovery line) and the question's answer on the page (reading and showing the response, checking and saving it, locking with a mark, naming itself "Questão N", reopening when an attempt reopens it, the restored-answer and answered-elsewhere rules) are one element, and the question's markers sit on the box. A matching (`GLOSSARY.md`) needs one box whose single Check saves several questions, each item locking with its own mark on its own row. Separate the two, so a box can drive one question (every kind today, unchanged) or several (the matching, in 03), and the answer logic exists once, not copied into the matching.

Make the change easy, then make the easy change: this ticket only moves code. `SingleChoice`, `NumericQuestion` and `OpenQuestion` look, read out and behave exactly as before, and the built page keeps each question's markers where the build reads them, so the question manifest, the questions block and question numbering are unchanged.

This touches shared question parts (`Question.astro`, `question-element.ts`, `question-markers.ts`), so it is design-system work: do it in a local session, through impeccable (`design-system/CLAUDE.md`). Question explanations' tickets change the same parts. The edge to Question explanations 01 exists only because both prefactors rewrite the same seam of the question frame, so their rewrites don't conflict; nothing here depends on its behaviour. Its later tickets are file overlap, not a dependency: whichever lands second rebases.

- [ ] The answer on the page can be driven for one question inside a box that holds others, with the box's Check submitting, enabling and locking for all of its questions, and the status and recovery line belonging to the box.
- [ ] Every existing test at the store seam passes with its assertions unchanged (each question kind's behaviour, attempts, the stopping point, Next question); only a test's mounting markup may change, if the element's parts move.
- [ ] The `pnpm check` seam's built-site tests (question manifest, Library questions block, question numbers) pass unchanged.
- [ ] Shared parts: these reach `SingleChoice`, `NumericQuestion` and `OpenQuestion`. The closing comment records each one on every catalog state page (unanswered, model answer shown, saving, saved right and wrong, not saved, answered elsewhere, signed out, attempt switched, started over …) checked before and after with the same evidence, in English and `?lang=pt-BR`, and in print.
- [ ] No doc comment or `Props` changes, so `COMPONENTS.md` is unchanged; if one does, `pnpm components` regenerates it.

## Comments

### 2026-11-09: from Question explanations 01

Implementer of [Question explanations 01](../../question-explanations/issues/01-question-revealed-part.md#comments). The model answer now renders through `design-system/src/RevealedPart.astro` (`.question-revealed`, `-heading`, `-content`), and `open-question-element.ts` focuses `.question-revealed` on the owner's reveal. If the box/question split moves the model answer, keep it inside the part. Explanations (Question explanations 02, 03) use the same part.
