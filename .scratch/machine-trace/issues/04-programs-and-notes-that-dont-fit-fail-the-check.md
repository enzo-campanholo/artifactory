# 04: Programs and notes that don't fit fail `pnpm check`

Status: ready-for-agent
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
