# 06: MEPA subroutines

Status: resolved
Blocked by: 05

**What to build:** a MEPA program can call subroutines, and the memory table shows each activation record as a reader of a subroutine-call artifact needs it: every parameter and the return value by role, with their offsets in the record. `CHPR`, `ENPR` and `RTPR` run, the `subroutines` note gives each called label its parameters (first to last) and whether it returns a value, and the display rows `D[k]` follow the calls. This completes every instruction the private copy's three builds use ([Machine trace](../spec.md) › Notes and MEPA).

- [x] `CHPR`, `ENPR` and `RTPR` run with negative-offset arguments (`CRVL 1,-5`, `CHPR L2,1`), and the registers table shows every `D[k]` the program uses.
- [x] `ENPR`'s narration names where each parameter sits, from `subroutines`; calls and returns are narrated in pt-BR and English, a call naming its place from `labels`.
- [x] The memory table's optional `Desl.` (`Offset`) column shows each record cell's offset when the table has it, from `subroutines`; a cell above `s` shows none.
- [x] A `subroutines` entry on a label `CHPR` never calls fails as `stage-run`, through the problems 04 reports, asserted as its full failure line at the check's seam.
- [x] A test at the check's seam (fixture repos): a fixture trace whose `main` calls a subroutine with two parameters and a return value passes with its tables as written, worked out by hand.
- [x] The catalog's MEPA page's program uses every instruction MEPA now covers, a call with parameters and a returned value included, in both its Stages, and its memory tables show `Papel` and `Desl.`. Catalog work runs through impeccable in a local session.
- [x] Docs in the same commit: MEPA's doc comment covers the subroutine instructions, the `subroutines` note, `Desl.` and the new failure; `pnpm components` regenerates `COMPONENTS.md`; the `artifact` skill's `stage.md` lists the new failure.

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

### 2026-11-09: closing comment

**Result:** a MEPA program calls subroutines. `CHPR L,k`, `ENPR k` and `RTPR k,n` run with the common MEPA semantics (`CHPR` pushes the return address and k and jumps; `ENPR` pushes `D[k]` and sets it to the record's base; `RTPR` restores `D[k]`, returns and drops `s` by n + 3). The registers table gains every `D[k]` an `ENPR` or `RTPR` names. The `subroutines` note gives a called label's parameters and whether it returns a value. `ENPR` says where each parameter and the return value sit, and `RTPR` says the return value it leaves on top, in pt-BR and English, with a call naming its place from `labels`. The memory table's optional `Desl.` (`Offset`) column shows each record cell's offset, and none for a cell above `s` or outside every record. A `subroutines` entry on a label no `CHPR` calls, and a call to a missing label, fail as `stage-run`.

**Commits:** 2589834 (claim), 2f1b8cf (implementation, docs, catalog and tests), f95b1e1 (merge of the integration tip), and this closing commit.

**Validation:**
- `tests/check/valid-artifacts.test.ts` gains two Stages worked out by hand. `divisao` has `main` call div(a, b) with two parameters and a return value, then print it, and keeps the globals. `dobro` stops inside dobro(a) with its record live, so its tables as written show every record cell's role and offset (−5 to 0). Both pass.
- `tests/check/artifact-checks.test.ts` asserts the full failure lines for a `subroutines` entry no `CHPR` calls, a `CHPR` to a missing label and a `CHPR` with the wrong arguments. The check's failure totals move from 128/129 to 131/132.
- The catalog's MEPA page was built and captured with a Puppeteer script at 1280 and 393 px, light and dark, plus print. Both Stages open on step 24 of 28, inside área. They show `Papel` and `Desl.` and log no page errors, no table overflows, and the last step of a full run matches the tables as written. Every step's sentence was read in both languages.
- The full `pnpm check` gate runs on the merged HEAD.

**Decisions:**
- `CHPR`'s k is pushed as data only, as the spec's `CHPR L2,1` from main suggests (the callee's level). Nothing reads it back.
- `ENPR` with `D[k]` unset keeps `?` rather than faulting: a first call at a new level always meets an unset `D[k]`. `RTPR` restores that lack of value.
- Built-in roles: without a `roles` note at their address, `CHPR`'s cells are "endereço de retorno" and "nível k" ("return address", "level k"), and `ENPR`'s is "D[k] guardado" ("saved D[k]"). A note overrides them: a list of 2 on `CHPR`.
- A record holds its cells from its `ENPR` to its `RTPR`, from its return value or first parameter up to the top, and the topmost record wins. With no `subroutines` entry, a record starts at the return address (−3). The globals show no offset.
- `RTPR`'s n isn't checked against the `subroutines` entry's parameters; nothing in the spec asks for it.
- The catalog program and the doc comment's example share one listing. A function área(bases, altura) sits between `DSVS L1` and `L1: NADA`, and the Stages open inside it, on the `ARMZ 1,-6` that stores the return value.

**Shared parts:** none changed. The change stays inside `machines/mepa.ts`, its catalog page and builds, the generated `COMPONENTS.md` and the `artifact` skill's `stage.md`.

**Left undone:** at 393 px the English memory table, with all five columns, wraps `← s` in its narrow `Top` column (pt-BR's `Topo` fits). Keeping it on one line is Stage table CSS, a shared part outside this ticket. Ticket 07 has a dated comment with what the move needs.
