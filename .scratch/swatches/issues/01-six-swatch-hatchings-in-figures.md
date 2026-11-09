# 01: The six swatch hatchings in figures

Status: resolved
Blocked by: None (can start immediately)

Source: [Swatches](../spec.md) › Behaviour: the swatches; why: [ADR 0009](../../../docs/adr/0009-colour-as-the-subject-is-drawn-as-swatches.md).

Design-system work: run it in a local session with impeccable, after `PRODUCT.md` and `DESIGN.md`.

**What to build:** a hand-written figure can fill an area (a vertex, a region) with one of six **swatches**, `fill-swatch-1` to `fill-swatch-6`: ink hatchings on the ground, in swatch order diagonal `/`, diagonal `\`, cross-hatch, horizontal, vertical, dots. A Figure whose drawing uses them shows six fills that tell apart at a glance on a part as small as a 2.75rem vertex, in light and dark, in print and in forced colours. Ground stays "uncoloured": no swatch is ink, wiped grey, grey or figure grey. This ticket delivers the fills and their place in the design system's world; labels, names and the check come in 02.

- [x] `fill-swatch-1` to `fill-swatch-6` paint the six hatchings in swatch order, at one fixed line weight and spacing (dots: one size and pitch), chosen with impeccable so all six tell apart on a 2.75rem vertex at the drawing's smallest scale, with room left for a one- or two-character label plate in its middle (02 draws the plate; leave space for it now).
- [x] The hatchings follow the theme: ink lines on the ground, ink on near-black in dark mode; print paints them as written in light; forced colours paint them CanvasText on Canvas.
- [x] Two Figures with swatches on one page validate: whatever the hatchings reference (SVG patterns or otherwise) never repeats an ID on the page, since html-validate counts SVG IDs, and resolves inside every drawing that uses it.
- [x] `COMPONENTS.md`'s "Colours in figures" lists `fill-swatch-1` to `fill-swatch-6` with what each draws, separately from the token classes. Its generator currently refuses any `.figure .fill-…` rule that isn't `fill: var(--token)`, so teach it the swatches rather than writing them differently to slip past it; run `pnpm components`.
- [x] `DESIGN.md` › Colors gains the swatches' Named Rule beside the One Ink and Shape, Not Hue rules, which stay: six hatchings in ink, ground is uncoloured, the label is the colour, edges carry the label only and no line form ever stands for a colour, at most six per drawing (a seventh by proposal). It records the hatchings' weight and spacing, and that a hatching is a fill, not a rule, so the Three Weights Rule doesn't govern it (as with the proof's end square). `.impeccable/design.json` follows.
- [x] The catalog's Figure section shows a drawing with all six swatches on vertices of 2.75rem, checked in both themes, print and forced colours.
- [x] Shared parts: `figure-colours.css` reaches every Figure, every Stage drawing and every figure Stepper; if the hatchings' definitions go through `InlineSvg.astro` or `SvgImage.astro`, those also reach `Diagram` and every Stepper. Check the existing figure catalog entries, the Prim Stage (`prim-graph.svg`) and the mdc Stages, the orbit figure Stepper and a Diagram on their catalog pages, in both themes, print and forced colours, with the same evidence as the new swatches, and say in the closing comment that nothing else changed.

Notes for the implementer: an SVG pattern's content inherits from where the pattern is defined, not from the shape that uses it. 03 needs `muted` to grey a part's hatching and hover to wipe its ground grey, part by part, so choose a construction that leaves room for that (a variant per state, a mask over a shape that takes the part's tokens, or another), and record the choice in the closing comment for 03. Swatches are for Figures and Stage drawings only (the owner's decision at ticketing, in the spec's `## Comments`). A figure Stepper loads the same colour classes but carries no swatches, so don't offer them in a Stepper, and make sure a Stepper figure is unchanged. A Stepper that needs swatches is a new proposal.

## Comments

### 2026-11-09: resolved

