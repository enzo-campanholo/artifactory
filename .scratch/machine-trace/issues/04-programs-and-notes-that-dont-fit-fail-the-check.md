# 04: Programs and notes that don't fit fail `pnpm check`

Status: claimed
Blocked by: 02

**What to build:** an artifact agent who writes a MEPA listing the machine can't read, or notes that name what the program lacks, gets a `stage-run` failure naming the example and the code line, as other Stage runs do, rather than a throw pointing into the design system. So does a run that faults (02). The page refuses the same runs with the Stage's existing line. A machine's `parse` returns its problems, each naming a code line or a table cell, and the trace reports them ([Machine trace](../spec.md) › Failures).

- [ ] A program that doesn't parse fails as `stage-run`, naming the code line by its shown number: an unknown instruction, wrong arguments, and a listing whose fence doesn't start at 0.
- [ ] A run that faults (division by zero, a read with no input left, the stack dropping below its bottom, or any other fault the definition has) fails as `stage-run`, naming the example, the instruction's shown line number and the fault, never as "`steps` throws" pointing into design-system code.
- [ ] Notes keyed to an address the program doesn't have fail as `stage-run` (`roles`, `after`), and so does a `reads` name that isn't one of the Stage's fields.
- [ ] A table the view writes into that's missing, or missing a required column, fails as the Stage's existing "a row, column … the content doesn't have" failure does; an optional column (`Papel`) left out is no failure.
- [ ] Problems come from `parse` as data, so the general layer reports any machine's problems the same way; the trace adds no MEPA-specific wording.
- [ ] Every problem in a run is reported, not only the first, as other `stage-run` problems are.
- [ ] The page refuses a program or notes with problems with the Stage's existing "couldn't be worked out" line and keeps working.
- [ ] Tests at the check's seam (fixture repos): one fixture build per failure kind above, a division by zero among them, each asserted as its full failure line.
- [ ] Docs in the same commit, since this changes what `pnpm check` reports: the `artifact` skill's `stage.md` lists the new `stage-run` failures with their wording, and MEPA's doc comment lists its failures; `pnpm components` regenerates `COMPONENTS.md`.

### 2026-11-09: what 02 already does with faults and problems

From machine trace 02's implementation:

- **Faults are done end to end.** A machine's `step` returns `{ fault: { line, fault: { "pt-BR", en } } }`; `trace` throws it as `MachineFault` (`stage-build.ts`), and `runBuild` turns it into the run `{ refused: "fault", line, fault }`. The page says "Linha 8: divisão por zero. Tente outros números." (or "Escolha outra opção." with `choose`), and the check gives "with `x = 7, y = 0`, the machine faults at line 8: division by zero", tested with division by zero in `artifact-checks.test.ts` (`stack-machine/divide.build.ts`). MEPA's other faults: no input left, the stack below its bottom, `s` with no value before `INPP`, a cell or `D[k]` with no value, an address below 0, and reaching `FIM`. They're untested at the seam; your one-fixture-per-kind cases cover them. Reword the check line if you like, and update `stage.md`, which quotes it.
- **Problems are data but still thrown.** `mepa.parse` returns `{ problems: [{ line, problem }] }` (English, line by shown number, `line: undefined` for a problem with no line), covering an unknown instruction, wrong arguments, a fence that doesn't start at 0, `FIM` missing from the last line or on another line, and a Stage with no code block or more than one. `trace` still throws them as one plain `Error` ("line 3: …; line 5: …"), so today they fail as "`steps` throws" at `stage-build.ts`. Replace that throw with the refusal your ticket specifies.
- **Notes aren't checked yet.** `roles`/`after` keyed to a missing address are ignored. A `reads` name that isn't a field reaches `start` as `undefined`, and `LEIT` then faults as "no input is left to read". `build-input` already fails such a build at the type, and for a trace its hint is "name exactly the Stage's fields in `reads`".
- A table the view writes into that's missing already fails through the step applier's existing lines ("changes a cell in the column `Dado`, which heads no table"). The memory table is found by its first header (`Célula`/`Cell`). Without it, a run that pushes anything fails that way, and one that never does needs no memory table.
