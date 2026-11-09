# 06: MEPA subroutines

Status: claimed
Blocked by: 05

**What to build:** a MEPA program can call subroutines, and the memory table shows each activation record as a reader of a subroutine-call artifact needs it: every parameter and the return value by role, with their offsets in the record. `CHPR`, `ENPR` and `RTPR` run, the `subroutines` note gives each called label its parameters (first to last) and whether it returns a value, and the display rows `D[k]` follow the calls. This completes every instruction the private copy's three builds use ([Machine trace](../spec.md) › Notes and MEPA).

- [ ] `CHPR`, `ENPR` and `RTPR` run with negative-offset arguments (`CRVL 1,-5`, `CHPR L2,1`), and the registers table shows every `D[k]` the program uses.
- [ ] `ENPR`'s narration names where each parameter sits, from `subroutines`; calls and returns are narrated in pt-BR and English, a call naming its place from `labels`.
- [ ] The memory table's optional `Desl.` (`Offset`) column shows each record cell's offset when the table has it, from `subroutines`; a cell above `s` shows none.
- [ ] A `subroutines` entry on a label `CHPR` never calls fails as `stage-run`, through the problems 04 reports, asserted as its full failure line at the check's seam.
- [ ] A test at the check's seam (fixture repos): a fixture trace whose `main` calls a subroutine with two parameters and a return value passes with its tables as written, worked out by hand.
- [ ] The catalog's MEPA page's program uses every instruction MEPA now covers, a call with parameters and a returned value included, in both its Stages, and its memory tables show `Papel` and `Desl.`. Catalog work runs through impeccable in a local session.
- [ ] Docs in the same commit: MEPA's doc comment covers the subroutine instructions, the `subroutines` note, `Desl.` and the new failure; `pnpm components` regenerates `COMPONENTS.md`; the `artifact` skill's `stage.md` lists the new failure.

## Comments

### 2026-11-09: what 02 leaves for records

From machine trace 02's implementation (`design-system/src/machines/mepa.ts`):

- `Desl.` (`Offset`) isn't written yet: a table with it keeps that column as written. Its doc comment says so, and your ticket fills it.
- The registers table's `D[k]` rows are `D[0]` plus every `k` an `ARMZ` or `CRVL` names (`program.displays`). Add `ENPR`'s levels there.
- Roles: an `AMEM n` note is a list of n roles; any other note is one role, for the cell that instruction writes. A cell an `ARMZ` writes keeps its role unless the note gives one. Any other write without a note leaves the cell with no role. A cell above `s` shows no role.
- Faults are `{ fault: { line, fault: Said } }` from `step` (see 04's comment). `D[k]` with no value already faults.

### 2026-11-09: what 03 leaves for the catalog and the Machines section

From machine trace 03's implementation: the catalog's MEPA page (`design-system/catalog/mepa.mdx`, builds `mepa-trapezio` and `mepa-trapezoid`) and the doc comment's example share one program; 05's comment says what moves when the listing grows. Its memory tables have `Papel` (`Role`) but not `Desl.` (`Offset`), since nothing fills it yet: add the column to both Stages and to the doc comment's pt-BR example table. The doc comment already shows the English memory header with `Offset` and names the pt-BR one, `Célula | Dado | Papel | Desl. | Topo`.

### 2026-11-09: where 06's new failures go

From machine trace 04's implementation: a `subroutines` entry on a label `CHPR` never calls, or a call to a missing label, is a problem MEPA's `parse` returns (`{ line, problem }`, `line: undefined` for a note), and the general layer reports it as `stage-run` ("with `x = 7, y = 2`, the machine can't read line 3: …" or "… the machine can't run: …"), once per Stage. `parse`'s loop over `roles` and `after` keys is the place for note checks; 05's comment from 04 has the fixture helpers (`unfitMachineStages` in `tests/check/artifact-checks.test.ts`).

### 2026-11-09: what 05 leaves for calls

From machine trace 05's implementation (`design-system/src/machines/mepa.ts`):

- A listing line is `{ label, read }` (`Line`): `split` takes off the `;` comment and an optional `L1:` label (letters, digits and `_`), and `instruction(written, label, labels)` reads the rest. `parse` collects every label's address first, so a forward jump resolves; a label on two lines and a label with no instruction are already problems.
- Operands are named per op in `operands` (`DSVS: ["L"]`): `L` is a label, any other name a whole number, and the wrong-arguments problem is built from the names ("`DSVS 3` isn't `DSVS L`, with a label"; for `CHPR: ["L", "n"]` it reads "with a label and 1 whole number"). `DSVS` resolves its label to `{ op, label, to }` at parse time, with "`DSVS L9` jumps to the label `L9`, which the listing doesn't have: it has `L1`" (or "it has no labels"): `CHPR` can reuse that check and wording.
- `labels` is optional and checked against the listing's labels in `parse` ("`labels` names the label `L2`, which the listing doesn't have: …"); a label without a place name is said alone. `placed(label, name)` gives "L1, o início de main", and `step`'s `name(label)` reads the note: use them for a call's sentence. `roles` and `after` stay keyed by address only.
- The catalog program now starts `INPP / AMEM 3 / DSVS L1 / L1: NADA`, as a compiler lays out a program with no subroutines, so `DSVS` lands on the next line. Put the subroutine between `DSVS L1` and `L1: NADA`, and the jump will skip it. Every address after line 1 moved by 2: the Stages now open on step 14 (`SOMA` at line 12), the tables as written have `i` 19, and the builds' `roles` keys start at 4 with `after` at 18. The page's prose names the jump and the step.