**Result.** A Figure or Stage drawing fills an area with `fill-swatch-1` to `fill-swatch-6`: ink hatchings on the ground in swatch order (`/`, `\`, cross-hatch of both diagonals, horizontal, vertical, dots). `COMPONENTS.md` › Colours in figures lists them under `### Swatches`, `DESIGN.md` › Colors has the Swatch Rule beside the One Ink and Shape, Not Hue Rules (which stay), and `.impeccable/design.json` follows. The catalog's Figure section shows six 44-unit (2.75rem) vertices, one per swatch (`catalog/swatches.svg`).

**Construction (for 02, 03, 04 and 05).**

- `design-system/src/swatches.ts` holds the six hatchings (`swatches`, each with `draws`, the text `COMPONENTS.md` lists) and `swatchPatterns()`, which returns one drawing's `<defs>` of six `<pattern>`s and the style that names them.
- `InlineSvg` takes `swatches`; `Figure` (through `SvgImage`) and `Stage` pass it, `Stepper` and `Diagram` don't. Only a drawing whose source contains `fill-swatch-` gets the patterns, so every other drawing renders byte-identical to before.
- IDs are `swatch-<drawing>-<N>`, `<drawing>` from a counter in `swatches.ts` that counts drawings across the build, so no two drawings on a page share one (html-validate counts SVG IDs), even the same file drawn twice.
- `InlineSvg` sets `--swatch-N: url(#swatch-<drawing>-N)` on its `<g aria-hidden>`, and `figure-colours.css` has `.figure .fill-swatch-N { fill: var(--swatch-N); }`. A shape changes swatch by changing its class (04).
- Each pattern is a 6 × 6 user-unit tile, `patternUnits="userSpaceOnUse"`, turned by `patternTransform`: a `fill-surface` ground rect, then `stroke-text` lines 1.5 wide through its middle (the cross-hatch both, turned 45°), or a `fill-text` dot r = 1.4 on a lattice turned 45°. So every line hatching is spaced 6 apart, and the tokens paint them in both themes and print.
- The patterns sit at the drawing's top, so they inherit the drawing's tokens, not a part's. 03's room: a variant per state. Add `-muted`/`-wiped` patterns to `swatchPatterns()`, expose `--swatch-N-muted` and so on, and remap `--swatch-N` on the marked or hovered part (details in 03's comment).
- Forced colours: Chrome leaves SVG paint alone (probed: the vertex outline stays `rgb(17, 17, 17)`), so `figure-colours.css` remaps `--color-text`/`--color-surface` to CanvasText/Canvas on `.figure pattern` under `forced-colors: active`. Probed afterwards: lines and dots `rgb(0, 0, 0)` on `rgb(255, 255, 255)` in forced light.

**Commits.** 19d9fde (claim), 8a15b7b (swatches, test, catalog, generator), the merge of the integration tip, and this closing commit (forced colours, `DESIGN.md`, `design.json`, notes on 02 and 03).

**Validation.**

- Test first in `tests/check/valid-artifacts.test.ts`: the `coloracao` fixture draws one swatched SVG as two Figures and a Stage on one page. The test checks that every ID on the page is unique, and that each drawing's six `url(#…)` references name patterns inside it. It was red (0 references) before the change and green after. The existing figure test also asserts that a page without swatches has no `<pattern>`.
- The full `pnpm check` gate ran on the final HEAD.
- Weight and spacing chosen with impeccable from a prototype of five candidates (spacing 4–6, lines 1–1.5, dots 0.9–1.4), shot at 1× and 2/3 scale, DPR 1 and 2, light and dark. Spacing 5 or less muddies at 2/3 on DPR 1; 6 / 1.5 / r 1.4 keeps all six apart with an 18-unit plate in the middle. The diagonal cross-hatch was chosen over the square grid because it reads as one texture, not a ruled table.
- The catalog figure, shot in light, dark, print, forced light and forced dark, at full size and forced to 2/3 of it, in light and dark.

**Decisions.**

- Patterns once per drawing (a variant per state for 03) rather than per part or a mask: constant markup, and a class swap is all 04 needs.
- Cross-hatch is both diagonals.
- Spacing is 6 drawing units, lines 1.5, dots 2.8 across on a 45° lattice.
- IDs come from a build-wide counter, not a content hash, so the same file drawn twice on one page still gets distinct IDs.
- Swatches only where `swatches` is passed: a Stepper figure with `fill-swatch-` gets no pattern and paints the area in inherited ink. Refusing it is left to 02's check; see the note there.
- The forced-colours remap is scoped to the patterns, so no existing Figure changes.
- The generator reads `swatches.ts` as source, as it reads `d2-tokens.ts`, because a script may import only the package's exports. It refuses a `.figure .fill-…` rule that is neither `var(--token)` nor `fill-swatch-N { fill: var(--swatch-N) }`, and swatch rules out of order or not matching `swatches`.

**Shared parts.**

- `figure-colours.css`, `InlineSvg.astro` and `SvgImage.astro` changed. They reach every Figure, Diagram, Stage drawing and Stepper.
- Checked against a baseline build of the integration tip, on `/catalog/`, `/catalog/stage/` (Prim with `prim-graph.svg`, the mdc Stages), `/catalog/mepa/` and `/rsa-from-scratch/`. Every existing drawing's built `<svg>` is byte-identical: 8 of 8 on the catalog, 2 of 2 on the Stage page, 9 of 9 in the sample. Every Figure, Diagram, Stage and Stepper (the orbit figure Stepper and the D2 Stepper included) was shot in light, dark, print, forced light and forced dark, 115 shots, all PNG-identical to the baseline except one: the orbit Stepper in dark. Its markup is identical and it is visually identical, and it sits below the inserted figure, so the hash difference is a sub-pixel offset.
- Nothing else changed.

**Left undone.** Labels, plates, `colours` and the check are 02's. The catalog stands in plain `fill-surface` rects for plates until 02 replaces them.
