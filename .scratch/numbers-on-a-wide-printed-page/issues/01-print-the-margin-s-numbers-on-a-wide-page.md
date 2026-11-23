# 01: Print the margin's numbers on a wide page

Status: needs-triage
Blocked by: None (can start immediately)

Design-system work: run it in a local session with impeccable, after `PRODUCT.md` and `DESIGN.md`.

**Problem:** a printed page whose content box is 64rem or wider, such as A4 landscape (about 1047 px with Chrome's default margins), matches the frame's desktop rule, `@media (width >= 64rem)` in `design-system/src/ArtifactFrame.astro`. That rule hangs section, h3, clause and statement-label numbers `--hang` left of the text edge. In print, `.artifact` is `display: block; padding: 0`, so the text edge is the page's content edge and every number falls outside it. On the sample (`/rsa-from-scratch/`) emulated as print at 1047 px, the numbers are cut off entirely: "Breaking the toy" prints without its "10", and its first paragraph without "10.1". Narrower pages, such as A4 portrait, take the phone's inline numbers and print correctly. This was found while reviewing section-number alignment (`1bcd261`). The old rule hung the numbers 52 px out and lost them the same way, so it predates that change.

**What to build:** every number in the margin prints on a page of any width, on its text's baseline, the same way at every print width.

- [ ] On the sample printed in A4 landscape, every section, clause and statement-label number prints whole, beside its own text.
- [ ] A4 portrait and US Letter, in both orientations, print as they do today, or the same way as A4 landscape if the fix makes one print layout.
- [ ] The screen at 393 px, 1100 px and 1440 px is unchanged.
- [ ] DESIGN.md's Layout › Print says where numbers go on a printed page.
