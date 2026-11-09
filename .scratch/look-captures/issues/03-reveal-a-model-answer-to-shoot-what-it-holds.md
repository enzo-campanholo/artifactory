# 03: Reveal a model answer to shoot what it holds

Status: claimed
Blocked by: 02 (Shoot one-block code Steppers at every step)

Spec: [What `pnpm look` captures](../spec.md) › Content behind a hidden part

**What to build:** an agent who puts a drawing in an `OpenQuestion`'s model answer sees it rendered in look's shots, and no longer moves it out of the model answer to see it. For each item inside a model answer, look opens the model answer's `<details>` and shoots the item alone, exactly as it would anywhere else: a Stepper at every step, a Stage as written and then at its first option or example. Then look closes the model answer again.

An item inside a question is unnumbered, so the item's line names where it sits in place of a number. Look reads the question's number from the accessibility tree, as it reads figure numbers, so the name comes in the artifact's main language: `03-figure (inside the model answer of Questão 2)`, or `… of Question 2` in an English artifact. `results.json` records the same location.

Ticket 04's failure rule comes after this ticket and runs after the reveal: it fails the case for an item still unrendered once revealed.

Notes:

- The model answer's summary stays disabled until an answer is written, so look opens the `<details>` itself. This happens on the build's throwaway state and saves nothing. The question's text field becomes read-only when the model answer opens and stays read-only after it closes. Later shots don't depend on that field.
- Until [Question explanations](../../question-explanations/spec.md) makes figures inside questions unnumbered, an opened figure's caption may show a number in the shot. Look's label comes from the location, not from that caption.

- [ ] An item inside a model answer is revealed, then shot alone at both widths: every step of a Stepper, and a Stage as written and at its first option or example.
- [ ] Its printed line and its `results.json` entry name its location (`inside the model answer of <question name and number, as the page shows it>`) in place of a number.
- [ ] Once the item's shots are done, the model answer is closed again, and `results.json` holds an assertion saying so.
- [ ] Seam 1 test, a new opt-in Look fixture: a figure inside a model answer is shot revealed (exit 0, its captures at both widths, outcome `captured-awaiting-visual-review`). The printed line names its question, and the model answer is closed afterwards.
- [ ] In the same commit, the `artifact` skill's **Look** section says items inside a model answer are shot: look reveals them as the owner would and labels them with the question's number. `stage.md` › **Look** gains one line saying a Stage inside a model answer is revealed first.

## Comments

### 2026-11-08: where the reveal goes, from tickets 01 and 02

Delegator, copied from [ticket 02's comment](02-shoot-one-block-code-steppers-at-every-step.md#comments). The reveal goes around `kinds[item.kind].shoot(…)` in look's main loop. `item.element` is the element shot (a Stage's frame, not `artifact-stage`), so `item.element.closest("details")` finds the model answer for every kind. Ticket 05's hiding of fixed and sticky layers sits inside `shoot`, so a revealed item passes through it too.
