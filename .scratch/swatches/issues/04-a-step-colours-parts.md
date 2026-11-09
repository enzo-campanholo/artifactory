# 04: A step colours the drawing's parts

Status: resolved
Blocked by: 03

Source: [Swatches](../spec.md) › Behaviour: the Stage (A step can colour parts), and › Documentation. Within ADR 0007: a step changes how an existing part is drawn, as `CellChange.text` changes a cell, and draws no new structure (the "not yet" that [Stage choice groups](../../stage-choice-groups/spec.md) keeps).

Design-system work: run it in a local session with impeccable.

**What to build:** a colouring algorithm can be stepped through. `Step` gains `colours`, optional: colours on the drawing's parts by their `data-part` name, by swatch number from 1, in this step. On a coloured part, its `fill-surface` and `fill-swatch-*` shapes take swatch N and its label takes N and colour N's name; `null` makes it uncoloured (ground, label hidden); a part left out stays as written. Steps stay whole, so a step names every colour it shows, and going back shows that step's colours. Its `say` names the colours it sets, by name. When motion is allowed a colour change cross-fades over 0.2s, as marks do; print and the page without JavaScript show the colours as written.

- [x] A build's step can colour a part, uncolour it with `null`, and leave it as written by leaving it out; stepping forward and back shows each step's colours whole, with each step's marks on top as 03 draws them.
- [x] A part coloured by a step reads exactly like one coloured as written: hatching, label text and plate.
- [x] A part a step colours must hold a label `<text data-swatch>`; when it is uncoloured as written the label is empty, and the drawing-as-written checks from 02 and 03 accept that empty label in a Stage.
- [x] The check, running every option or example against the built page, fails as `stage-run` with the option or example and the step named, and the page refuses the same: a `colours` entry on a part without a label, a part the drawing doesn't have, a number past the Stage's names, and a number that isn't a whole number from 1 to 6. The built page carries what the check needs for this (the Stage's names, which parts hold a label).
- [x] `Step.colours` takes `number | null` per part, so a greedy colouring passes the colour it computes without a cast. A colour outside 1 to 6 fails the build as `stage-run`, above, not through the type.
- [x] When motion is allowed a colour change cross-fades over 0.2s; with reduced motion it changes at once. A change of pattern fill doesn't transition by itself, so this likely needs layering.
- [x] Print shows every part as written mid-run, from the stylesheet alone, as cells do today (a label whose text a step changed keeps its written text for print).
- [x] `tests/check` covers each new run failure against a fixture artifact, a step giving a colour outside 1 to 6 among them, failing as `stage-run`.
- [x] Docs, in the same commit: `Step.colours`'s doc comment in `stage-build`; `Stage`'s doc comment (steps colour parts, the label a coloured part must hold, `say` naming colours by name, the failures) and `pnpm components`; `DESIGN.md` › Stage (`colours` in a step, the cross-fade) and `.impeccable/design.json`; the `artifact` skill's `stage.md` (the `colours` field and each new failure line) and `rules.md` › Custom builds' list of what the Stage takes.
- [x] The catalog's Stage page runs a greedy colouring step by step, the drawing uncoloured as written, with each mark on a coloured vertex and hover on a clickable one, stepped by the catalog script to where they show; checked in both themes, print (as written) and forced colours.
- [x] Shared parts: `Stage.astro`'s motion and print rules reach every Stage: check that the Prim and mdc Stages still cross-fade their marks and print as written. The step applier and the Stage element reach only the Stage and the check's runs.

## Comments

### 2026-11-09: notes from swatches 02

