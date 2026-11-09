# 02: Colour labels and the colours' names in a Figure

Status: ready-for-agent
Blocked by: 01

Source: [Swatches](../spec.md) › Behaviour: the label is the colour, and › Documentation.

Design-system work: run it in a local session with impeccable.

**What to build:** an agent drawing a graph colouring writes a Figure whose coloured parts each show the colour's name, and the build refuses a drawing whose labels and swatches disagree. The Figure takes `colours`, the colours' names in swatch order (`colours={["R", "B"]}`), numerals 1 to 6 without it. Every coloured part carries a label, a `<text data-swatch="N">` in the same `<g>` as the shapes it names, whose text is colour N's name, drawn on a square ground plate so it reads over the hatching. A vertex or region also takes `fill-swatch-N`; an edge takes the label only, at its midpoint, so solid, dashed, 4px and grey stay the marks'. No legend: the prose names the colours once and the Figure's `alt` names each part's colour.

- [ ] A coloured vertex, region and edge each show their label on a square ground plate (a ground halo through `paint-order`, a rect, or another square form, the implementer's choice), legible over every one of the six hatchings at a 2.75rem vertex at the drawing's smallest scale, in both themes, print and forced colours.
- [ ] `Figure` takes `colours`; without it the names are 1 to 6.
- [ ] The build fails, as `Figure: …` at the entry like any component's own rule, on: a name longer than two characters; more than six names; a label whose text isn't its swatch's name; a `<g>` holding a `fill-swatch-N` shape and a label of another N, or no label; a swatch number past the names given. Each message says what to write instead.
- [ ] `tests/check` covers these failures against a fixture artifact, at the failure line the check prints, including a label that doesn't match its swatch. This fixture stands for the spec's "catalog: a check failure for a label that doesn't match its swatch", since a drawing that fails the build can't sit in the catalog; if the owner wants the failure shown on a catalog page too, it is shown as text there. Keep the label checking where 03 can reuse it for a Stage's drawing as written.
- [ ] `Figure`'s doc comment and the `colours` prop's doc comment say when to use swatches (colour is the subject: a colouring of a graph, map or edges), the names, the label and its plate, edges by label only, at most six, no legend, the prose naming the colours once ("colours 1 to 3") and `alt` naming each part's colour; run `pnpm components`.
- [ ] `DESIGN.md` › Code, math and figures adds swatches and labels in Figures; `.impeccable/design.json` follows.
- [ ] The `artifact` skill, in the same commit as the check change: `figures.md` says that when colour is the subject the drawing uses swatches and labels, never line styles or fills of its own (and "Black on white" points there); `rules.md` › Build failures lists `Figure: …` among the components' own rules.
- [ ] The catalog's swatch Figure from 01 becomes the spec's Figure page: all six swatches on labelled vertices and labelled edges, in both themes, print and forced colours.
- [ ] Shared parts: if the plate or label styling goes into `figure-colours.css`, it reaches every Stage drawing and figure Stepper too: check the Prim and mdc Stages and the orbit Stepper as 01 did, and name them in the closing comment; if it stays inside `Figure`, say so.
