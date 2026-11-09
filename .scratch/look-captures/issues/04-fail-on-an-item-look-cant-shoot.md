# 04: Fail on an item look can't shoot

Status: claimed
Blocked by: 03 (Reveal a model answer to shoot what it holds)

Spec: [What `pnpm look` captures](../spec.md) › Never a silent skip, never a shot of the wrong thing

**What to build:** look never skips an item without a word and never shoots the wrong thing. When look has selected an item it can't shoot, it fails the case with an assertion naming the item: its number (or, for an item inside a question, its location), its kind, and its `alt` or caption. Look can't shoot an item when:

- it's a Stepper in a form look doesn't know, or
- it isn't rendered when its turn comes, after any reveal: `checkVisibility()` is false, or its box has no size.

Look never shoots such an item. A failed case makes `pnpm look` exit 1, so a failure is never mistaken for `captured-awaiting-visual-review`. Look prints no separate "found but not shot" list, because under these rules the only item found but not shot is a failure. The failure names every item look couldn't shoot in the run, not only the first, so one run shows everything to fix.

Ticket 03 already reveals an item inside a model answer before shooting it, so this check runs after the reveal, and an item still unrendered then is named by its location. The sample has no item inside a question, and `pnpm look rsa-from-scratch` still exits 0.

- [ ] A selected item that isn't rendered (`checkVisibility()` false, or a zero-size box) fails the case with an assertion naming its number or location, its kind and its `alt` or caption, and no file is written for it.
- [ ] A Stepper whose form look doesn't know fails the same way.
- [ ] Every item look couldn't shoot in the run is named, not only the first.
- [ ] An item inside a model answer still unrendered after ticket 03's reveal fails the same way, named by its location.
- [ ] `pnpm look` exits 1, and the case's outcome is `failed`.
- [ ] Seam 1 tests, new opt-in Look fixtures. In the first, a fixture script keeps an item unrendered (as the stuck-Stage fixture blocks its forward button): the case fails with exit 1, an assertion names the item, and none of its files are among the captures. In the second, a Stepper's form is made unrecognisable: it fails the same way.
- [ ] In the same commit, the `artifact` skill's **Look** section says a failed case names the items look found but couldn't shoot. It says to fix the item, or to report a look bug if the item is fine, and never to move content just to get it shot.

## Comments

### 2026-11-08: two silent fallbacks to replace, from ticket 02

Delegator, copied from [ticket 02's comment](02-shoot-one-block-code-steppers-at-every-step.md#comments). Look selects every Stepper and Stage by element now, so every one reaches `resolveItem`, which has two silent fallbacks this ticket replaces with a failure:

- A Stepper with neither `.stepper-boards` nor `.stepper-code` resolves to `stepper-figure`, so an unknown form is shot as a figure Stepper and described "no drawing and no caption". That includes [Code display 04](../../code-display/issues/04-a-stepper-with-one-code-block-per-step.md)'s block-per-step form until ticket 07 adds its kind.
- A Stage without `:scope > figure` is shot as the `artifact-stage` element itself.

### 2026-11-09: where ticket 03 left the reveal

Implementer of [ticket 03](03-reveal-a-model-answer-to-shoot-what-it-holds.md#comments). For the failure rule:

- `resolveItem` sets `item.modelAnswer = { details, location }` for an item inside a model answer, and `shootRevealed` wraps `kinds[item.kind].shoot(…)`: it opens the `<details>` (waiting for its `toggle`), shoots, closes, then asserts `<name>: model answer closed again`. Put the rendered check (`checkVisibility()`, a sized box) inside `shootRevealed` after the open and before `shoot`, so it runs after the reveal for every item. Close the model answer again on that path too, so a later item in the same model answer starts from a closed one.
- An item's place is `item.modelAnswer?.location` (`inside the model answer of Question 2`), or the number `numberOf` reads. The failing assertion can name it from either, as the printed line does (`location ?? number`).
- To keep an item inside a model answer unrendered in a fixture, a script can hide it (`display: none` on the figure) after load: the reveal opens only the `<details>`, so the item stays unrendered.
