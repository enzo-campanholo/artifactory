# 03: A Stage's coloured drawing and the marks on its coloured parts

Status: resolved
Blocked by: 02

Source: [Swatches](../spec.md) › Behaviour: the Stage (marks and hover) and › Shared parts.

Design-system work: run it in a local session with impeccable.

**What to build:** a Stage's drawing can be coloured as written, with the same swatches, labels and names as a Figure, and every mark a build puts on a coloured part still reads. The Stage takes `colours` as `Figure` does, and its drawing as written passes the same label checks. On a coloured part, `strong` sets its outline at 4 and its label at 700; `dashed` dashes its outline; `muted` turns its hatching, outline and label grey; `reversed` fills it with ink over the hatching and reverses its plate, so the label reads in the ground. On a device that hovers, a clickable coloured part wipes the hatching's ground grey and keeps its lines. Print and the page without JavaScript show the colours as written, with no marks.

- [x] `Stage` takes `colours` (names in swatch order, numerals without it), and its drawing as written fails the build on the same rules as a Figure's, as `Stage: …`, with the Stage's other rules in one line.
- [x] All four marks on a coloured vertex and a coloured edge look as above in both themes; in forced colours `reversed` stays filled and `muted` stays grey, as the Stage paints marks today.
- [x] Hover on a clickable coloured part wipes the hatching's ground grey and keeps its lines, never in forced colours and never on the `reversed` part.
- [x] The check accepts each of the four marks on a coloured part, a part whose only shapes are a `fill-swatch-N` area and its label included, and still fails a mark on a part it can't change; the page refuses the same. `tests/check` covers a coloured part taking every mark.
- [x] `Stage`'s doc comment (and so `COMPONENTS.md`, via `pnpm components`): the `colours` prop, and under **Marks** what each mark does on a coloured part.
- [x] `DESIGN.md` › Stage: the marks on a coloured part and hover on one; `.impeccable/design.json` follows.
- [x] The `artifact` skill's `stage.md` (**Marks act on some colour classes only**) adds the four marks on coloured parts, in the same commit as the check change.
- [x] The catalog's Stage page gains a Stage whose drawing is coloured as written and whose build, stepped by the catalog script, shows each mark on a coloured vertex, with a clickable coloured vertex to hover; 04 may grow it into the greedy colouring.
- [x] Shared parts: `Stage.astro`'s mark and hover rules reach every Stage, and `figure-colours.css` every Figure, Stage drawing and figure Stepper: check the Prim Stage (`prim-graph.svg`) and the mdc Stages on the catalog in both themes, print and forced colours, with the same evidence as the new Stage, and the swatch Figure from 02.

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

### 2026-11-09: resolved

**Result.** A Stage's drawing can be coloured as written, as a Figure's is. `Stage` takes `colours`, and its drawing as written fails the build on the same label rules, as `Stage: …` on one line with the Stage's other rules (`swatchProblems` spread into its `problems`). Every mark reads on a coloured part. `strong` sets the outline at 4 and the label at 700. `dashed` dashes the outline. `muted` greys the hatching, the outline and the label. `reversed` fills the area with ink over the hatching and turns the plate to ink under a label in the ground. On a hover device a clickable coloured part wipes its hatching's ground (and its plate) grey and keeps the lines; a muted one keeps its grey lines. Hover never applies in forced colours or to the reversed part. Print and the page without JavaScript show the colours as written, with no marks.

**Construction.**

