# 06: Lock a question to shoot its explanation

Status: ready-for-agent
Blocked by: 03 (Reveal a model answer to shoot what it holds); [Question explanations 02](../../question-explanations/issues/02-single-choice-explanation.md); [Question explanations 03](../../question-explanations/issues/03-numeric-question-explanation.md); [Content types 05](../../content-types/issues/05-matching-explanation.md)

Spec: [What `pnpm look` captures](../spec.md) › Content behind a hidden part

**What to build:** an agent who puts a drawing in a question's explanation sees it rendered in look's shots. To reveal an explanation the way the owner would, look locks the question. In `SingleChoice` it picks the first option and checks it. In `NumericQuestion` it submits a number. In a `Matching` ([Content types](../../content-types/spec.md)), whose explanation shows once its last item locks, it picks the first option for every item and checks the set, the same reveal as a `SingleChoice`'s. A right answer and a wrong one both show the explanation. Look waits for the question to come alive first, since a question stays inert until the store starts. Then it shoots each item in the explanation alone, as ticket 03 does for a model answer: every step of a Stepper, and a Stage as written and at its first option or example.

The lock happens on the build's throwaway state, so it never reaches the owner's answers. The question stays locked afterwards, because only "start over" undoes a lock, and later shots don't depend on it. The item's line names its location in place of a number: `… (inside the explanation of Questão 4)`, with the question's name read from the accessibility tree as in ticket 03; a matching is named by its header as the page shows it (`… (inside the explanation of Questões 3–5)`). Once ticket 04's failure rule is in, an item still unrendered after the lock fails the case as it says.

- [ ] An item inside a `SingleChoice` explanation is shot once look has locked the question with its first option. An item inside a `NumericQuestion` explanation is shot once look has submitted a number. An item inside a matching's explanation is shot once look has chosen the first option for every item and checked the set.
- [ ] The lock runs on throwaway state and saves nothing anywhere, and the question stays locked.
- [ ] The item's printed line and its `results.json` entry name its location (`inside the explanation of <question name and number>`).
- [ ] Seam 1 test, a new opt-in Look fixture: a figure inside a `SingleChoice` explanation and one inside a matching's explanation are each shot once the question or the set locks (exit 0, their captures at both widths, their locations printed).
- [ ] In the same commit, the `artifact` skill's **Look** section adds explanations next to model answers in what's shot, and `stage.md` › **Look**'s reveal line covers "a model answer or explanation".

## Comments

### 2026-11-09: where ticket 04 put the failure rule

Implementer of [ticket 04](04-fail-on-an-item-look-cant-shoot.md#comments). In `scripts/look.ts`, `shootRevealed` checks an item is rendered (`checkVisibility()`, a sized box) inside a local `shootRendered(after)`, after the model answer opens and before `kinds[item.kind].shoot`. An unrendered item comes back as `{ problem }`, and the loop passes it to `couldNotShoot`, which fails the case without stopping it. For an explanation, lock the question first, then call `shootRendered(" after its reveal")` (or a wording that names the lock), so an item still unrendered after the lock fails the same way. `place` comes from `item.modelAnswer?.location`, so an explanation's location needs its own place in `Item` or a more general field.
