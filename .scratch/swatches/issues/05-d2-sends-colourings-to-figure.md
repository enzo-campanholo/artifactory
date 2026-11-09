# 05: D2 sends colourings to Figure

Status: resolved
Blocked by: 02

Source: [Swatches](../spec.md) › Not in D2, and › Documentation.

**What to build:** an agent who reaches for colour in a D2 diagram is told where colourings go. D2 still draws only its theme colours and the check still fails a colour written in the file and `style.fill-pattern`; their failure text now adds that a colouring is drawn as a Figure with swatches. Swatches stay out of D2.

- [x] The D2 failures for a colour written in the file (`style.fill`, `style.stroke`, `style.font-color`) and for `style.fill-pattern` add that a colouring is drawn as a Figure with swatches; the other D2 failures are unchanged.
- [x] `tests/check`'s existing D2 failure case asserts the new text, extended rather than duplicated.
- [x] In the same commit, the `artifact` skill's `d2.md` (The design system's style, Failures) sends colourings to Figure.
- [x] `Diagram`'s doc comment sends colourings to `Figure`; run `pnpm components`. A doc comment only, so no catalog change: say so in the closing comment.

## Comments

### 2026-11-09: notes from swatches 02

- `Figure`'s doc comment now has a **Colourings** paragraph (swatches, labels, `colours`, edges by label, no legend), and the `artifact` skill's `figures.md` a **Colourings** bullet. The D2 failure text and `d2.md` can send an agent there by those names.

### 2026-11-09: resolved

**Result:** the D2 failures for a colour written in the file (`style.fill`, `style.stroke`, `style.font-color`) and for `style.fill-pattern` now end "leave it out, and draw a colouring as a Figure with swatches"; every other D2 failure reads as before. The `artifact` skill's `d2.md` (The design system's style, Failures) and `Diagram`'s doc comment send colourings to `Figure` › "Colourings" and `figures.md` › **Colourings**; `COMPONENTS.md` regenerated with `pnpm components`. Swatches stay out of D2.

**Commits:** `2929239` (claim), `df81bf9` (check text, test, `d2.md`, `Diagram` doc comment, `COMPONENTS.md`, in one commit as `CODING_STANDARDS.md` › Code asks).

**Validation:** red then green on `tests/check/artifact-failures.test.ts` › "fails at each link, tooltip, icon, shadow, fill pattern, animation, fade, written colour, sketch and legend a D2 file asks for", the existing case extended (its fill-pattern and `style.fill` lines assert the new text; no new fixture). Full `pnpm check` gate on the final HEAD after merging the integration tip.

**Decisions:**

- The added text is an instruction in the same form as the other D2 failures' remedies ("put it in the prose"): "leave it out, and draw a colouring as a Figure with swatches", rather than a separate sentence, so the line still reads as one refusal and its remedy.
- The written-colour failure carries it for all three keys (`fill`, `stroke`, `font-color`), since they share one rule; the fixture's `style.fill` line covers that rule, so no `stroke` or `font-color` fixture was added.
- `Diagram`'s doc comment is a doc comment only: no visual, token or style change, so no catalog page or browser check. impeccable's context was loaded for it, and it needs no design pass.

**Shared parts:** none reached. `src/diagrams.ts` is the D2 check, not a listed shared part, and `d2-board.ts` is untouched.

**Left undone:** nothing.