- `swatchPatterns(marked)` in `swatches.ts`: a Stage drawing (`InlineSvg swatches="marked"`) holds each hatching four times: as written, `-muted`, `-wiped` and `-muted-wiped`. Each variant's `<pattern>` sets its own tokens in a `style` (`--color-text: var(--color-text-muted)`, `--color-surface: var(--color-surface-subtle)`), which beats `figure-colours.css`'s forced-colours rule on `pattern`. A Figure (`swatches="plain"` through `SvgImage`) keeps only the six, byte-identical to before.
- `Stage.astro` remaps `--swatch-1` to `--swatch-6` on the part: `muted` to the `-muted` variants, hover to `-wiped` (`-muted-wiped` on a muted part), and `reversed` to `var(--stage-ink)`. A `fill-swatch-` shape without a `stroke-` class takes the mark's own outline: `strong` an ink stroke at 4, `dashed` at 2 dashed `6 4`.
- In forced colours the Stage sets `--color-surface: inherit` on `[data-swatch-plate]` and `color: inherit` on `text[data-swatch]`, over `figure-colours.css`'s Canvas/CanvasText. The drawing's tokens are the system's already, so the plate and label follow their part's mark: `reversed` stays filled, with an ink plate, and `muted` stays GrayText.
- The shared description of what each mark acts on (`changes` in `step-applier.ts`, used by the page and by the check's runs alike) counts `[class*="fill-swatch-"]` for all four marks. So a part whose only shapes are a swatch area and its label takes `dashed` too, and its failure text reads "shapes with a `stroke-` or `fill-swatch-` class".

**Commits.** 83338fb (claim), 88efd72 (Stage `colours`, marks and hover, check, docs, skill, catalog, tests), this closing commit, and the merge of the integration tip.

**Validation.**

- Test first. In `tests/check/artifact-failures.test.ts`, a Stage whose drawing as written has a mislabelled colour and a swatch past `colours`, and no build file, fails as one `Stage: there is no … ; a label reads …; swatch 3 is past …` line. Red first, it gave a `TS2322` on `colours` and the Stage line without the label rules.
- In `tests/check/valid-artifacts.test.ts`, `coloracao` gains a Stage with `colours={["Az", "Vm"]}` whose build marks a stroked vertex, a coloured edge and an outline-less swatch area with each of the four marks, one step each. The check passes it; red first, `dashed` on the area failed as "changes nothing in it". The hatching test now counts five drawings: six patterns for each Figure, 24 for each Stage drawing, every `url(#…)` naming a pattern inside its drawing, with page-unique IDs. The label test lists the new labels.
- `tests/check/artifact-checks.test.ts`'s `marca` (a `dashed` mark on a `fill-muted` dot) still fails, with the new wording.
- Browser, against the build: the catalog's colouring Stage at step 2, and the same Stage with a coloured edge and an outline-less swatch area under each mark injected beside it. Shot in light, dark, print, forced light and forced dark at DPR 1, and at DPR 2 on screen. Computed paint was recorded per vertex: fill (`url(#…-muted)` for muted, ink for reversed), outline width and dash, label fill and weight, and plate fill. Print shows every part as written (`url(#swatch-1-2)` on the reversed vertex, controls hidden). Headless Chrome never matches `(hover: hover)`, so the hover probe lifted that gate in the page, keeping `(forced-colors: none)`. Hovered, C, E and B took `-wiped`, `-muted-wiped` and `-wiped` with grey plates in light and dark, A (reversed) stayed ink, and in forced light nothing changed. Scripts: `capture-swatch-marks.ts` and `probe-hover.ts` in the pass's shared notes.
- The impeccable detector found nothing in the changed files.
- The full `scripts/heavy pnpm check` gate ran on the merged HEAD.

**Decisions.**

- Variant patterns per state, not a mask or an overlay, as 01's construction left room for: remapping `--swatch-N` on the part keeps 04's class swap working with every mark.
- Only Stage drawings carry the variants (`InlineSvg`'s `swatches` became `"plain" | "marked"`), so a Figure's markup stays as it was.
- `reversed` remaps the swatch to `--stage-ink` rather than adding a fill rule, so the hatching goes under ink the way every other `reversed` fill does.
- An outline-less swatch area takes every mark. `strong` and `dashed` draw the outline the area lacks (4, and 2 dashed), so the ticket's "a part whose only shapes are a `fill-swatch-N` area and its label" takes `dashed`, which acted on nothing before.
- Hover wipes the plate grey along with the hatching's ground, as it wipes every `-surface` fill of the part. The label stays ink on it.
- A reversed edge keeps today's behaviour: its line turns to the ground and its plate to ink, as Prim's edge groups already do. Only a vertex is ever reversed in the existing builds.
- A hatching swap doesn't fade (fill from `url()` is discrete) while the outline and label do: noted on 04.
- The catalog's colouring Stage checks a proper 3-colouring of a house graph vertex by vertex. Stepped to step 2 from E, all four marks sit on coloured vertices: E checked (`muted`), A current (`reversed`), its unchecked neighbours B and D `strong` with their edges, C ahead `dashed`. The colours are R, G and Y, so no colour shares a vertex's name. It is the page's last Stage, so no other Stage's figure number moved.
- The skill's `stage.md`, `figures.md` and `rules.md` and `COMPONENTS.md`'s "Swatches" paragraph (`component-reference.ts`) name the Stage's colouring alongside the Figure's.

**Shared parts.**

- `Stage.astro`'s mark, hover and forced-colours rules reach every Stage; `InlineSvg.astro` and `SvgImage.astro` reach every Figure, Stage drawing, Diagram and Stepper. `swatches.ts` reaches Figures and Stage drawings that use swatches. `step-applier.ts`'s `changes` reaches every Stage's runs on the page and in the check. `figure-colours.css` didn't change.
- Checked against a baseline build of the integration tip (7d549b5), same script, five modes: every other Stage on `/catalog/stage/` (Prim before a choice and mid-run with `prim-graph.svg`, mdc, mdc refused, even-bs, even-bs refused, Collatz, the 0-numbered listing, factorial), and both swatch Figures from 02 on `/catalog/` (`swatches.svg`, `swatch-numerals.svg`). All 55 shots are PNG-identical, in light, dark, print, forced light and forced dark.

**Left undone.** Nothing in scope. Steps that colour parts, the empty label, and the fade of a colour change are 04's (noted there).

**Known flake hit.** `tests/check/reporting.test.ts`'s README mode: `README.md` was 0600 in this worktree; `chmod 644 README.md` (no content change).
