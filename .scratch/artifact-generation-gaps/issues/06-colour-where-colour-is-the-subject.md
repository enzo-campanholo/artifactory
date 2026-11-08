# 06: Colour where colour is the subject

Type: grilling

## Question

When colour is the subject being taught, such as graph colouring, should figures be able to use distinct colours?

## What the agents reported

A graph-colouring artifact couldn't draw colours: figures and diagrams use only the design system's ink, grey and ground. Each colour became a line style (solid, dashed, dotted, dash-dot) and vertices became white and black discs. Every coloured edge and vertex also carries its colour number, each figure has a legend, and the opening paragraph explains the convention.

## To decide

`DESIGN.md` makes "one ink on one ground, no hue" a founding rule, and "state is a line form or a drawn sign, never a hue". So the choice is between:

- keeping the rule, and documenting the line-style and number-label convention in `COMPONENTS.md` so the next agent doesn't reinvent it, and
- a narrow exception, such as a small categorical set of figure classes, which has to work in dark mode, in print and for colour-blind readers.
