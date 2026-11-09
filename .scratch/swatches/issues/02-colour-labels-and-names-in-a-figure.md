# 02: Colour labels and the colours' names in a Figure

Status: resolved
Blocked by: 01

Source: [Swatches](../spec.md) › Behaviour: the label is the colour, and › Documentation.

Design-system work: run it in a local session with impeccable.

**What to build:** an agent drawing a graph colouring writes a Figure whose coloured parts each show the colour's name, and the build refuses a drawing whose labels and swatches disagree. The Figure takes `colours`, the colours' names in swatch order (`colours={["R", "B"]}`), numerals 1 to 6 without it. Every coloured part carries a label, a `<text data-swatch="N">` in the same `<g>` as the shapes it names, whose text is colour N's name, drawn on a square ground plate so it reads over the hatching. A vertex or region also takes `fill-swatch-N`; an edge takes the label only, at its midpoint, so solid, dashed, 4px and grey stay the marks'. No legend: the prose names the colours once and the Figure's `alt` names each part's colour.

- [x] A coloured vertex, region and edge each show their label on a square ground plate (a ground halo through `paint-order`, a rect, or another square form, the implementer's choice), legible over every one of the six hatchings at a 2.75rem vertex at the drawing's smallest scale, in both themes, print and forced colours.
- [x] `Figure` takes `colours`; without it the names are 1 to 6.
- [x] The build fails, as `Figure: …` at the entry like any component's own rule, on: a name longer than two characters; more than six names; a label whose text isn't its swatch's name; a `<g>` holding a `fill-swatch-N` shape and a label of another N, or no label; a swatch number past the names given. Each message says what to write instead.
- [x] `tests/check` covers these failures against a fixture artifact, at the failure line the check prints, including a label that doesn't match its swatch. This fixture stands for the spec's "catalog: a check failure for a label that doesn't match its swatch", since a drawing that fails the build can't sit in the catalog; if the owner wants the failure shown on a catalog page too, it is shown as text there. Keep the label checking where 03 can reuse it for a Stage's drawing as written.
- [x] `Figure`'s doc comment and the `colours` prop's doc comment say when to use swatches (colour is the subject: a colouring of a graph, map or edges), the names, the label and its plate, edges by label only, at most six, no legend, the prose naming the colours once ("colours 1 to 3") and `alt` naming each part's colour; run `pnpm components`.
- [x] `DESIGN.md` › Code, math and figures adds swatches and labels in Figures; `.impeccable/design.json` follows.
- [x] The `artifact` skill, in the same commit as the check change: `figures.md` says that when colour is the subject the drawing uses swatches and labels, never line styles or fills of its own (and "Black on white" points there); `rules.md` › Build failures lists `Figure: …` among the components' own rules.
- [x] The catalog's swatch Figure from 01 becomes the spec's Figure page: all six swatches on labelled vertices and labelled edges, in both themes, print and forced colours.
- [x] Shared parts: if the plate or label styling goes into `figure-colours.css`, it reaches every Stage drawing and figure Stepper too: check the Prim and mdc Stages and the orbit Stepper as 01 did, and name them in the closing comment; if it stays inside `Figure`, say so.

## Comments

### 2026-11-09: notes from swatches 01

- **How the hatchings are built** (01's closing comment has the whole of it): `Figure` (through `SvgImage`) and `Stage` pass `swatches` to `InlineSvg`; a drawing whose source contains `fill-swatch-` gets one `<defs>` with six patterns at its top (`design-system/src/swatches.ts`), IDs `swatch-<drawing>-<N>` from a per-build counter, and `--swatch-N: url(#…)` on `InlineSvg`'s `<g aria-hidden>`; `figure-colours.css` has `.figure .fill-swatch-N { fill: var(--swatch-N); }`. Drawings without swatches are byte-identical to before.
- **Room for the plate:** the hatchings were chosen around an 18 × 18 plate in the middle of a 44-unit vertex (font-size 15). The catalog's `catalog/swatches.svg` stands in a plain `fill-surface` rect plate under each label for now; replace it with your plate and add the labelled edges.
- **Labels already written:** the `coloracao` fixture in `tests/check/valid-artifacts.test.ts` and `catalog/swatches.svg` already carry `<text data-swatch="N">N</text>` in each coloured part's `<g>`, so your checks should pass them as they stand.
- **Forced colours:** Chrome leaves SVG `fill`/`stroke` as the tokens give them in forced colours, so a Figure's ink stays `#111`/`#ededed`. 01 remaps `--color-text`/`--color-surface` to CanvasText/Canvas on `.figure pattern` only. If the plate and label must be CanvasText on Canvas too, scope the same remap to them; the vertex outline isn't remapped (no Figure's is).
- **Stepper:** `Stepper` doesn't pass `swatches`, so a `fill-swatch-N` in a Stepper figure gets no pattern and its unset `--swatch-N` leaves the shape painting inherited ink, which reads like `reversed`. Your check is the natural place to refuse `fill-swatch-` in a Stepper (swatches aren't offered there, per the spec's ticketing comment).
- **Docs:** "Colours in figures" now ends with a `### Swatches` list generated from `swatches` (`draws`) in `swatches.ts` by `figureColours` in `scripts/component-reference.ts`; extend its paragraph with the labels and names there.

### 2026-11-09: resolved

**Result.** A colouring's Figure labels its colours. `Figure` takes `colours`, the names in swatch order (`colours={["R", "B"]}`), the numerals 1 to 6 without it. Every coloured part carries `<text x y data-swatch="N">` in its `<g>`, written at the area's centre or the edge's midpoint. `figure-colours.css` sets the label at 15 units, centred on that point whatever the file says, and `InlineSvg` draws a square `fill-surface` plate under it, centred on the same point. The plate is 18 units when every label in the drawing is one character and 24 when any has two. The build fails as `Figure: …`, every broken rule in one line, each saying what to write instead, on: a label whose text isn't its colour's name; a `<g>` with a `fill-swatch-N` shape and no label, or a label of another colour; a label without a plain `x` and `y`; a label whose `data-swatch` isn't a number; a swatch past the names; more than six names; and a name longer than two characters. A figure Stepper with `fill-swatch-` or `data-swatch` fails as `Stepper: …`, closing what 01 left to this ticket.

**Construction (for 03, 04 and 05; notes left on each).**

- `swatches.ts` holds `swatchProblems(drawing, colours)`, the label check, and `platedLabels(drawing)`, the plates. `Figure` runs the check. `InlineSvg` plates every drawing it gets `swatches` for, so Stage drawings already get plates; only 03 adds the check to the Stage.
- The check reads the SVG with a small tag scanner, not a parser: no dependency. Each `fill-swatch-N` shape and each label belongs to the `<g>` it sits in, and the drawing's top counts as one more group.
- In forced colours the plate takes `--color-surface: Canvas` and the label `color: CanvasText`, as 01 did for the patterns. The vertex outline isn't remapped, as no Figure's is.

**Commits.** 276de57 (claim), 3a7b5ad (check, plates, docs, skill, catalog, tests), this closing commit, and the merge of the integration tip.

**Validation.**

- Test first, red before the change: `tests/check/artifact-failures.test.ts` has four fixture artifacts, each failing at the failure line the check prints. The first is a Figure whose labels and swatches disagree: a label that doesn't match its swatch, another colour's label, no label, a swatch past `colours`, and a label without `x` and `y`. The second has seven names, one of four characters. The third has no `colours`, a letter where the numeral belongs and swatch 7. The fourth is a figure Stepper with a swatch. Red, they failed with a `TS2322` on `colours` and no failure. Green, they fail as above.
- `tests/check/valid-artifacts.test.ts`'s `coloracao` gains a Figure with `colours={["Az", "Vm"]}`, a swatched vertex and a labelled edge. A new test checks every label on the built page: its text, and a square `fill-surface` plate just before it, centred on its `x` and `y`. The swatch-ID test now counts four drawings.
- This fixture stands for the spec's "catalog: a check failure for a label that doesn't match its swatch". A failing drawing can't sit in the catalog, so it isn't shown there.
- Measured in the browser (Archivo at 15 units, the frame's 88%): one character is at most 13.0 units wide (W), and two run 15–20 for most names (Rd 17.4, Gn 18.3, Vm 20.1) and up to 25.8 (WW). Hence 18 and 24.
- Shot with a baseline build of the integration tip: every Figure, Diagram, Stepper and Stage on `/catalog/` and `/catalog/stage/`, in light, dark, print, forced light and forced dark at DPR 1, plus the swatch Figures at DPR 2, and at full size and at two thirds (their `--min-drawing-width`): 145 shots. Both swatch Figures read in all five modes at two thirds on DPR 1, labels and plates included. In forced dark the plates are Canvas under CanvasText labels.
- The full `scripts/heavy pnpm check` gate on the merged HEAD.

**Decisions.**

- The plate is a `fill-surface` rect that `InlineSvg` draws, not a `paint-order` halo, because a halo follows the glyphs and isn't square. It is `fill-surface` so 03's `reversed` turns it to ink with no new selector.
- The label is centred by CSS (`text-anchor: middle`, `dominant-baseline: central`) at 15 units, overriding the file's own `font-size` and `text-anchor`. The author writes only the centre, the plate is placed from the same point, and 04's steps change only the text.
- A label must give `x` and `y` as plain numbers, since the plate is placed from them. A `transform` on the label is copied to its plate.
- One plate size per drawing, from its longest label, so plates line up. 18 shows more hatching in the common one-character case, and 24 holds any two characters but the very widest pairs (WW and MW, 25.8 and 24.6, touch the edge).
- Names are counted in grapheme clusters (`Intl.Segmenter`), so an accented or combined character counts as one. The "such as" in the message is the name's first two.
- A swatch past the names is one message per swatch number, whether a shape or a label names it.
- The catalog's Figure from 01 became a total colouring of a six-cycle, with `colours={["Rd", "Bl", "Gn", "Yl", "Pu", "Or"]}`, all six swatches on labelled vertices and six labelled edges: two-character names, the larger plate. A second, small Figure, a triangle with no `colours`, shows the numerals and the 18-unit plate.
- `design.json` gains a "Swatch Figure" component entry, and the Swatch Rule there and in `DESIGN.md` records the plate sizes. `DESIGN.md` › Code, math and figures describes the labels, plates, `colours`, the failures and no legend.

**Shared parts.**

- `figure-colours.css` changed. The new rules match only `text[data-swatch]` and `[data-swatch-plate]`, which no existing drawing has.
- `InlineSvg.astro` changed. `platedLabels` touches only `<text data-swatch>`. It reaches every Figure and Stage drawing; Stepper and Diagram don't pass `swatches`.
- `Stepper.astro` changed (the refusal). The orbit figure Stepper and the D2 Stepper are unchanged.
- Checked against the baseline build: every other drawing's built `<svg>` is byte-identical: 8 of 8 others on `/catalog/`, 2 of 2 on `/catalog/stage/` (the Prim Stage's `prim-graph.svg` and the mdc Stages), and 9 of 9 in `/rsa-from-scratch/`.
- Shots of every Figure, Diagram, Stepper and Stage in the five modes are PNG-identical to the baseline except the swatch Figure and the four blocks below it on `/catalog/`: the orbit Stepper, the D2 Stepper, the code Stepper and, in print, the next block. Their markup is identical. The swatch Figure grew 24 units, so they moved down: the decoded pixels differ only in anti-aliasing (12 channel values by 1 for one, and a one-pixel taller crop for another), and the shots compared by eye are identical.

**Left undone.** The Stage's `colours` and its drawing-as-written check are 03's. Steps that colour parts, the empty label and plates sized from a Stage's names are 04's (noted there).
