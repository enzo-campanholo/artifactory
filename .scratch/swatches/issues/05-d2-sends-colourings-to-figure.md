# 05: D2 sends colourings to Figure

Status: ready-for-agent
Blocked by: 02

Source: [Swatches](../spec.md) › Not in D2, and › Documentation.

**What to build:** an agent who reaches for colour in a D2 diagram is told where colourings go. D2 still draws only its theme colours and the check still fails a colour written in the file and `style.fill-pattern`; their failure text now adds that a colouring is drawn as a Figure with swatches. Swatches stay out of D2.

- [ ] The D2 failures for a colour written in the file (`style.fill`, `style.stroke`, `style.font-color`) and for `style.fill-pattern` add that a colouring is drawn as a Figure with swatches; the other D2 failures are unchanged.
- [ ] `tests/check`'s existing D2 failure case asserts the new text, extended rather than duplicated.
- [ ] In the same commit, the `artifact` skill's `d2.md` (The design system's style, Failures) sends colourings to Figure.
- [ ] `Diagram`'s doc comment sends colourings to `Figure`; run `pnpm components`. A doc comment only, so no catalog change: say so in the closing comment.
