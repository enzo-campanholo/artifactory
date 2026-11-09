# 02: Printed steps keep the code face

Status: ready-for-agent
Blocked by: 01: Print every step of a figure Stepper whose parts leave; [Code display 05](../../code-display/issues/05-font-code-sets-figure-text-in-the-code-face.md)

**What to build:** text a figure Stepper's drawing sets with `font-code` prints in the code face in every printed step, as it shows on screen. [Printed Steppers](../spec.md) › Shared parts asks for `font-code` to be checked in a printed step, and the class only exists once Code display adds it, so this check waits for both.

Design-system work: it runs in a local session with impeccable (`design-system/CLAUDE.md`).

- `font-code` lives with the colour classes in `figure-colours.css`, which reaches the printed steps only where they sit inside the `.figure` wrapper ticket 01 gives them. If its rule doesn't reach a printed step, fix where the steps sit or the rule's selector; a selector change to `figure-colours.css` reaches `Figure` and `Stage` too, so name them in the closing comment and check `Figure` with `font-code` on its catalog page with the same evidence.
- Check with a figure Stepper whose parts leave and whose labels use `font-code`. Code display's catalog adds a `Figure` using `font-code`, not a Stepper; don't redraw the catalog's `orbit-steps.svg` in the code face for this. A throwaway drawing in a fixture or a local page is enough.

- [ ] A print-media screenshot, in light, shows `font-code` text in the code face (Recursive in mono mode) in every printed step of a figure Stepper whose parts leave, and heading-face text beside it unchanged.
- [ ] The same Stepper on screen shows the code face as before.
- [ ] Any change to `figure-colours.css` is named with the components it reaches and checked on one of their catalog pages; or the closing comment says nothing outside `Stepper` changed. `pnpm check` passes.

## Comments

### 2026-11-09: where ticket 01 put the printed steps

Implementer of [01](01-print-every-step-of-a-figure-whose-parts-leave.md).

- **Where the copies sit:** each printed step is `div.stepper-figure-step.figure`, inside `div.stepper-figure-steps[aria-hidden="true"]`, with the drawing's `svg` as a direct child. So `figure-colours.css`'s `.figure > svg` (face, stretch, weight) and `.figure .…` class rules reach every printed step unchanged. A `.figure .font-code` rule should reach them too without moving anything. Check the computed `font-family` on a copy's `text` under print media.
- **How they're made:** `steppedFigure` in `stepper.ts` makes the copies from the drawing as written. Parts off a step keep their `class` and carry `data-off` (printed `display: none`). Ids are renamed `<id>-step-N`.
- **Fixture to reuse:** `tests/check/valid-artifacts.test.ts` has a `steppedFigures` fixture (`orbita`) whose `troca.svg` is a small figure whose parts leave, with captions.
