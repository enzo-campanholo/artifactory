# 03: A Stage's coloured drawing and the marks on its coloured parts

Status: ready-for-agent
Blocked by: 02

Source: [Swatches](../spec.md) › Behaviour: the Stage (marks and hover) and › Shared parts.

Design-system work: run it in a local session with impeccable.

**What to build:** a Stage's drawing can be coloured as written, with the same swatches, labels and names as a Figure, and every mark a build puts on a coloured part still reads. The Stage takes `colours` as `Figure` does, and its drawing as written passes the same label checks. On a coloured part, `strong` sets its outline at 4 and its label at 700; `dashed` dashes its outline; `muted` turns its hatching, outline and label grey; `reversed` fills it with ink over the hatching and reverses its plate, so the label reads in the ground. On a device that hovers, a clickable coloured part wipes the hatching's ground grey and keeps its lines. Print and the page without JavaScript show the colours as written, with no marks.

- [ ] `Stage` takes `colours` (names in swatch order, numerals without it), and its drawing as written fails the build on the same rules as a Figure's, as `Stage: …`, with the Stage's other rules in one line.
- [ ] All four marks on a coloured vertex and a coloured edge look as above in both themes; in forced colours `reversed` stays filled and `muted` stays grey, as the Stage paints marks today.
- [ ] Hover on a clickable coloured part wipes the hatching's ground grey and keeps its lines, never in forced colours and never on the `reversed` part.
- [ ] The check accepts each of the four marks on a coloured part, a part whose only shapes are a `fill-swatch-N` area and its label included, and still fails a mark on a part it can't change; the page refuses the same. `tests/check` covers a coloured part taking every mark.
- [ ] `Stage`'s doc comment (and so `COMPONENTS.md`, via `pnpm components`): the `colours` prop, and under **Marks** what each mark does on a coloured part.
- [ ] `DESIGN.md` › Stage: the marks on a coloured part and hover on one; `.impeccable/design.json` follows.
- [ ] The `artifact` skill's `stage.md` (**Marks act on some colour classes only**) adds the four marks on coloured parts, in the same commit as the check change.
- [ ] The catalog's Stage page gains a Stage whose drawing is coloured as written and whose build, stepped by the catalog script, shows each mark on a coloured vertex, with a clickable coloured vertex to hover; 04 may grow it into the greedy colouring.
- [ ] Shared parts: `Stage.astro`'s mark and hover rules reach every Stage, and `figure-colours.css` every Figure, Stage drawing and figure Stepper: check the Prim Stage (`prim-graph.svg`) and the mdc Stages on the catalog in both themes, print and forced colours, with the same evidence as the new Stage, and the swatch Figure from 02.

Notes for the implementer: read 01's closing comment for how the hatchings are built. A pattern's lines don't take the using part's tokens, so `muted` and hover need the construction 01 chose. A mark's look today goes through the colour classes' tokens; a swatch shape and a label on a plate are new things for the marks' selectors on the page and in the check alike, which share one description of what each mark acts on.

## Comments

### 2026-11-09: notes from swatches 01

- **Construction:** one set of six patterns per drawing, in a `<defs>` at the drawing's top (`swatches.ts`, injected by `InlineSvg` when `swatches` is set), so each pattern's content inherits the drawing's tokens, not a part's. A shape reaches its pattern through `--swatch-N`, which `InlineSvg` sets on its `<g aria-hidden>`, and `.figure .fill-swatch-N { fill: var(--swatch-N); }`. Each pattern is a `fill-surface` ground rect plus `stroke-text` lines (`fill-text` dots), so the tokens paint them.
- **The room left for marks, a variant per state:** add variant patterns to `swatchPatterns()` (say `-muted`, whose pattern element sets `--color-text: var(--color-text-muted)`; `-wiped`, with `--color-surface: var(--color-surface-subtle)`; and muted-and-wiped), expose them as `--swatch-N-muted` and so on beside `--swatch-N`, and have the part remap its own: `[data-mark="muted"] { --swatch-1: var(--swatch-1-muted); … }`, hover the same with `-wiped`. Custom properties inherit, so a remap on the part reaches its swatch shapes and nothing else, and 04's class swap (`fill-swatch-2` → `fill-swatch-5`) keeps working. `reversed` needs no pattern: give the swatch shape `fill: var(--color-surface)`, which the mark already sets to ink.
- **Forced colours:** `figure-colours.css` sets `--color-text: CanvasText; --color-surface: Canvas` on `.figure pattern` under `forced-colors: active`, and the Stage's own remap on `.stage-figure > svg` reaches the patterns too. A muted variant's own `--color-text` must win over that rule in forced colours (GrayText, as the Stage paints `muted`), so order or scope its rule accordingly; and hover never applies there.
- **The marks' selectors:** `step-applier.ts`'s `changes` don't match `fill-swatch-N` (`[class*="-surface"]`, `-text`, `-accent`), so a part whose only shapes are a swatch area and its label is something only labels make markable today; widen the shared description rather than the page alone.
- The test fixture `coloracao` in `tests/check/valid-artifacts.test.ts` already has a Stage (`cores.build.ts`) on the swatched drawing, marking a part `strong`.

### 2026-11-09: notes from swatches 02

- **The label checks to reuse:** `swatchProblems(drawing, colours)` in `design-system/src/swatches.ts` returns one message per broken rule (names, labels, groups, swatches past the names), each saying what to write. `Figure` throws them as `componentError("Figure", problems.join("; "))`; the Stage can spread them into its own `problems` so they land on its one `Stage: …` line. Without `colours` it names the colours 1 to 6.
- **Plates are already on Stage drawings.** `InlineSvg` runs `platedLabels` on every drawing it gets `swatches` for, so a Stage's labels already sit on plates: a `<rect class="fill-surface" data-swatch-plate>` just before each `<text data-swatch>`, inside the part. So `reversed` on a part already turns the plate to ink (it paints `-surface`) and the unclassed label to the ground, which is the spec's "reverses its plate", once the mark's selectors reach the part. `fill-swatch-N` itself still matches no mark.
- **Label style:** `figure-colours.css` sets `.figure text[data-swatch]` at 15px, `text-anchor: middle`, `dominant-baseline: central`, at the frame's weight (500), so `strong`'s 700 has to beat no weight rule there. In forced colours it sets the label's `color: CanvasText` and the plate's `--color-surface: Canvas` (`.figure [data-swatch-plate]`); a muted label's GrayText must outrank that `color` rule (specificity 0,2,1).
- **The catalog's swatch Figures** (`catalog/swatches.svg`, a total colouring of a six-cycle with `colours`, and `catalog/swatch-numerals.svg`, a triangle in numerals) are "the swatch Figure from 02" that 03's shared-parts check names.
