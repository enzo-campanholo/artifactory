# 04: Programs and notes that don't fit fail `pnpm check`

Status: resolved
Blocked by: 02

**What to build:** an artifact agent who writes a MEPA listing the machine can't read, or notes that name what the program lacks, gets a `stage-run` failure naming the example and the code line, as other Stage runs do, rather than a throw pointing into the design system. So does a run that faults (02). The page refuses the same runs with the Stage's existing line. A machine's `parse` returns its problems, each naming a code line or a table cell, and the trace reports them ([Machine trace](../spec.md) › Failures).

- [x] A program that doesn't parse fails as `stage-run`, naming the code line by its shown number: an unknown instruction, wrong arguments, and a listing whose fence doesn't start at 0.
- [x] A run that faults (division by zero, a read with no input left, the stack dropping below its bottom, or any other fault the definition has) fails as `stage-run`, naming the example, the instruction's shown line number and the fault, never as "`steps` throws" pointing into design-system code.
- [x] Notes keyed to an address the program doesn't have fail as `stage-run` (`roles`, `after`), and so does a `reads` name that isn't one of the Stage's fields.
- [x] A table the view writes into that's missing, or missing a required column, fails as the Stage's existing "a row, column … the content doesn't have" failure does; an optional column (`Papel`) left out is no failure.
- [x] Problems come from `parse` as data, so the general layer reports any machine's problems the same way; the trace adds no MEPA-specific wording.
- [x] Every problem in a run is reported, not only the first, as other `stage-run` problems are.
- [x] The page refuses a program or notes with problems with the Stage's existing "couldn't be worked out" line and keeps working.
- [x] Tests at the check's seam (fixture repos): one fixture build per failure kind above, a division by zero among them, each asserted as its full failure line.
- [x] Docs in the same commit, since this changes what `pnpm check` reports: the `artifact` skill's `stage.md` lists the new `stage-run` failures with their wording, and MEPA's doc comment lists its failures; `pnpm components` regenerates `COMPONENTS.md`.

## Comments

### 2026-11-09: what 02 already does with faults and problems

From machine trace 02's implementation:

- **Faults are done end to end.** A machine's `step` returns `{ fault: { line, fault: { "pt-BR", en } } }`; `trace` throws it as `MachineFault` (`stage-build.ts`), and `runBuild` turns it into the run `{ refused: "fault", line, fault }`. The page says "Linha 8: divisão por zero. Tente outros números." (or "Escolha outra opção." with `choose`), and the check gives "with `x = 7, y = 0`, the machine faults at line 8: division by zero", tested with division by zero in `artifact-checks.test.ts` (`stack-machine/divide.build.ts`). MEPA's other faults: no input left, the stack below its bottom, `s` with no value before `INPP`, a cell or `D[k]` with no value, an address below 0, and reaching `FIM`. They're untested at the seam; your one-fixture-per-kind cases cover them. Reword the check line if you like, and update `stage.md`, which quotes it.
- **Problems are data but still thrown.** `mepa.parse` returns `{ problems: [{ line, problem }] }` (English, line by shown number, `line: undefined` for a problem with no line), covering an unknown instruction, wrong arguments, a fence that doesn't start at 0, `FIM` missing from the last line or on another line, and a Stage with no code block or more than one. `trace` still throws them as one plain `Error` ("line 3: …; line 5: …"), so today they fail as "`steps` throws" at `stage-build.ts`. Replace that throw with the refusal your ticket specifies.
- **Notes aren't checked yet.** `roles`/`after` keyed to a missing address are ignored. A `reads` name that isn't a field reaches `start` as `undefined`, and `LEIT` then faults as "no input is left to read". `build-input` already fails such a build at the type, and for a trace its hint is "name exactly the Stage's fields in `reads`".
- A table the view writes into that's missing already fails through the step applier's existing lines ("changes a cell in the column `Dado`, which heads no table"). The memory table is found by its first header (`Célula`/`Cell`). Without it, a run that pushes anything fails that way, and one that never does needs no memory table.

### 2026-11-09: resolved

