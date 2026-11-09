# 01: Print every step of a figure Stepper whose parts leave

Status: resolved
Blocked by: None (can start immediately)

**What to build:** printed, a figure Stepper whose drawing has a part that isn't in its last step (a circle moving around an orbit, a pump that takes ions in and lets them go) shows every step in order: each step is the drawing with only that step's parts, in the figure's full frame, under "N. caption" ("N." alone without captions), as D2 boards print, and with no caption list after it. A figure Stepper whose parts are all in its last step prints as it does today: once, at its last step, with its captions listed under it. The build decides from the `data-step` lists; the author has no prop. On screen, with or without JavaScript, every figure Stepper looks and steps exactly as it does today, and screen readers hear its `alt` once.

Specified in [Printed Steppers](../spec.md), which carries the decisions; don't reopen them. Design-system work: it runs in a local session with impeccable (`design-system/CLAUDE.md`).

- **The rule:** a figure prints every step when some element with a `data-step` lacks the last step in its list. An element without `data-step` shows in every step and never triggers it; `"2-"` or `"1, 4"` in a four-step figure reaches the last step. The build already parses these lists and marks the parts in the last step for print; that marking becomes the once form's alone.
- **Each printed step** shows the parts without `data-step` plus the parts listed for that step, at the drawing's own viewBox, with no cropping (the opposite of D2 boards, which print cut back to their own box). It stays whole on its page, its number and caption on the page of its drawing, page breaks falling between steps. Reuse the D2 boards' printed step heading so the print forms read alike; Code display's block-per-step Stepper will print the same way.
- **Ids:** each printed step is a copy of the drawing, and `pnpm check`'s html-validate refuses duplicate ids. Give every id in a copy a name of its own, distinct from the screen figure's and the other copies', and rewrite every reference to it inside that copy (`url(#…)` in attributes, `href` and `xlink:href`), so markers, gradients and patterns resolve in every step. Derive the names deterministically (from the step number, say): the page's content hash is taken from its rendered HTML, so names that depend on render order would change it between builds. References to ids outside the drawing stay as written.
- **Print only:** the copies don't display on screen in any state, are hidden from assistive technology and carry no accessible name of their own; the screen figure keeps the one `alt`. In print the screen figure (and, for this form, the caption list) gives way to the copies, from the stylesheet alone, whether or not `beforeprint` fires. Don't wrap a copy in a `figure.figure`: that element joins the figures' counter and `pnpm look`'s selection.
- **Colours:** `figure-colours.css` reaches drawings through the `.figure` wrapper, so each copy needs to sit where those rules reach it. If that means changing `figure-colours.css` or `InlineSvg.astro`, both shared parts, name in the closing comment the components they reach (`Figure`, `Diagram`, `Stage`, the Stepper's D2 boards) and check one on its catalog page with the same evidence; otherwise say the change stays inside `Stepper`.
- **Shared with Code display:** its block-per-step Stepper edits the same print block and the same stepped-figure code. Whichever lands second rebases onto the first; neither waits.
- **Docs, in the same commit:**
  - the `Stepper` doc comment's print paragraph: a figure prints once at its last step when every part is in it, and every step under its number and caption otherwise. "So make the last step the complete drawing" stops being a rule and becomes advice: for a figure that builds up, the last step is the complete drawing. Then `pnpm components`, or `pnpm check` fails as `component-reference`.
  - `DESIGN.md` › Stepper: the print sentence's "a figure once, at its last step, with its captions listed under it" gains the second case. Update `.impeccable/design.json` if it describes the Stepper's print (today it doesn't).
  - the `artifact` skill's figures guide › **Stepped figures**: replace "A printed figure stepper shows only its last step, so make the last step the complete drawing" with the rule above, so an agent no longer has to complete a moving figure's last step.

- [x] A figure Stepper with a part that leaves prints every step, in order, each with only that step's parts and the unstepped ones, in the full frame, under "N. caption" or "N.", with no caption list.
- [x] A figure Stepper whose parts all reach the last step prints once at its last step with "N. caption" listed under it, unchanged.
- [x] Every id in the built page is unique, and every in-drawing reference in each printed step resolves to an id inside that same step.
- [x] On screen, with and without JavaScript, both kinds look and step as before; the print-only steps never display there, and the page labels each figure Stepper once, with its `alt`.
- [x] Seam 1 (`tests/check`, the built site's figures) covers, against a fixture artifact with a figure that builds up and one whose parts leave and that defines a marker: which form each prints, each step's parts, its frame and heading, the unique ids and resolving references, and the single label. Expected values come from the fixture drawings as written. Mutating the rule (treating every figure as build-up, or every one as moving) turns a test red.
- [x] Print-media screenshots, in light, of the catalog's `orbit-steps.svg` Stepper (every step, "N." alone), the RSA sample's `powers-of-three.svg` Stepper (once, with its captions), the catalog's D2 Stepper and its one-block code Stepper (both as before), with a page break falling between two printed steps in at least one. A printed step shows its colour classes as the screen figure does.
- [x] The `Stepper` doc comment, `COMPONENTS.md`, `DESIGN.md` › Stepper and the `artifact` skill's **Stepped figures** say the new rule, in the same commit; `pnpm check` passes.

## Comments

### 2026-11-09: what code display 04 left in the Stepper's print block

Implementer of [Code display 04](../../code-display/issues/04-a-stepper-with-one-code-block-per-step.md), which landed first.

- **The block-per-step form prints as D2 boards do**, with the same heading: each step is a `div[data-in-steps]` holding `p.stepper-step` ("N." and the caption, `display: none` on screen) and the block's `pre`, inside `.stepper-blocks`. Its print rules sit in their own `.stepper-blocks` block after `.stepper-boards`: the steps stack with `row-gap: var(--space-4)`, each `break-inside: avoid`, the hidden ones made visible. A printed figure step can reuse that wrapper shape and heading as written.
- **On screen** every block shares one grid cell (`grid-area: 1 / 1`) and the ones off their step are `visibility: hidden`; print undoes that with `grid-area: auto` and `display: block`. If you rework the shared `[data-off]` rules (`.stepper-figure [data-off], .stepper-captions > [data-off]`), keep `.stepper-blocks > [data-off]` hidden on screen and shown in print.
- **The one-block reset** (`.stepper-code .line` back to unmarked in print) stays scoped to `.stepper-code`; the block-per-step form keeps its `{…}` marks in print, so don't widen it.
- `steppedCode` and `steppedFigure` in `stepper.ts` are unchanged but for the several-blocks refusal at the top of `steppedCode`; the new form's own function is `steppedBlocks`.

### 2026-11-09: resolved

**Result.**
- **The rule:** `steppedFigure` (`stepper.ts`) decides the print form from the `data-step` lists. When any list lacks the last step, it returns one copy of the drawing per step.
- **Each copy:** parts outside its step carry `data-off`. Each id defined in the drawing becomes `<id>-step-N`, and the copy's own `url(#…)`, `href` and `xlink:href` references follow. A reference to an id the drawing doesn't define stays as written.
- **Markup:** `Stepper.astro` renders the copies after the screen figure, in `div.stepper-figure-steps[aria-hidden="true"]`. Each copy is a `div.stepper-figure-step.figure` holding the D2 boards' heading (`p.stepper-step`, "N. caption" or "N.") and the drawing through `InlineSvg` with no `alt`. A copy is never a `figure` element. The caption list isn't rendered for this form.
- **Screen:** the copies are `display: none`.
- **Print:** the screen figure gives way to the copies (`.stepper-figure:has(+ .stepper-figure-steps)`), from the stylesheet alone. The copies stack like the D2 boards: one stage between 1px rules with `--space-4` between steps. Each step is `break-inside: avoid` and capped at `70vh`, as `.figure-stage` drawings are.

**Commits:** `ae34f95` (claim), `59b15f3` (implementation, seam-1 test and docs in one commit), and this closing commit.

**Validation.**
- **Seam 1:** `tests/check/valid-artifacts.test.ts` › "figure Steppers in print" runs against the fixture artifact `orbita`. It has three figure Steppers: one that builds up (`"2-"`, `"1, 2"` and an unstepped part), one whose parts leave with a marker and a `<use>` and no captions, and one whose parts leave with captions. It asserts the form each prints, each step's parts, its viewBox and heading, that ids are unique and references resolve inside each step, and the single label. All pass, along with the fixture repo's full check, html-validate included.
- **Mutations:** treating every figure as build-up turns 3 tests red; treating every figure as moving turns 2 red.
- **Print, light, built catalog and RSA sample:**
  - The catalog's `orbit-steps.svg` Stepper prints all four steps under "1."–"4.", in full frame, with no list. In an A5 PDF of `/catalog/`, the page break falls between steps 1 and 2.
  - The copies' colour classes compute as the screen figure's do (`fill-accent` ink, `fill-tint` subtle, `stroke-muted` grey), and their labels are set in Archivo.
  - `powers-of-three.svg` prints once with its seven captions listed. The D2 Stepper and both one-block code Steppers print as before.
- **Screen, light and dark, with JavaScript:** each figure Stepper (orbit, `powers-of-three`) was shot at every step and then again with the copies removed from the DOM. Every pair is byte-identical, and each Stepper has one `aria-label`, its `alt`.
- **Screen, without JavaScript:** full-page shots of `/catalog/` and `/rsa-from-scratch/`, as built and with the copies cut out of the HTML, are byte-identical in light and in dark.
- **Gate:** `pnpm check` runs after merging the integration tip.

**Decisions.**
- **`data-in-last-step` dropped:** in the once form every stepped part is in the last step, so the attribute would mark every part. The print stylesheet now shows every `[data-in-steps]` part of a once-form figure.
- **Copies hide what's off their step:** parts outside a copy's step stay in the copy with `data-off` and print `display: none`, rather than being cut from the SVG string. Cutting nested elements out with regexes is fragile. The copies carry no `data-in-steps`, so the custom element never toggles them.
- **Id names:** `<id>-step-N` depends only on the step, so the content hash stays stable between builds.
- **No accessible name on copies:** `InlineSvg`'s `alt` became optional, and without it the `svg` gets `aria-hidden="true"` and no role. A copy therefore carries no accessible name, beyond its wrapper being hidden.
- **Height cap:** printed copies are capped at `70vh`, matching `figure.css`'s `.figure-stage > svg`, so a tall drawing still fits on one page with its heading.

**Shared parts reached.**
- **`InlineSvg.astro`:** only when `alt` is omitted, which only the copies do. `Figure`, `Diagram`, `Stage` and the D2 boards always pass `alt` and render as before. The `celula` test ("inlines each diagram and figure as an SVG image labelled by its alt") passes unchanged, and the catalog's no-JS full-page shots match.
- **`figure-colours.css`:** unchanged. Each copy's `svg` is a direct child of a `.figure` element, so its rules reach the copies, and the change stays inside `Stepper`.
- **`Stepper.astro`'s print block:** shared with Code display 04; its `.stepper-blocks` rules are untouched.

**Left undone:** nothing. `design-system/.impeccable/design.json` says nothing about the Stepper's print, so it is unchanged.
