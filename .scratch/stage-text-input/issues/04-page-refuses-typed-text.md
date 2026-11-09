# 04: The page refuses typed text that breaks its field's rule

Status: ready-for-agent
Blocked by: 02, 03

Spec: [Stage text input](../spec.md), section "Refusals". The decisions are in [Typed words in a Stage](../../artifact-generation-gaps/issues/10-typed-words-in-a-stage.md) › Answer.

**What to build:** text that breaks its field's rule never reaches the build. The rule is the same one 03 gives the check. When the owner types or pastes such text and presses Start, the page refuses it the way it refuses a number:

- the field is drawn dashed and takes the focus back, and its description names the reason;
- the step's line states the field's whole rule, not which symbol broke it;
- the content goes back as written.

Nothing is truncated: pasted text longer than `maxLength` stays whole in the field and shows whole. In a Stage with a text field, a failed run's line reads "…para esta entrada." / "…for this input.", and it and a run past 200 steps end with "Tente outra entrada." / "Try another input.". Number-only Stages keep today's lines.

- [ ] The step's line takes the spec's four shapes, in both languages:

  | Field | pt-BR | English |
  | --- | --- | --- |
  | alphabet, `minLength` 0 | Digite até 12 símbolos, só a e b, para w. | Type up to 12 symbols, only a and b, for w. |
  | alphabet, `minLength` 1 | Digite de 1 a 12 símbolos, só a e b, para w. | Type 1 to 12 symbols, only a and b, for w. |
  | no alphabet, `minLength` 0 | Digite até 40 caracteres para t. | Type up to 40 characters for t. |
  | no alphabet, `minLength` 2 | Digite de 2 a 40 caracteres para t. | Type 2 to 40 characters for t. |

  - The alphabet lists its symbols with commas and a final "e" / "and" ("só 0, 1 e □").
  - The field is named by its `label` when it has one.
- [ ] Lengths count code points after NFC, so `é` is one symbol however it was typed. An empty field is the empty word: taken with `minLength` 0 and refused with `minLength` 1.
- [ ] The first refused field takes the focus, as with number fields. In a mixed Stage, a refused number field keeps today's line.
- [ ] In a Stage with a text field, the too-many-steps and failed-run lines end "Tente outra entrada." / "Try another input.". The failed-run line's first half mustn't speak of numbers either: "…para esses números" would be wrong. It reads "…para esta entrada." / "…for this input.".
- [ ] Number-only Stages' lines are unchanged word for word.
- [ ] **The catalog's Stage page** gains the refused state of a text field. The catalog script types a word outside the alphabet and presses Start, as "Refusing a number" does. This goes through impeccable in a local session (`design-system/CLAUDE.md`).
  - Check the refusal in a browser on the catalog, in English and with `?lang=pt-BR`: the dashed field, the focus, the line and the description. Also check a pasted over-long word staying whole and a decomposed `é` counted as one. No seam owns the Stage page's behaviour.
- [ ] `DESIGN.md` › Stage gains the text field's refusal.
- [ ] The `Stage`'s **Typed input** doc comment gains the refusal line, then `pnpm components`. Update the `artifact` skill's custom-build rules too if they describe the page's refusal.
- [ ] **Shared parts:** stays inside the Stage, since the refused field's dashed box is the number field's own style. "Refusing a number" on the catalog, and a refused number in the sample artifact (`rsa-from-scratch`), show exactly as before, with the same evidence as the new state.

## Comments

### 2026-11-09: notes from Stage text input 01

The page's refusal is `#type` in `stage-element.ts`. It walks `stageFields(this)`, the definitions on the page, and refuses the first field `fieldProblem` (`step-applier.ts`) refuses, with the line from `texts.refusedNumber(label ?? name, min, max)`. The text rule and its line join there, chosen by the definition's `kind`. A before/after capture of every Stage's refusals (record and PNG hashes, light and dark, en and pt-BR, catalog and `rsa-from-scratch`) is in the shared notes' `capture-stages.ts` pattern; 01 extended it with refusals (`aria-invalid`, `aria-describedby`, focus, border style).
