# 02: Printed steps keep the code face

Status: resolved
Blocked by: 01: Print every step of a figure Stepper whose parts leave; [Code display 05](../../code-display/issues/05-font-code-sets-figure-text-in-the-code-face.md)

**What to build:** text a figure Stepper's drawing sets with `font-code` prints in the code face in every printed step, as it shows on screen. [Printed Steppers](../spec.md) › Shared parts asks for `font-code` to be checked in a printed step, and the class only exists once Code display adds it, so this check waits for both.

Design-system work: it runs in a local session with impeccable (`design-system/CLAUDE.md`).

- `font-code` lives with the colour classes in `figure-colours.css`, which reaches the printed steps only where they sit inside the `.figure` wrapper ticket 01 gives them. If its rule doesn't reach a printed step, fix where the steps sit or the rule's selector; a selector change to `figure-colours.css` reaches `Figure` and `Stage` too, so name them in the closing comment and check `Figure` with `font-code` on its catalog page with the same evidence.
- Check with a figure Stepper whose parts leave and whose labels use `font-code`. Code display's catalog adds a `Figure` using `font-code`, not a Stepper; don't redraw the catalog's `orbit-steps.svg` in the code face for this. A throwaway drawing in a fixture or a local page is enough.

- [x] A print-media screenshot, in light, shows `font-code` text in the code face (Recursive in mono mode) in every printed step of a figure Stepper whose parts leave, and heading-face text beside it unchanged.
- [x] The same Stepper on screen shows the code face as before.
- [x] Any change to `figure-colours.css` is named with the components it reaches and checked on one of their catalog pages; or the closing comment says nothing outside `Stepper` changed. `pnpm check` passes.

## Comments

### 2026-11-09: where ticket 01 put the printed steps

Implementer of [01](01-print-every-step-of-a-figure-whose-parts-leave.md).

- **Where the copies sit:** each printed step is `div.stepper-figure-step.figure`, inside `div.stepper-figure-steps[aria-hidden="true"]`, with the drawing's `svg` as a direct child. So `figure-colours.css`'s `.figure > svg` (face, stretch, weight) and `.figure .…` class rules reach every printed step unchanged. A `.figure .font-code` rule should reach them too without moving anything. Check the computed `font-family` on a copy's `text` under print media.
- **How they're made:** `steppedFigure` in `stepper.ts` makes the copies from the drawing as written. Parts off a step keep their `class` and carry `data-off` (printed `display: none`). Ids are renamed `<id>-step-N`.
- **Fixture to reuse:** `tests/check/valid-artifacts.test.ts` has a `steppedFigures` fixture (`orbita`) whose `troca.svg` is a small figure whose parts leave, with captions.

### 2026-11-09: what code display 05 left for this ticket

Implementer of [Code display 05](../../code-display/issues/05-font-code-sets-figure-text-in-the-code-face.md).

- **The rule:** `figure-colours.css` has `.figure .font-code { font-family: var(--font-mono); font-stretch: normal; font-variation-settings: "MONO" 1; }`, in `@layer components`, keeping the drawing's weight. Its selector already reaches 01's printed copies, which sit in `div.stepper-figure-step.figure`.
- **Already seen:** with a throwaway figure Stepper whose parts leave and whose labels use `font-code` (a stack machine: `push 2`, `push 3`, `add`, the stack's cells), print media in light showed every printed step's `font-code` text as `"Recursive Variable"` with `"MONO" 1` and its other text as Archivo, by computed style and screenshot. So this ticket should need no change to `figure-colours.css` or to where the steps sit; it still owns recording that evidence against its own checklist.
- **Capture script:** `capture-font-code.ts` in the pass's shared notes folder reads every printed copy's text faces; it expects the throwaway Stepper's `alt` to start "A stack machine".

### 2026-11-09: resolved

Implementer of this ticket.

- **Result:** a figure Stepper's printed steps already set `font-code` text in the code face: 01 put each printed step in `div.stepper-figure-step.figure`, and code display 05's `.figure .font-code` rule in `figure-colours.css` reaches it there. No change to `figure-colours.css`, `Stepper.astro`, `stepper.ts` or anywhere else in `design-system/`: nothing outside `Stepper` changed, and `Stepper` itself didn't either. The ticket adds a test only.
- **Commits:** `a4aa0fb` (claim), `41426c5` (test), this one (close).
- **Test:** `tests/check/valid-artifacts.test.ts` › figure Steppers in print › "sets a figure's code-face labels in the code face in every printed step, beside its other labels in the frame face". The `orbita` fixture's `troca.svg` gains a frame-face label (`pilha`) and a `font-code` label per step (`push`, `pop`). The test asserts each printed step's drawing sits directly in a `.figure` wrapper (which `.figure > svg` and `.figure .font-code` need) and shows its step's labels with their classes. It passed on first run, since 01 and 05 already provide the behaviour; with `figure` taken off the printed step's wrapper in `Stepper.astro`, it failed on `wrapper: false` for both steps, so it guards the place the rule reaches.
- **Browser evidence:** a throwaway figure Stepper (a stack machine: `push 2`, `push 3`, `add`, with stack cells that leave and a frame-face "Stack" heading, `font-code` on the instructions and cells) added to `catalog/components.mdx` for one build only, not committed. Print media, light: the screen figure is `display: none` and each of the three printed steps, under "1. Push 2." to "3. Add the top two.", computes every `font-code` text as `"Recursive Variable"`, `"MONO" 1`, weight 500, stretch 100%, and "Stack" as `"Archivo Variable"`, stretch 88%; the print screenshot shows the monospaced code beside the narrow Archivo heading. With `.figure .font-code` deleted from the live stylesheet, the same printed steps fall back to Archivo, so that rule is what sets them. Screen, light and dark, steps 1 to 3: the same faces, the printed copies `display: none`. No page errors.
- **Shared parts:** `figure-colours.css` and `InlineSvg.astro` reached and checked through the printed steps above; neither changed, so `Figure` and `Stage` are untouched (code display 05 checked `Figure` with `font-code` on its catalog page).
- **Decisions:** a test at `tests/check` on the built page's structure rather than none, since the computed face isn't observable at any seam but the wrapper and class it depends on are; the throwaway drawing stayed out of the catalog, as the ticket asks.
- **Validation:** `pnpm check` on the final HEAD after merging the integration tip.
- **Left undone:** nothing.
