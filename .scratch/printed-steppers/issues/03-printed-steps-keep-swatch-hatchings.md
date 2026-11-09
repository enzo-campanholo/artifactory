# 03: Printed steps keep swatch hatchings

Status: wontfix
Blocked by: 01: Print every step of a figure Stepper whose parts leave

**What to build:** a figure Stepper whose parts leave and whose areas take swatches prints each step with every hatching drawn, in ink on white, as the drawing shows on screen; the page keeps unique ids. [Printed Steppers](../spec.md) › Each printed step requires that every printed step keeps "the patterns that Swatches' hatchings use", and those hatchings only exist once Swatches lands.

Design-system work: it runs in a local session with impeccable (`design-system/CLAUDE.md`).

- How the hatchings reach a drawing is Swatches' choice. If they are patterns inside each drawing's SVG and are added after ticket 01 copies the drawing (inside `InlineSvg.astro`, say), every printed step would carry the same pattern ids: the page then fails html-validate's duplicate-id rule and a step may paint another step's pattern. Make each step's pattern ids its own, as ticket 01 does for the drawing's own ids, deterministically. If the hatchings are drawn some way that needs no ids, say so in the closing comment and only check.
- A change to `InlineSvg.astro` or `figure-colours.css` reaches `Figure`, `Diagram`, `Stage` and the Stepper's D2 boards: name them in the closing comment and check a swatch `Figure` and a swatch `Stage` on their catalog pages in print, with the same evidence.
- Check against a figure Stepper whose parts leave, with at least two swatches and a part whose swatch shows only in an early step. A throwaway drawing in a fixture or a local page is enough; the catalog's swatch pages are Swatches'.

- [ ] A print-media screenshot, in light, shows each swatch's hatching and its label plate in every printed step that holds the part, with the right hatching on each part.
- [ ] If the hatchings use ids, every id in the built page is unique and every pattern reference in a printed step resolves inside that step; seam 1 extends ticket 01's built-site test with a hatched part to show it. If they don't, the closing comment says so.
- [ ] On screen the Stepper and its hatchings look and step as before. `pnpm check` passes.

## Comments

### 2026-11-08: wontfix

Swatches are only for `Figure` and `Stage` ([Swatches](../../swatches/spec.md)), so a figure Stepper carries no swatches and its printed steps have no hatchings to keep. A Stepper that needs swatches is a new proposal, and this check would come back with it. Decided by the owner, /to-tickets review in the Artifact generation gaps session, 2026-11-08.