**Result:** a machine's `parse` problems refuse the run as data. `trace` throws them as `MachineProblems` (`stage-build.ts`), together with any `reads` name that isn't one of the Stage's fields, and `runBuild` turns that into `{ refused: "unfit", problems }`, so the page shows the Stage's existing "Não foi possível montar os passos para esses números." line and the check prints, at the build file, "with `x = 7, y = 2`, the machine can't read line 1: `PUSH 3` isn't a MEPA instruction" for a problem on a code line and "… the machine can't run: `roles` names the address 7, which the listing doesn't have: it has addresses 0 to 2" for one that isn't. The wording around a problem is the general layer's; only the problem's own text is MEPA's. MEPA's `parse` now checks `roles` and `after` keys against the listing's addresses. Faults keep 02's line ("the machine faults at line 8: division by zero"). A missing table or column fails through the step applier's existing lines ("step 1 changes a cell in the column `Value`, which heads no table"); `Papel` left out is no failure.

**Commits:** ac7ca39 (claim), 28c2fae (implementation, tests, docs), and this closing commit.

**Validation:**
- `tests/check/artifact-checks.test.ts`, "fails a machine trace whose program or notes don't fit, or whose run faults, naming the example and the line": 15 Stages in the `stack-machine` fixture artifact, one per kind: an unknown instruction, wrong arguments (three on one listing, with two examples, every problem named once with the first), a fence without `start=0`, each MEPA fault (no input left, below the bottom, before `INPP`, a cell with no value, `D[1]` with no value, `M[−1]`, reaching `FIM`, beside 02's division by zero), `roles` and `after` keyed to missing addresses, a `reads` name that isn't a field (which also fails as `build-input`, asserted there), a missing registers table, a memory table without `Top`, and a Stage without `Papel` that passes with tables worked out by hand. Every line is asserted in full. The fixture totals rise by 18, from 104 to 122 (full) and 103 to 121 (artifacts only).
- Red first: with the implementation set aside, the new assertions failed (5 tests; the problems came out as "`steps` throws" or not at all). Green after it, once `pnpm components` regenerated `COMPONENTS.md`.
- The page, in a real browser on a built site, light and dark: a throwaway pt-BR draft artifact (never committed) with an unknown instruction, a `roles` note on a missing address and a working trace. Both unfit Stages showed the "couldn't be worked out" line with the counter hidden, again on a second Start, and the working Stage on the same page then ran its 9 steps to "O programa para."; the catalog's MEPA page (pt-BR and English Stages) ran its 19 steps to the end; no page errors.
- The full plain `pnpm check` on the final HEAD, after merging the integration tip: recorded by the gate below this comment's commit.

**Decisions:**
- A program's problems are input-independent, so the check names each once per Stage, with the first example it refuses, rather than once per example.
- The check names a step problem repeated within one run once, at its first step. A machine's view writes the same cells every step, so a missing `Value` column would otherwise be named for every row of every step. No existing fixture repeated a problem within a run, and the page doesn't show these lines.
- The `reads` check lives in `trace`, not in MEPA, since `reads` is the general layer's (02), and compares the names with the input's keys, which are the Stage's fields.
- A missing table or required column isn't a `parse` problem: it fails through the step applier's existing lines, as the ticket asks, so `Problem` names only a code line (`line`) or none; no table-cell variant was added without a caller.
- The memory table's missing `Célula` column makes MEPA find no memory table, so a run that pushes fails on the `Cell` column as above; documented in MEPA's doc comment as "a table without a column the view writes into".
- The empty `## Comments` heading was missing from this ticket and from 05; added above the earlier notes.

**Shared parts:** the step applier (a new refusal kind) and the check's Stage runner reach every Stage: every non-machine `stage-run` expectation is unchanged, and the catalog's MEPA Stages stepped to the end in the browser. `stage-build.ts`'s types reach every build; the restricted build `tsc` passes. Nothing visual changed: the page reuses the Stage's existing refusal line.

**Left undone:** nothing in this ticket. Jumps to missing labels and `labels` entries are 05's, through the same problems (noted on 05).
