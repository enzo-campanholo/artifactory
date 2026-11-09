# 04: Fail on an item look can't shoot

Status: claimed
Blocked by: 03 (Reveal a model answer to shoot what it holds)

Spec: [What `pnpm look` captures](../spec.md) › Never a silent skip, never a shot of the wrong thing

**What to build:** look never skips an item without a word and never shoots the wrong thing. When look has selected an item it can't shoot, it fails the case with an assertion naming the item: its number (or, for an item inside a question, its location), its kind, and its `alt` or caption. Look can't shoot an item when:

- it's a Stepper in a form look doesn't know, or
- it isn't rendered when its turn comes, after any reveal: `checkVisibility()` is false, or its box has no size.

Look never shoots such an item. A failed case makes `pnpm look` exit 1, so a failure is never mistaken for `captured-awaiting-visual-review`. Look prints no separate "found but not shot" list, because under these rules the only item found but not shot is a failure. The failure names every item look couldn't shoot in the run, not only the first, so one run shows everything to fix.

Ticket 03 already reveals an item inside a model answer before shooting it, so this check runs after the reveal, and an item still unrendered then is named by its location. The sample has no item inside a question, and `pnpm look rsa-from-scratch` still exits 0.

- [x] A selected item that isn't rendered (`checkVisibility()` false, or a zero-size box) fails the case with an assertion naming its number or location, its kind and its `alt` or caption, and no file is written for it.
- [x] A Stepper whose form look doesn't know fails the same way.
- [x] Every item look couldn't shoot in the run is named, not only the first.
- [x] An item inside a model answer still unrendered after ticket 03's reveal fails the same way, named by its location.
- [x] `pnpm look` exits 1, and the case's outcome is `failed`.
- [x] Seam 1 tests, new opt-in Look fixtures. In the first, a fixture script keeps an item unrendered (as the stuck-Stage fixture blocks its forward button): the case fails with exit 1, an assertion names the item, and none of its files are among the captures. In the second, a Stepper's form is made unrecognisable: it fails the same way.
- [x] In the same commit, the `artifact` skill's **Look** section says a failed case names the items look found but couldn't shoot. It says to fix the item, or to report a look bug if the item is fine, and never to move content just to get it shot.

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

### 2026-11-09: implemented, awaiting review

Implementer, branch `t3/fail-on-unshootable-look-items` (worktree `t3-635122f9`), from `gaps-implementation` at `d2c58dd`. Commits: `d9bf1d0` (claim) and `b0ff59c` (look, tests and the skill's **Look** section, together).

- **What changed in `scripts/look.ts`:** `resolveItem`'s two silent fallbacks are gone. A Stepper with none of `.stepper-boards`, `.stepper-code` or `.stepper-figure` resolves to `stepper-unknown`, and a Stage without `:scope > figure` to `stage-unknown`. Their `kinds` entries carry a `problem` in place of a `shoot`, so they can't be shot as a known form. `shootRevealed` checks every item it would shoot, after the model-answer reveal and before `shoot`: `checkVisibility()` false, or a box with no width or height, means it isn't shot. The model answer still closes on that path, and `model answer closed again` is still asserted.
- **The failure:** each item look couldn't shoot gets an assertion `NN-<stem>: look can shoot it`, expected `{ place, kind, description, problem: null }`, actual the same with `problem` set to `a Stepper form look doesn't know`, `a Stage form look doesn't know`, `not rendered (checkVisibility() is false | its box has no size)` or `not rendered after its reveal (…)`. It also prints a stderr line, `pnpm look: look-393: couldn't shoot 02-figure (Figure 1.2), a figure: not rendered (its box has no size); Literal flattened square.` The case's outcome becomes `failed`, and look goes on to the next item, so every such item in the run is named. `pnpm look` exits 1. No file is written for the item, and it's left out of the printed listing and `observed.figures`.
- **Two side fixes this needed:** a refused Stage no longer overwrites an earlier `failed` outcome with `refused`, which would have exited 0. "has nothing for look to shoot" now prints only when every case is `not-applicable`, not whenever nothing was shot, so a run whose every item failed doesn't claim there was nothing to shoot.
- **Description:** every Stepper kind now describes itself through one `describeStepper`: its `alt`, or else its captions. For the existing forms this prints the same as before (the sample's output is unchanged). It means an unknown-form Stepper is named by its `alt` when it has one.
- **Place:** an item that isn't rendered can lack a number, since CSS counters and the accessibility tree skip `display: none`. Then `place` is `""` and the line has no parentheses. A Stepper has no figure number, so it always prints that way, as it does in the listing.

Validation:

- Seam 1, new `opt-in Look failure evidence` in `tests/check/browser-verification.test.ts`. `look-unrendered` has three Figures: one shown, one squashed to zero height by a script, and one inside a model answer that a script sets to `display: none`. It exits 1, both cases are `failed`, both unshootable items are named by their assertions and printed lines (`Figure 1.2`; `inside the model answer of Question 1`), the model answer is closed again, and only `01-figure-<width>.png` is captured. `look-unknown-stepper`'s script renames the figure Stepper's `.stepper-figure` class. It exits 1, both cases are `failed` with no captures, and the `stepper-unknown` assertion and line name its `alt`. Both were red first: the first crashed on "Node has 0 height" with no item named, and the second printed "has nothing for look to shoot".
- `ARTIFACTORY_BROWSER_ACCEPTANCE=1 scripts/heavy pnpm exec vitest run tests/check/browser-verification.test.ts`: 27 passed, every opt-in Look test included.
- `scripts/heavy pnpm look rsa-from-scratch`: exit 0, same seven items and lines as before.
- Full `scripts/heavy pnpm check`: see the next comment.

Left undone: none in this ticket's scope. Notes for [06](06-lock-a-question-to-shoot-its-explanation.md#comments) and [07](07-shoot-block-per-step-code-steppers.md#comments) are on those tickets.
