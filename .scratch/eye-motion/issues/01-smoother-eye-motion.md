# 01: Smoother, more cohesive eye motion

Status: needs-triage
Blocked by: None (can start immediately)

Design-system work: run it in a local session with impeccable, after `PRODUCT.md` and `DESIGN.md`.

**Problem:** the eye's motion (blink, peek, hover, press, following) feels jerky, and its movements don't read as one creature: each one moves on its own timing.

**What to build:** retune `eye-motion.ts` so every movement eases smoothly and they all share one character.

- [ ] Blink, peek, hover, press and following move without visible jumps or stutter, including when one interrupts another.
- [ ] All the movements share one feel: related timings and easing, not separate tunings.
- [ ] Under `prefers-reduced-motion: reduce` nothing changes: the eye rests and changes pose at once.
- [ ] `DESIGN.md` › Motion records the new timings.
