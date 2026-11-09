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

### 2026-11-09: where labels go in MEPA's parse

From machine trace 02's implementation: `instruction(text)` in `design-system/src/machines/mepa.ts` strips the `;` comment and reads one mnemonic and its comma-separated whole-number arguments, so `L1: NADA` fails today as "isn't a MEPA instruction". A line's address is its index in the listing, which `parse` checks starts at shown line 0. `view` dashes `state.i` and reverses `state.ran`, so a jump only sets `i`.

### 2026-11-09: what 03 leaves for the catalog and the Machines section

From machine trace 03's implementation:

- The catalog's MEPA page is `design-system/catalog/mepa.mdx` (served at `/catalog/mepa/` from `pages/mepa.astro`, linked under "Machines" in the catalog's nav). Its program works out a trapezoid's area, (a + b) × h div 2, in a pt-BR Stage (`mepa-trapezio.build.ts`) and an English one (`mepa-trapezoid.build.ts`), each in a `<div lang="…">` so its build's language holds under `?lang=pt-BR`. Both open on step 12 (`data-catalog-run="start" data-catalog-step="12"`, run by `catalog/stage-runs.ts`, shared with the Stage page), where `SOMA` at line 10 runs, and the page's prose names that step. Adding a label and `DSVS`/`NADA` moves the addresses, so update the step, the prose, both builds' `roles`/`after` keys and both Stages' tables as written together.
- `pnpm check` doesn't run catalog Stages, so nothing catches a catalog table as written that isn't the first example's last step: step both Stages to the end in a browser and compare.
- `COMPONENTS.md`'s Machines section is MEPA's leading doc comment as written, under `### mepa` with its import line. The doc comment opens with the same trapezoid program as a whole Stage, its build and its tables; keep it the catalog's program, so the example uses every instruction too.
- The Stage's static labels (Start, "of" in the counter, Figure) follow the page's root `lang`, not the nearest one, so on the English catalog page the pt-BR Stage's chrome is English while its steps are said in pt-BR (and the reverse under `?lang=pt-BR`). That's the Stage as it is; the ticket kept shared parts unchanged.
