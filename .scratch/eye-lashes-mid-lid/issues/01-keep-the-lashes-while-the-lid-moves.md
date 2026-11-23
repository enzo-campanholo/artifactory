# 01: Keep the lashes while the lid moves

Status: resolved
Blocked by: None (can start immediately)

Design-system work: run it in a local session with impeccable, after `PRODUCT.md` and `DESIGN.md`.

**Problem:** the eye's drawing loses every lash partway through a blink, a peek or a press. In `design-system/src/eye-drawing.ts`, the upper lashes stand on the upper lid with a length scaled by `(corner - upper) / 20`. That scale falls through 0 as the lid passes the corners, where they stop standing and start hanging. The lower lashes scale by `1 - 1.6 lid`. Below `sunkLash` a lash sinks to nothing, so both sets are gone at once in the middle of the lid's travel. At either lift, the drawing has 8 lashes up to lid 0.32, then 6, 5, 3, 1, and **none from lid 0.50 to 0.74**, then 1, 3 and 5 from lid 0.84 to 1. The motion crosses that band in a few frames: about 2 in a blink and about 4 in a press or at the end of a peek. So the lashes flicker out and back, the one jump left once the motion became smooth (`d829def`, which closed `.scratch/eye-motion/issues/01-smoother-eye-motion.md`). Per-frame filmstrips from that ticket's review showed it in every blink, peek and press, the running head's 1× eye included. While the lid is about 0.8 to 0.9 the upper lid also sits a stroke's width from the lower lid and reads as one doubled line; judge on the catalog whether that wants a change too.

**What to build:** the lashes carry through the whole of the lid's travel, so the eye never draws without them, while the open, shut, widened and peeking poses look as they do today.

- [x] At every lid from 0 to 1, at lift 0 and lift 1, the drawing has lashes. A lash shorter than `shortestLash` still sinks into the lid rather than drawing a stub.
- [x] The four poses in `eyePoses` draw as they do now: compare them on `/catalog/eye/` before and after, at 4× and at the eye's own size. `peeking` gains its lower lashes, as the 2026-11-23 approved comment allows.
- [x] A blink, a peek and a press, recorded frame by frame on `/catalog/eye/`, show no frame where the lashes drop out and come back.
- [x] `DESIGN.md` says how the lashes move with the lid, if the change alters what it records.

## Comments

### 2026-11-23: approved

The owner ran `/implement` on this ticket in a local session on 2026-11-23, which took it from `needs-triage` straight to work. Scope: `design-system/src/eye-drawing.ts`, with `DESIGN.md` and `.impeccable/design.json` recording the result.

**Approved:** the `peeking` pose (lid 0.5, lift 1) drew no lashes before this ticket, because it sits inside the band the ticket fixes. So the first and second checklist items conflict there. Asked in the `/implement` session of 2026-11-23, the owner picked "Lashes win" over keeping `peeking` bare or stopping to revise the ticket: `peeking` gains the three lower lashes, and the open, shut and widened poses stay as they are.

### 2026-11-23: resolved

**Result.** The lower lashes used to shorten with the lid (`1 - 1.6 lid`), so they were gone by the time the upper lashes shrank to nothing at lid 0.625, as they turned from standing to hanging. Now the lower lashes keep their length until the upper lid's control point comes within 4 units (`closingGap`) of the lower lid's, at lid 0.875. From there they sink to nothing at lid 1, while the hanging upper lashes grow in. Below 0 the lower lashes still lengthen as before, so the widened pose keeps them. Every lid from 0 to 1, at lift 0 and lift 1, now draws at least 3 lashes. The longest is never under about 1.77, the low point where the two sets cross near lid 0.9, against a `shortestLash` of 1.25. A lash shorter than that still sinks rather than drawing a stub. `DESIGN.md` (the eye's paragraph under Shapes) and `.impeccable/design.json` record how the lashes move with the lid.

**Validation.**
- I sampled `drawEye` from lid 0 to 1 in steps of 0.02, at both lifts. Before the change there were no lashes from lid 0.50 to 0.74. After it, every lid draws 3 to 8.
- `open`, `shut` and `widened` give byte-identical `drawEye` output before and after. `peeking` gains its three lower lashes, as approved above. I compared all four on the built `/catalog/eye/`, at 4× and at the eye's own size. `peeking` gains its lower lashes, as the 2026-11-23 approved comment allows.
- I recorded every frame on the built `/catalog/eye/` in headless Chromium, with `Math.random` pinned. The runs were a blink and a peek (7.5s), and a press to shut followed by a press to open, on the 4× specimens and the running head's 1× ones. Not one frame was without lashes. A blink's counts ran 8, 8, 8, 3, 3, 6, 8, 6, 5, 5, 5, 6, 8, 3, 3, 3, 8.
- impeccable's detector found nothing. `scripts/heavy pnpm check` passed. `/code-review` (Standards and Spec) found nothing blocking. Its fixes are in: the comment's wording, the `lowerScale` floor at 0 restored for lids past 1, and the `DESIGN.md` wording.

**Decisions.** The upper lid still sits a stroke's width from the lower one while the lid is about 0.8 to 0.9. In the recordings that lasts a frame or two as the lid lands, and with the lower lashes now under it, it reads as the lid closing. So I left it as it is. No test was added, because no test seam owns the drawing's geometry (`docs/agents/test-seams.md`), and a new seam needs the owner's agreement.

**Left undone.** Nothing.
