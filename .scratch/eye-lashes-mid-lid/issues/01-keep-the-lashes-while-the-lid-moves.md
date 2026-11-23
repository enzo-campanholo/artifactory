# 01: Keep the lashes while the lid moves

Status: needs-triage
Blocked by: None (can start immediately)

Design-system work: run it in a local session with impeccable, after `PRODUCT.md` and `DESIGN.md`.

**Problem:** the eye's drawing loses every lash partway through a blink, a peek or a press. In `design-system/src/eye-drawing.ts`, the upper lashes stand on the upper lid with a length scaled by `(corner - upper) / 20`. That scale falls through 0 as the lid passes the corners, where they stop standing and start hanging. The lower lashes scale by `1 - 1.6 lid`. Below `sunkLash` a lash sinks to nothing, so both sets are gone at once in the middle of the lid's travel. At either lift, the drawing has 8 lashes up to lid 0.32, then 6, 5, 3, 1, and **none from lid 0.50 to 0.74**, then 1, 3 and 5 from lid 0.84 to 1. The motion crosses that band in a few frames: about 2 in a blink and about 4 in a press or at the end of a peek. So the lashes flicker out and back, the one jump left once the motion became smooth (`d829def`, which closed `.scratch/eye-motion/issues/01-smoother-eye-motion.md`). Per-frame filmstrips from that ticket's review showed it in every blink, peek and press, the running head's 1× eye included. While the lid is about 0.8 to 0.9 the upper lid also sits a stroke's width from the lower lid and reads as one doubled line; judge on the catalog whether that wants a change too.

**What to build:** the lashes carry through the whole of the lid's travel, so the eye never draws without them, while the open, shut, widened and peeking poses look as they do today.

- [ ] At every lid from 0 to 1, at lift 0 and lift 1, the drawing has lashes. A lash shorter than `shortestLash` still sinks into the lid rather than drawing a stub.
- [ ] The four poses in `eyePoses` draw as they do now: compare them on `/catalog/eye/` before and after, at 4× and at the eye's own size.
- [ ] A blink, a peek and a press, recorded frame by frame on `/catalog/eye/`, show no frame where the lashes drop out and come back.
- [ ] `DESIGN.md` says how the lashes move with the lid, if the change alters what it records.
