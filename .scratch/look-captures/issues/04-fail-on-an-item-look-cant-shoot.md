# 04: Fail on an item look can't shoot

Status: ready-for-agent
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
