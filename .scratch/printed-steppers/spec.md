# Printed Steppers

Source: [Printed Steppers](../artifact-generation-gaps/issues/08-printed-steppers.md), on the [Artifact generation gaps](../artifact-generation-gaps/map.md) map. Every decision below was made with the owner on 2026-11-08, and the ticket's `## Answer` records them.

## Problem

Printed, a figure Stepper shows only its last step, with its captions listed under it. That suits a drawing that builds up, where the last step holds every part, such as the public sample's `powers-of-three.svg`. A drawing whose parts leave before the end (a circle moving around an orbit, a pump that takes in ions and lets them go) prints only its final state. The earlier steps survive only in the captions.

The case the agents reported was a code rewrite drawn as a figure Stepper. [Code display](../code-display/spec.md)'s Stepper with one code block per step replaces that, so this spec covers figure Steppers only.

## Behaviour

### Which figures print every step

- A figure Stepper whose parts are all in its last step prints as it does today: once, at its last step, with its captions listed under it as "N. caption".
- A figure Stepper with any part that is not in its last step prints every step instead, in order. Each step is the drawing with only that step's parts, under its step number and caption ("N. caption", or "N." alone without captions), as D2 boards print. The caption list isn't printed, since each step carries its own caption.
- The build decides from the `data-step` lists, which it already parses. The author has no prop to choose: the build alone decides. A part without `data-step` shows in every step and so never makes a figure print every step.

### Each printed step

- Each step prints in the figure's full frame, with no cropping. A figure's parts share one frame, and a step's own box isn't known at build time.
- A step stays whole on its page (`break-inside: avoid`). Page breaks fall between steps, and the step's number and caption stay on the page of its drawing.
- Each step keeps everything the drawing defines and points to: markers, gradients, and the patterns that [Swatches](../swatches/spec.md)' hatchings use. Every reference inside the SVG must resolve in every printed step, so copies of the drawing can't share ids.
- The printed steps exist only for print. On screen, without JavaScript and with JavaScript alike, the figure looks and steps exactly as it does today. Screen readers hear the figure's `alt` once, and the print-only steps are hidden from them.

### Unchanged

- D2 Steppers, one-block code Steppers and Code display's Steppers with one code block per step print as they do or as that spec says.
- A Stage prints its content as written (`DESIGN.md` › Stage). Its run depends on what the reader chooses or types, so it has no fixed steps to print.

## Naming

"Figure Stepper" and "step" are component vocabulary, so `GLOSSARY.md` gains no entry.

## Documentation

- The `Stepper` doc comment's print paragraph (and so `COMPONENTS.md`, via `pnpm components`): a figure prints once at its last step when every part is in it, and prints every step under its number and caption otherwise. Drop "so make the last step the complete drawing" as a rule. Keep it as advice instead: for a figure that builds up, the last step is the complete drawing.
- `DESIGN.md` › Stepper, the print sentence: "a figure once, at its last step, with its captions listed under it" gains the second case.
- The `artifact` skill, `.claude/skills/artifact/figures.md` › **Stepped figures**: replace "A printed figure stepper shows only its last step, so make the last step the complete drawing" with the rule above. An agent no longer has to make a moving figure's last step complete: print shows every step.
- The catalog's `orbit-steps.svg` Stepper is a figure whose parts leave, so its print shows the every-step form. The RSA sample's `powers-of-three.svg` shows the once form.

## Shared parts

- `Stepper.astro`'s `@media print` block and `stepper.ts`'s `steppedFigure` reach every figure Stepper. [Code display](../code-display/spec.md) edits the same print block and `stepper.ts` for its Stepper with one code block per step, so whichever lands second rebases onto the first. Check a D2 Stepper, a one-block code Stepper and both kinds of figure Stepper in print, on their catalog pages and in the RSA sample, with print screenshots as evidence.
- `figure-colours.css` and `InlineSvg.astro` reach every printed step: check the colour classes and `font-code` in a printed step.

## Out of scope

- Cropping each printed step to its own box.
- An author's choice between print forms.
- Printing a Stage's run.

## Comments

### 2026-11-08: owner decisions at ticketing

Owner, /to-tickets review in the Artifact generation gaps session, 2026-11-08, every recommendation accepted. Each bullet amends this spec or fills a gap in it; the tickets in `issues/` carry the detail.

- **No swatch hatchings in printed steps**, amending "the patterns that Swatches' hatchings use" in Each printed step: swatches are only for `Figure` and `Stage` (Swatches), so a figure Stepper carries none, and ticket 03 is `wontfix`. A Stepper that needs swatches is a new proposal.
