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
