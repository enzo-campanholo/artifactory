# 01: Right-align section numbers

Status: needs-triage
Blocked by: None (can start immediately)

Design-system work: run it in a local session with impeccable, after `PRODUCT.md` and `DESIGN.md`.

**Problem:** section numbers are left-aligned in their column, so once an artifact has ten or more sections, "9" and "10" end in different places.

**What to build:** set section numbers flush right in their column, so they line up on their last digit.

- [ ] In the contents (`.artifact-section-number`), the numbers line up on the right, from 1 to two digits.
- [ ] Section numbers in the margin beside each section heading line up the same way.
- [ ] Checked in light, dark, print and at phone width.
