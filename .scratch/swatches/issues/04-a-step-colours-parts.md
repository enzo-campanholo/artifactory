# 04: A step colours the drawing's parts

Status: ready-for-agent
Blocked by: 03

Source: [Swatches](../spec.md) › Behaviour: the Stage (A step can colour parts), and › Documentation. Within ADR 0007: a step changes how an existing part is drawn, as `CellChange.text` changes a cell, and draws no new structure (the "not yet" that [Stage choice groups](../../stage-choice-groups/spec.md) keeps).

Design-system work: run it in a local session with impeccable.

**What to build:** a colouring algorithm can be stepped through. `Step` gains `colours`, optional: colours on the drawing's parts by their `data-part` name, by swatch number from 1, in this step. On a coloured part, its `fill-surface` and `fill-swatch-*` shapes take swatch N and its label takes N and colour N's name; `null` makes it uncoloured (ground, label hidden); a part left out stays as written. Steps stay whole, so a step names every colour it shows, and going back shows that step's colours. Its `say` names the colours it sets, by name. When motion is allowed a colour change cross-fades over 0.2s, as marks do; print and the page without JavaScript show the colours as written.

- [ ] A build's step can colour a part, uncolour it with `null`, and leave it as written by leaving it out; stepping forward and back shows each step's colours whole, with each step's marks on top as 03 draws them.
- [ ] A part coloured by a step reads exactly like one coloured as written: hatching, label text and plate.
- [ ] A part a step colours must hold a label `<text data-swatch>`; when it is uncoloured as written the label is empty, and the drawing-as-written checks from 02 and 03 accept that empty label in a Stage.
- [ ] The check, running every option or example against the built page, fails as `stage-run` with the option or example and the step named, and the page refuses the same: a `colours` entry on a part without a label, a part the drawing doesn't have, a number past the Stage's names, and a number that isn't a whole number from 1 to 6. The built page carries what the check needs for this (the Stage's names, which parts hold a label).
- [ ] `Step.colours` takes `number | null` per part, so a greedy colouring passes the colour it computes without a cast. A colour outside 1 to 6 fails the build as `stage-run`, above, not through the type.
- [ ] When motion is allowed a colour change cross-fades over 0.2s; with reduced motion it changes at once. A change of pattern fill doesn't transition by itself, so this likely needs layering.
- [ ] Print shows every part as written mid-run, from the stylesheet alone, as cells do today (a label whose text a step changed keeps its written text for print).
- [ ] `tests/check` covers each new run failure against a fixture artifact, a step giving a colour outside 1 to 6 among them, failing as `stage-run`.
- [ ] Docs, in the same commit: `Step.colours`'s doc comment in `stage-build`; `Stage`'s doc comment (steps colour parts, the label a coloured part must hold, `say` naming colours by name, the failures) and `pnpm components`; `DESIGN.md` › Stage (`colours` in a step, the cross-fade) and `.impeccable/design.json`; the `artifact` skill's `stage.md` (the `colours` field and each new failure line) and `rules.md` › Custom builds' list of what the Stage takes.
- [ ] The catalog's Stage page runs a greedy colouring step by step, the drawing uncoloured as written, with each mark on a coloured vertex and hover on a clickable one, stepped by the catalog script to where they show; checked in both themes, print (as written) and forced colours.
- [ ] Shared parts: `Stage.astro`'s motion and print rules reach every Stage: check that the Prim and mdc Stages still cross-fade their marks and print as written. The step applier and the Stage element reach only the Stage and the check's runs.
