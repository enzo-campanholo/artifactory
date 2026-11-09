# 06: Colour where colour is the subject

Type: grilling
Status: resolved

## Question

When colour is the subject being taught, such as graph colouring, should figures be able to use distinct colours?

## What the agents reported

A graph-colouring artifact couldn't draw colours: figures and diagrams use only the design system's ink, grey and ground. Each colour became a line style (solid, dashed, dotted, dash-dot) and vertices became white and black discs. Every coloured edge and vertex also carries its colour number, each figure has a legend, and the opening paragraph explains the convention.

## To decide

`DESIGN.md` makes "one ink on one ground, no hue" a founding rule, and "state is a line form or a drawn sign, never a hue". So the choice is between:

- keeping the rule, and documenting the line-style and number-label convention in `COMPONENTS.md` so the next agent doesn't reinvent it, and
- a narrow exception, such as a small categorical set of figure classes, which has to work in dark mode, in print and for colour-blind readers.

## Answer

Decided with the owner on 2026-11-08 (grilling session, rounds 1 to 4, every recommendation accepted). The build is specified in [Swatches](../../swatches/spec.md), and [ADR 0009](../../../docs/adr/0009-colour-as-the-subject-is-drawn-as-swatches.md) records why.

- **Scope:** categorical colouring only, where colours are labels from a finite set (graph and map colouring, edge colourings, red-black trees, tri-colour marking). Hue as the subject's fact (optics, colour models, flame tests) is out of scope and joins by proposal.
- **The One Ink Rule stands.** Rejected: a narrow hued exception, which the Shape, Not Hue Rule would still make carry a shape beside every hue, and documentation only, which leaves each agent to re-derive the encoding.
- **Swatches**, a new term in `GLOSSARY.md` (_category_ was taken by Subject's _Avoid_): six hatchings in ink (`/`, `\`, cross-hatch, horizontal, vertical, dots) as `fill-swatch-1` to `fill-swatch-6`. Ground means uncoloured; ink, wiped grey, grey and figure grey are refused because they read as `reversed`, hover, `muted` and too faint. A seventh joins by proposal.
- **The label is the colour.** Every coloured part shows its colour's name on a ground plate; areas also take the swatch, and edges take the label only, so no line form stands for a colour.
- **Names:** a Figure or Stage names its colours once, in order, one or two characters each, numerals by default. The check fails a label that doesn't match its swatch.
- **Steps colour parts** with `Step.colours` (part → swatch number or `null`). Not a per-run drawn structure, so within ADR 0007.
- **All four marks work on a coloured part;** `reversed` fills it with ink and keeps the label readable.
- **Figures and Stage drawings only;** D2's docs send colourings to Figure. **No legend:** the prose names the colours once.
- While writing the spec, the label became the one place a part's swatch number is written (`<text data-swatch="N">`), so an edge, which has no fill, carries its colour the same way an area does. Areas still take `fill-swatch-N`.
