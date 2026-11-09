# 06: MEPA subroutines

Status: ready-for-agent
Blocked by: 05

**What to build:** a MEPA program can call subroutines, and the memory table shows each activation record as a reader of a subroutine-call artifact needs it: every parameter and the return value by role, with their offsets in the record. `CHPR`, `ENPR` and `RTPR` run, the `subroutines` note gives each called label its parameters (first to last) and whether it returns a value, and the display rows `D[k]` follow the calls. This completes every instruction the private copy's three builds use ([Machine trace](../spec.md) › Notes and MEPA).

- [ ] `CHPR`, `ENPR` and `RTPR` run with negative-offset arguments (`CRVL 1,-5`, `CHPR L2,1`), and the registers table shows every `D[k]` the program uses.
- [ ] `ENPR`'s narration names where each parameter sits, from `subroutines`; calls and returns are narrated in pt-BR and English, a call naming its place from `labels`.
- [ ] The memory table's optional `Desl.` (`Offset`) column shows each record cell's offset when the table has it, from `subroutines`; a cell above `s` shows none.
- [ ] A `subroutines` entry on a label `CHPR` never calls fails as `stage-run`, through the problems 04 reports, asserted as its full failure line at the check's seam.
- [ ] A test at the check's seam (fixture repos): a fixture trace whose `main` calls a subroutine with two parameters and a return value passes with its tables as written, worked out by hand.
- [ ] The catalog's MEPA page's program uses every instruction MEPA now covers, a call with parameters and a returned value included, in both its Stages, and its memory tables show `Papel` and `Desl.`. Catalog work runs through impeccable in a local session.
- [ ] Docs in the same commit: MEPA's doc comment covers the subroutine instructions, the `subroutines` note, `Desl.` and the new failure; `pnpm components` regenerates `COMPONENTS.md`; the `artifact` skill's `stage.md` lists the new failure.

### 2026-11-09: what 02 leaves for records

From machine trace 02's implementation (`design-system/src/machines/mepa.ts`):

- `Desl.` (`Offset`) isn't written yet: a table with it keeps that column as written. Its doc comment says so, and your ticket fills it.
- The registers table's `D[k]` rows are `D[0]` plus every `k` an `ARMZ` or `CRVL` names (`program.displays`). Add `ENPR`'s levels there.
- Roles: an `AMEM n` note is a list of n roles; any other note is one role, for the cell that instruction writes. A cell an `ARMZ` writes keeps its role unless the note gives one. Any other write without a note leaves the cell with no role. A cell above `s` shows no role.
- Faults are `{ fault: { line, fault: Said } }` from `step` (see 04's comment). `D[k]` with no value already faults.
