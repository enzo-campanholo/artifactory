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
