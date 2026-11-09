# Colour as the subject is drawn as swatches, not hue

When a drawing's subject is a colouring (a graph or map colouring, an edge colouring, a red-black tree, tri-colour marking), each colour is drawn as a **swatch**: one of six hatchings in ink, with a label naming the colour on a ground plate. The label is the colour, and the hatching repeats it so the eye can group parts at a glance. Ground means uncoloured. Edges take the label only. The One Ink Rule stands: the design system still draws no hue.

A graph-colouring artifact had to invent its own convention (line styles for colours, white and black discs, a number on every part, a legend and an opening paragraph), and the next artifact would have invented another. Its line styles also collided with the Stage's marks: dashed already means provisional, grey means no longer available, and an ink fill means the one current thing. The swatches use none of the forms the marks use, so every mark still works on a coloured part.

We rejected:

- **A narrow hued exception**, a few `light-dark()` hues for figure categories. The Shape, Not Hue Rule still requires a shape or label beside each hue for colour-blind readers, black-and-white print and forced colours, so it would be two encodings of one meaning, and it would break the page's founding look.
- **Documenting a convention drawn with today's classes.** Every agent would re-derive it in its own SVG, and the check couldn't tell a colour from a mark.
- **Ink, wiped grey, grey or figure grey as colours.** Each already means something: reversed, hover, muted, and too faint to see.
- **A fill or line form alone, read through a legend.** Fills collapse in forced colours, and line forms are the marks'.

## Consequences

- At most six colours per drawing. A seventh joins by an owner-confirmed proposal.
- Subjects where the hue itself is the fact (optics, colour models, flame tests) aren't covered: they would need a new rule, not this one, and join by proposal when an artifact needs them.
- A Stage step can change a part's colour. This is a change to how an existing part is drawn, not a per-run drawn structure, so it stays within ADR 0007.
- Swatches live in Figures and Stage drawings. D2 draws only its theme colours, so a colouring is a Figure.
