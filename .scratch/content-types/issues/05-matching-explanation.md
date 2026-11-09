# 05: A matching's explanation

Status: ready-for-agent
Blocked by: 03 (Matching); [Question explanations 02](../../question-explanations/issues/02-single-choice-explanation.md)

Spec: [Content types](../spec.md) › Writing one and Checking; [Question explanations](../../question-explanations/spec.md) for what an explanation holds, how it looks and when it shows.

**What to build:** after a matching's items, a second `---` between blank lines can be followed by one **explanation** (`GLOSSARY.md`: one per question, or one per matching). It holds what any explanation can, and shows once the set's last item locks, right or wrong, under the same rule and caption heading as a `SingleChoice`'s or `NumericQuestion`'s, after the item rows. Before that the page shows nothing of it. It is content, never artifact state ([ADR 0001](../../../docs/adr/0001-artifact-state-stores-answers-only.md)). Reuse the explanation Question explanations builds rather than drawing a second one.

This is design-system work: do it in a local session, through impeccable (`design-system/CLAUDE.md`).

- [ ] A matching with a second `---` and an explanation builds; a second `---` with nothing after it fails with a component error naming `Matching`, tested at the `pnpm check` seam; a matching without one builds as before.
- [ ] On the page, tested at the store seam: the explanation stays hidden while any item is unanswered, shows once the last item locks (checked here, or loaded from the device copy or the server), hides again on Start over, and, when an added item reopens an answered set, hides until that item locks too. Focus doesn't move when it appears.
- [ ] In print it shows only once every item is locked, as an explanation does elsewhere; a figure inside it is unnumbered.
- [ ] `Matching`'s doc comments say how to write the explanation and that it shows once every item locks; `pnpm components` regenerates `COMPONENTS.md`.
- [ ] `DESIGN.md` › Questions says the matching's explanation follows its rows and shows once the last item locks.
- [ ] The `artifact` skill, in the same commit, since `pnpm check` reports the new failure: its `Matching: …` failure line covers the empty explanation, and "Ask questions that test understanding" applies its explanation guidance to a matching.
- [ ] The catalog's questions page shows a matching with an explanation, unanswered (hidden) and fully locked (shown).
- [ ] Shared parts: whatever of the explanation's rendering this reuses reaches `SingleChoice` and `NumericQuestion` (and `OpenQuestion` through `Question.astro` and `split-at-rule.ts`); if this changes it, the closing comment records their explanation states on the catalog checked with the same evidence.

## Comments

### 2026-11-09: from Question explanations 02

Implementer of [Question explanations 02](../../question-explanations/issues/02-single-choice-explanation.md#comments). The explanation's markup is `Question.astro`'s `<div class="question-explanation" hidden>` around a `RevealedPart` ("Explanation" / "Explicação") with `margin-block-start: var(--space-3)`. A matching isn't rendered through `Question.astro`, so render the same wrapper and part after the item rows (or move that block into a small shared part both use). The showing lives in `QuestionElement.attributeChangedCallback` (`question-element.ts`): it finds `:scope > form > .question-explanation` and sets `hidden` unless the element's own `data-status` is `saved` or `answered-elsewhere`. That is per question. A matching needs the box-level rule (shown only when every item's `QuestionAnswer` is locked), so put it in the matching's box, keyed on the same two statuses, rather than in `QuestionBox` (Content types 02's note). The empty-explanation message for `SingleChoice` is "write the explanation after `---`, or leave out the `---`".

### 2026-11-09: from 03

Implementer of [03](03-matching.md#comments). Where the explanation goes in:

- **Parsing:** `matchingParts` in `design-system/src/matching.ts` splits at the first `<hr>` (`splitAtRule`), takes the items' `<ul>` at the start of what follows, and throws `Matching: end it with the items' bulleted list: nothing may follow it` for anything after it. Replace that with a second `splitAtRule` on the rest, and the empty-explanation error; the test is `tests/check/reporting.test.ts` › "a matching with a paragraph after its items".
- **Rendering:** `Matching.astro` renders through `Question.astro` with `kind="matching"`, whose props type gives the matching branch `explanation?: never`. Allow `explanation` there and `Question.astro` already renders the hidden `.question-explanation` after the box's fieldset, so after the rows.
- **Showing:** `QuestionBox` (`question-element.ts`) now calls `protected answersShown(shown)` with each answer's `ShownAnswer | undefined` on every store change, and `Matching` (`matching-element.ts`) overrides it for the rows' marks. Every item is locked exactly when each entry has `status` `saved` or `answered-elsewhere`; the box's own `data-status` is `saved` only when all are saved, so key the explanation on the entries, not on the box's attribute.
- **Catalog:** `catalog/questions.mdx` has the matching between the numeric and the open question, with ids and answers in `catalog/states.ts` (`matchingAnswers`); the `question-added` state reopens its last item.
