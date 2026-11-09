# Swatches

Source: [Colour where colour is the subject](../artifact-generation-gaps/issues/06-colour-where-colour-is-the-subject.md), on the [Artifact generation gaps](../artifact-generation-gaps/map.md) map. Every decision below was made with the owner on 2026-11-08, and the ticket's `## Answer` records them. The why is [ADR 0009](../../docs/adr/0009-colour-as-the-subject-is-drawn-as-swatches.md).

Design-system work: it runs in a local session with impeccable (`design-system/CLAUDE.md`).

## Problem

A graph-colouring artifact couldn't draw colours, since figures use only ink, grey and ground. Each colour became a line style (solid, dashed, dotted, dash-dot), vertices became white and black discs, every coloured part carried its colour number, each figure had a legend, and the opening paragraph explained the convention. The line styles collide with the Stage's marks (`dashed` is provisional, `muted` is grey, `reversed` fills with ink), and a Stage step can't change a part's colour at all, so a colouring algorithm can't be stepped through.

## Behaviour: the swatches

A **swatch** (`GLOSSARY.md`) is one of six hatchings in ink, each standing for one colour of a colouring. In swatch order:

1. diagonal lines `/`
2. diagonal lines `\`
3. cross-hatch
4. horizontal lines
5. vertical lines
6. dots

- Each is ink lines or dots on the ground, at one fixed density and weight, chosen so all six tell apart on a part as small as a 2.75rem vertex. A hatching is a fill, not a rule, so the Three Weights Rule doesn't govern its lines (as with the proof's end square); the catalog fixes their weight and spacing, and `DESIGN.md` records them.
- **Ground means uncoloured.** No swatch is ink, wiped grey, grey or figure grey: those are `reversed`, hover, `muted` and too faint.
- They follow the theme (ink lines on near-black in dark mode), print as written in light, and paint with CanvasText on Canvas in forced colours.
- At most six per drawing. A seventh colour joins by proposal.

## Behaviour: the label is the colour

- Every coloured part (vertex, region, edge) shows a label naming its colour: one or two characters, on a square ground plate so it reads over the hatching. How the plate is drawn (a ground halo through `paint-order`, or a rect) is the implementer's, as long as it is square.
- An area (vertex, region) also takes its swatch. An edge takes the label only, at its midpoint: no line form ever stands for a colour, so solid, dashed, 4px and grey stay the marks'.
- **The colours' names:** a Figure or Stage names its colours once, in swatch order, with a `colours` prop (`colours={["R", "B"]}`). Without it, the names are the numerals 1 to 6. A name longer than two characters, or more than six names, fails the build.

### Writing one

- An area shape takes `fill-swatch-N` (N from 1 to 6), listed under "Colours in figures".
- The label is a `<text data-swatch="N">` beside the shapes it names, in the same `<g>`; its text is colour N's name. An edge's `<g>` holds the line and its label.
- The check fails a drawing where a label's text isn't its swatch's name, a `<g>` holds a `fill-swatch-N` shape and a label of another N or none, or N is past the names given.

## Behaviour: the Stage

- **A step can colour parts.** `Step` gains `colours` (`Record<string, number | null>`, optional): colours on the drawing's parts by their `data-part` name, by swatch number from 1, in this step. On a part, its `fill-surface` and `fill-swatch-*` shapes take swatch N and its label takes N and colour N's name; `null` makes it uncoloured (ground, label hidden). Leave a part out to keep it as written. As everywhere in a step, name every colour this step shows.
- A part a step colours must hold a label `<text data-swatch>` (empty when uncoloured as written); the check fails a `colours` entry on a part without one, or a number past the Stage's names. Its `defineBuild` types reject a number outside 1 to 6.
- This is not a per-run drawn structure ([Stage choice groups](../stage-choice-groups/spec.md) keeps that "not yet" under ADR 0007): no part is added, an existing part's drawing changes, as `CellChange.text` changes a cell.
- **Marks on a coloured part:** `strong` sets its outline at 4 and its label at 700; `dashed` dashes its outline; `muted` turns its hatching, outline and label grey; `reversed` fills it with ink over the hatching and reverses its plate, so the label reads in the ground. The check accepts all four on a coloured part.
- **Hover** on a clickable coloured part wipes the hatching's ground grey and keeps its lines.
- Print and the page without JavaScript show the colours as written. When motion is allowed, a colour change cross-fades over 0.2s, as marks do.
- A step's `say` names the colours it sets, by name, so it makes sense without the drawing.

## Not in D2

D2 draws only its theme colours and its check already fails `style.fill-pattern`, so swatches are Figure and Stage only. The D2 failure text for a colour or pattern adds that a colouring is drawn as a Figure with swatches.

## Documentation

- `DESIGN.md` › Colors: a Named Rule for swatches (six hatchings, ground uncoloured, label is the colour, edges by label, never a line form, at most six), next to the One Ink and Shape, Not Hue rules, which stay. `DESIGN.md` › Stage: the marks on a coloured part and `colours` in a step. `DESIGN.md` › Code, math and figures: swatches and labels in Figures. `.impeccable/design.json` with it.
- `Figure`'s and `Stage`'s doc comments and the `colours` prop's (and so `COMPONENTS.md`, via `pnpm components`): when to use swatches, the names, the label, edges. "Colours in figures" lists `fill-swatch-1` to `fill-swatch-6`. `Step.colours`'s doc comment in `stage-build`. `Diagram`'s doc comment sends colourings to `Figure`.
- No legend: the docs say to name the colours once in prose where they're first used ("colours 1 to 3"), and that a Figure's `alt` names each part's colour.
- The `artifact` skill: `figures.md` says that when colour is the subject the drawing uses swatches, never line styles or fills of its own; `stage.md` adds `colours` to the step and the four marks on coloured parts; `d2.md` sends colourings to Figure.
- The catalog: a Figure page with all six swatches on vertices and labelled edges, in both themes, print and forced colours; a Stage page running a greedy colouring step by step, with each mark on a coloured vertex and hover on a clickable one; a check failure for a label that doesn't match its swatch.

## Shared parts

`figure-colours.css` reaches every Figure and Stage drawing, and `Stage.astro`'s mark and hover rules reach every Stage: check the existing figure and Stage catalog pages (`prim-graph.svg`, the Prim and mdc Stages) in both themes, print and forced colours, with the same evidence as the new pages.

## Out of scope

- Hue as the subject's fact (optics, colour models, flame tests): a new rule by proposal when an artifact needs it.
- A seventh swatch, a legend component, and swatches in D2.
- Redrawing the private graph-colouring artifact with swatches: that is work in the private copy.
