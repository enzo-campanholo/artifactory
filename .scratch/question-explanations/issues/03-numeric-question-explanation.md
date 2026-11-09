# 03: A NumericQuestion shows its explanation once its answer locks

Status: ready-for-agent
Blocked by: 02

Spec: [Question explanations](../spec.md). The decisions are in the map ticket's `## Answer` (`artifact-generation-gaps` 01); don't reopen them.

**What to build:** An agent writes a `NumericQuestion`'s question, then a blank line, `---`, a blank line and its **explanation**, typically the worked solution the brief gives. It shows and hides exactly as a `SingleChoice`'s does since 02 (on a locked answer, saved or answered elsewhere, right or wrong, wherever the answer came from; hidden before, while saving, not saved or lost to a sign-out, after starting over, without JavaScript, and in print unless locked), through the same shared parts. It comes after everything the lock already shows: after the "Resposta certa" / "Right answer" line on a wrong answer, and after the locked field (and its unit) on a right one. The right-answer line keeps its place and stays the field's description; the explanation is never part of that description. A question with no `---` builds and behaves as today.

Design-system work: run it in a local session with impeccable (`design-system/CLAUDE.md`).

- [ ] The question is what comes before `---`; a question that is empty before it still fails as "write the question inside it", and a `---` with nothing after it fails the build with a component error naming `NumericQuestion`, reported by `pnpm check` at the entry under `build`. Tested at the `tests/check` seam.
- [ ] On a wrong answer the explanation comes after the right-answer line, and on a right answer after the locked field; the field's `aria-describedby` still names the unit and the right-answer line only. Asserted at the `tests/store` seam, with the lock, restore and start-over cases 02 covers for `SingleChoice` repeated only where `NumericQuestion` places or wires something of its own.
- [ ] Nothing about it reaches artifact state, the question manifest or the store (ADR 0001).
- [ ] `DESIGN.md` › Questions gives the explanation's place in a numeric question, after the right-answer line or the locked field.
- [ ] `NumericQuestion`'s doc comment says how to write the explanation (its example shows a worked one), that it shows once the answer locks, and that it never teaches a fact for the first time; `pnpm components` regenerates `COMPONENTS.md`.
- [ ] The `artifact` skill, in the same commit: "Ask questions that test understanding" says to write an explanation whenever the brief or source material gives a worked solution for a numeric answer, with every fact the owner must learn also in the text; the Build failures line on `NumericQuestion: …` messages covers the empty explanation.
- [ ] The catalog's questions page gives its `NumericQuestion` an explanation, shown hidden on `/catalog/unanswered/`, after the locked field on a right answer and after the right-answer line on `/catalog/saved-wrong/`, at phone and desktop widths, in both languages and in print.
- [ ] Shared parts: if the question frame or the shared question element changes again, check `SingleChoice`'s and `OpenQuestion`'s catalog states with the same evidence; otherwise say the change stays inside `NumericQuestion`.