- **An empty label fails today.** `swatchProblems` in `design-system/src/swatches.ts` (the check 03 reuses for a Stage's drawing as written) fails a `<text data-swatch="…">` whose value isn't a number ("names no swatch") and a label whose text isn't its colour's name. The empty label of a part uncoloured as written needs a form you choose (`data-swatch=""` with no text, say) and an exception there for a Stage.
- **Plate size comes from the labels as written.** `platedLabels` draws an 18-unit plate when every label in the drawing is one character and 24 when any has two (Archivo at 15 units: one character is at most 13 wide, two up to 25). A step that gives a part a two-character name on a drawing written with one-character labels (or empty ones) would overflow its plate: size it from the Stage's `colours` instead, which `platedLabels` doesn't take yet.
- **A label's position needs no change.** The label is centred on its `x` and `y` by CSS, and the plate is centred on the same point, so a step changes only the label's text and `data-swatch` and the area's `fill-swatch-N` class.

### 2026-11-09: notes from swatches 03

- **Marks on a coloured part go through `--swatch-N`.** `swatchPatterns(marked)` gives a Stage drawing each hatching four times: as written, `-muted` (its pattern sets `--color-text: var(--color-text-muted)`), `-wiped` (`--color-surface: var(--color-surface-subtle)`) and `-muted-wiped`, as `--swatch-N`, `--swatch-N-muted` and so on, on `InlineSvg`'s `<g aria-hidden>`. `Stage.astro` remaps all six on the marked or hovered part: `muted` to `-muted`, hover to `-wiped` (`-muted-wiped` on a muted part), `reversed` to `var(--stage-ink)`. So 04's class swap (`fill-swatch-2` → `fill-swatch-5`) needs nothing more for the marks to follow; a Figure still gets only the six.
- **No fade on a hatching swap.** `fill` from one `url()` to another, or to a colour, is discrete, so a mark that changes a hatching (`muted`, `reversed`, hover) swaps it at once while the outline and label fade over 0.2s. 04's cross-fade layering for a colour change could carry the marks' swaps too; nothing in 03 depends on that.
- **What a mark acts on is read from the drawing as written.** `marksTaken` in `step-applier.ts` checks the part as written against `changes`, which now counts `[class*="fill-swatch-"]` for all four marks. A part uncoloured as written (`fill-surface` without a `stroke-` class) takes `strong` (its label), `muted` and `reversed`, but not `dashed`, even on a step that colours it. Decide whether a part a step can colour (one holding a label) takes every mark.
- **An outline-less swatch takes the mark's outline:** `[class*="fill-swatch-"]:not([class*="stroke-"])` under `strong` (4) and `dashed` (2, `6 4`). A shape 04 swaps from `fill-surface` to `fill-swatch-N` at runtime picks that up by class.
- **Forced colours:** the Stage sets `--color-surface: inherit` on `[data-swatch-plate]` and `color: inherit` on `text[data-swatch]` under `forced-colors: active`, over `figure-colours.css`'s Canvas/CanvasText, so the plate and label follow their part's mark. A label a step empties keeps that.
- **The catalog's Stage:** "A colouring, mid-run" ends `/catalog/stage/` (Figure 10.1), build `colouring-check`, drawing `colouring.svg` (a house graph coloured as written, `colours={["R", "G", "Y"]}`), stepped to step 2 from E, where every mark sits on a coloured vertex. Grow it into the greedy colouring (uncoloured as written) or add yours after it; it is the page's last Stage, so nothing below moves.
- **Captures:** the shared notes folder has `swatch-mark-captures.md`. Print and forced colours need one CDP `setEmulatedMedia` call with both media and features, and headless Chrome never matches `(hover: hover)`, so the hover probe lifts that gate in the page.

### 2026-11-09: resolved

**Result.** `Step.colours` (`Record<string, number | null>`) colours the drawing's parts step by step. A part a step gives swatch N reads as one written with it: hatching, label on its plate, and every mark. `null` gives it the ground and hides its label and plate, and a part left out stays as written. The check (`stage-run`) and the page refuse a colour on a part the drawing lacks, on a part without a label, past the Stage's names, or that isn't a whole number from 1 to 6, plus a `colours` that isn't an object. A Stage accepts an empty label, `<text x y data-swatch=""></text>`, for a part uncoloured as written. The catalog's Stage page ends with "A greedy colouring, mid-run" (`greedy-colouring.build.ts`, `greedy-colouring.svg`), stepped to step 8 from E, where every mark sits on a coloured vertex. 03's colouring Stage stays above it.

**Commits.** `c2b09a5` (claim), `cffd7d6` (implementation, docs, catalog and tests), and this closing commit.

**Validation.**
- `tests/check/artifact-checks.test.ts`: a fixture Stage (`construcoes/colore`) fails as `stage-run` for each new failure, named by option and step, including colours 7, 1.5 and 0.
- `tests/check/valid-artifacts.test.ts`: a Stage uncoloured as written (`coloracao/pinta`) passes. Its build passes a computed `number` without a cast and marks an outline-less ground area `dashed` on the step that colours it. The built page gives that drawing its four sets of hatchings and sizes its empty labels' plates at 24 from `colours={["Az", "Vm"]}`.
- Browser, on the built catalog: the greedy Stage in light, dark, print, forced light and forced dark. The probe read back every step's colours, marks, labels and plates, forward 1 to 11, back to 9 and to 1, and a fresh run from B. Print mid-run shows the drawing as written (uncoloured, no plates). Hover on coloured vertices A, D and E takes the wiped hatchings, and never in forced colours. With motion allowed, right after a step the old hatching lies under the area (`[data-colour-fading]`) while the new fill's `fill-opacity` animates from 0, and after 400 ms nothing is left. With reduced motion nothing is laid under. No page errors.
- The full `pnpm check` gate ran on the merged HEAD.

**Decisions.**
- **Attribute, not class.** A step's colour is `data-colour="N" | "none"` on the part, painted by screen-only rules in `Stage.astro`. The swatch classes stay as written, so print and the page without JavaScript show the colours as written from the stylesheet alone. A label's step name is a second `<tspan class="stage-step-text">` beside the written text (`stage-as-written`), as cells do.
- **The cross-fade lays the old fill under the new one.** One pattern fill can't transition into another. So, only under `prefers-reduced-motion: no-preference`, the Stage clones each area with its old computed fill and no stroke, puts the clone under the area, and fades the area's `fill-opacity` in over 0.2s (Web Animations), then removes the clone. The label's name changes at once, as a cell's text does. The hatching swaps of `muted` and hover stay discrete, as 03 left them.
- **Which marks a coloured part takes (03's open question).** A part takes every mark on a step that gives it a number, since it then holds a swatch and a label. Otherwise what a mark acts on is read from the part as written, `null` included. An empty label counts for nothing.
- **The empty label.** The empty label is `data-swatch=""` with no text, accepted only in a Stage (`swatchProblems(…, "Stage")`). Text in it fails with its own message. Its plate is hidden, on screen and in print, until a step colours the part.
- **Plates fit the Stage's names.** `platedLabels` also takes the Stage's `colours` names, so a two-character name a step writes never overflows a plate sized for one-character or empty labels.
- **What the built page carries.** The page carries the names in `data-colours` on `.stage-figure`, the numerals when `colours` is left out. Which parts hold a label is read from the drawing (`text[data-swatch]` inside the part).
- **Hatchings for an uncoloured drawing.** A Stage drawing with a label but no swatch as written still gets its hatchings, the four sets.
- **Order of a colour's checks.** A colour is checked in this order: the part is missing, it has no label, the number isn't a whole number from 1 to 6, then it's past the names. `colours` entries that are `undefined` count as left out.

**Shared parts reached and checked.**
- `InlineSvg.astro`: the hatchings now go to a `marked` drawing that has labels but no swatch, and the plates take the names a step can give. Only the Stage passes either, and the Figure fixtures' hatchings, labels and plates still pass `valid-artifacts`.
- `Stage.astro`'s motion and print rules: Prim (as written and mid-run), mdc, collatz, sum-listing, factorial and 03's colouring Stage still transition their marks over 0.2s when stepped. They were shot in every mode, and the Prim and colouring Stages print as written.
- The step applier and the Stage element reach only the Stage and the check's runs.

**Left undone.** Nothing.
