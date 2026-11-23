# 01: Smoother, more cohesive eye motion

Status: resolved
Blocked by: None (can start immediately)

Design-system work: run it in a local session with impeccable, after `PRODUCT.md` and `DESIGN.md`.

**Problem:** the eye's motion (blink, peek, hover, press, following) feels jerky, and its movements don't read as one creature: each one moves on its own timing.

**What to build:** retune `eye-motion.ts` so every movement eases smoothly and they all share one character.

- [x] Blink, peek, hover, press and following move without visible jumps or stutter, including when one interrupts another.
- [x] All the movements share one feel: related timings and easing, not separate tunings.
- [x] Under `prefers-reduced-motion: reduce` nothing changes: the eye rests and changes pose at once.
- [x] `DESIGN.md` › Motion records the new timings.

## Comments

### 2026-11-23: approved

The owner ran `/implement` on this ticket in a local session on 2026-11-23, which took it from `needs-triage` straight to work. Scope: `design-system/src/eye-motion.ts`, with `DESIGN.md` › Motion and `.impeccable/design.json` recording the result.

### 2026-11-23: resolved

**Result.** Every value of the pose (lid, lift, pupil size, look x and y) used to ease exponentially, each movement with its own time constant (22 to 110ms). Exponential easing starts each movement at full speed, so every new target was a jump in velocity. Now every value is a critically damped spring with one time constant, the beat (50ms), and only a blink's closing runs at half a beat. The spring is solved exactly over each frame. It keeps its velocity across a retarget, so an interruption bends the movement rather than snapping it. A blink or a peek holds from when the lid arrives rather than on a fixed timer. A press that lands while a blink closes would carry the upper lid 0.005 past the lower one, so the lid stops at the shut pose. Under reduced motion nothing changed. `DESIGN.md` › Motion and `design.json` record the timings: a blink shuts in about 0.12s, holds 0.03s and is open about 0.39s after it began; a peek opens in about 0.22s and holds 0.7s; everything else arrives in about 0.24s.

**Validation.**
- The motion was recorded every frame in headless Chromium on `/catalog/eye/`, old against new, across 18 scenarios, each with `Math.random` pinned. The scenarios covered hover in and out, press, a press pressed back after 90ms, following a sweep and a jump, a blink, a press while a blink closes (at lid 0.3, 0.6 and 0.9), a press and press back mid-blink, a peek, a hover while a peek opens, a press while a peek is open, the running head's eye, and 8.5s (open) and 15s (shut) under reduced motion.
- The largest frame-to-frame change in velocity fell in every scenario. A blink went from 0.47 to 0.13, a press during a blink from about 0.47 to 0.13, a press from 0.13 to 0.05 and a peek from 0.10 to 0.04. The lid never passes 1.
- Under reduced motion, the open eye holds 2 poses (rest and the pressed pose, which changes in one frame) and the shut eye 1.
- impeccable's motion reviewer gave **ship** after one recapture, and its detector found nothing.
- `scripts/heavy pnpm check` passed. `/code-review` found no blocking issues on either axis, and its small fixes are in.

**Left undone.** While the lid passes about 0.72 to 0.88, the eye's drawing (`eye-drawing.ts`, not its motion) sinks every lash for a few frames, and the upper lid briefly doubles. The old motion did the same. It shows mid-blink, at the end of a peek and on a press. It belongs in a ticket of its own if the owner wants it.
