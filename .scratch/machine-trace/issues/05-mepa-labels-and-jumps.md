# 05: MEPA labels and jumps

Status: ready-for-agent
Blocked by: 03, 04

**What to build:** a MEPA listing can name places with labels and jump to them, and the trace says where a jump lands in the artifact's own words. A line takes an optional label (`L1:`), `DSVS` jumps and `NADA` marks a place, and the `labels` note gives each label's place name ("o início de main"), said when a jump lands there or passes its `NADA` ([Machine trace](../spec.md) › Notes and MEPA).

- [ ] A listing line is an optional label, an instruction with its arguments and an optional `;` comment. A label names the address of its line.
- [ ] `DSVS` and `NADA` run and are narrated in pt-BR and English, a jump's sentence naming the place from `labels`.
- [ ] A jump to a missing label fails as `stage-run`, naming the code line, and so does a `labels` entry for a label the program doesn't have, through the problems 04 reports.
- [ ] Tests at the check's seam (fixture repos): a fixture trace with a jump passes with its tables as written, worked out by hand, and each new failure is asserted as its full failure line.
- [ ] The catalog's MEPA page's program uses `DSVS`, `NADA` and a label in both its Stages, and steps through them in a browser. Catalog work runs through impeccable in a local session.
- [ ] Docs in the same commit: MEPA's doc comment covers labels, `DSVS`, `NADA`, the `labels` note and the new failures; `pnpm components` regenerates `COMPONENTS.md`; the `artifact` skill's `stage.md` lists the new failures.
