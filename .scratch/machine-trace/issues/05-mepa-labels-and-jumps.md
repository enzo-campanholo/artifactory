# 05: MEPA labels and jumps

Status: resolved
Blocked by: 03, 04

**What to build:** a MEPA listing can name places with labels and jump to them, and the trace says where a jump lands in the artifact's own words. A line takes an optional label (`L1:`), `DSVS` jumps and `NADA` marks a place, and the `labels` note gives each label's place name ("o início de main"), said when a jump lands there or passes its `NADA` ([Machine trace](../spec.md) › Notes and MEPA).

- [x] A listing line is an optional label, an instruction with its arguments and an optional `;` comment. A label names the address of its line.
- [x] `DSVS` and `NADA` run and are narrated in pt-BR and English, a jump's sentence naming the place from `labels`.
- [x] A jump to a missing label fails as `stage-run`, naming the code line, and so does a `labels` entry for a label the program doesn't have, through the problems 04 reports.
- [x] Tests at the check's seam (fixture repos): a fixture trace with a jump passes with its tables as written, worked out by hand, and each new failure is asserted as its full failure line.
- [x] The catalog's MEPA page's program uses `DSVS`, `NADA` and a label in both its Stages, and steps through them in a browser. Catalog work runs through impeccable in a local session.
- [x] Docs in the same commit: MEPA's doc comment covers labels, `DSVS`, `NADA`, the `labels` note and the new failures; `pnpm components` regenerates `COMPONENTS.md`; the `artifact` skill's `stage.md` lists the new failures.

## Comments

### 2026-11-09: where labels go in MEPA's parse

From machine trace 02's implementation: `instruction(text)` in `design-system/src/machines/mepa.ts` strips the `;` comment and reads one mnemonic and its comma-separated whole-number arguments, so `L1: NADA` fails today as "isn't a MEPA instruction". A line's address is its index in the listing, which `parse` checks starts at shown line 0. `view` dashes `state.i` and reverses `state.ran`, so a jump only sets `i`.

### 2026-11-09: what 03 leaves for the catalog and the Machines section

From machine trace 03's implementation:

- The catalog's MEPA page is `design-system/catalog/mepa.mdx` (served at `/catalog/mepa/` from `pages/mepa.astro`, linked under "Machines" in the catalog's nav). Its program works out a trapezoid's area, (a + b) × h div 2, in a pt-BR Stage (`mepa-trapezio.build.ts`) and an English one (`mepa-trapezoid.build.ts`), each in a `<div lang="…">` so its build's language holds under `?lang=pt-BR`. Both open on step 12 (`data-catalog-run="start" data-catalog-step="12"`, run by `catalog/stage-runs.ts`, shared with the Stage page), where `SOMA` at line 10 runs, and the page's prose names that step. Adding a label and `DSVS`/`NADA` moves the addresses, so update the step, the prose, both builds' `roles`/`after` keys and both Stages' tables as written together.
- `pnpm check` doesn't run catalog Stages, so nothing catches a catalog table as written that isn't the first example's last step: step both Stages to the end in a browser and compare.
- `COMPONENTS.md`'s Machines section is MEPA's leading doc comment as written, under `### mepa` with its import line. The doc comment opens with the same trapezoid program as a whole Stage, its build and its tables; keep it the catalog's program, so the example uses every instruction too.
- The Stage's static labels (Start, "of" in the counter, Figure) follow the page's root `lang`, not the nearest one, so on the English catalog page the pt-BR Stage's chrome is English while its steps are said in pt-BR (and the reverse under `?lang=pt-BR`). That's the Stage as it is; the ticket kept shared parts unchanged.

### 2026-11-09: how 04 reports a program's problems

From machine trace 04's implementation:

- `parse`'s problems are now a refusal: `trace` throws them as `MachineProblems` (`stage-build.ts`), `runBuild` turns that into `{ refused: "unfit", problems }`, the page shows the Stage's "couldn't be worked out" line, and the check prints each problem once per Stage, with the first example: "with `x = 7, y = 2`, the machine can't read line 3: …" for a problem with a `line`, "… the machine can't run: …" for one without. So a jump to a missing label is a `{ line, problem }` from `parse`, and a `labels` entry for a label the program doesn't have is `{ line: undefined, problem }`; neither needs any change outside `mepa.ts`.
- `parse` checks `roles` and `after` keys after reading the listing (`Object.hasOwn(listing, key)`, "`roles` names the address 7, which the listing doesn't have: it has addresses 0 to 2"). The spec keys notes "by address or label"; if 05 lets them take a label, widen that loop.
- Fixtures: `unfitMachineStages` and `unfitMachineBuilds` in `tests/check/artifact-checks.test.ts`, inside the `stack-machine` artifact, with `machineStage(build, listing, { fence, examples, tables })` and `machineBuild(notes)`; their lines are asserted in "fails a machine trace whose program or notes don't fit…". A new Stage there moves both fixture totals.

### 2026-11-09: resolved

**Result:** a MEPA listing line is an optional label (`L1:`, letters, digits and `_`), an instruction with its arguments and an optional `;` comment, and a label names its line's address. `DSVS L` sets `i` to that address and `NADA` does nothing. Both are narrated in pt-BR and English, naming the place from the new optional `labels` note: "Desvia para L1, o início do programa principal: i recebe 3." / "Jumps to L1, the start of the main program: i gets 3.", and "Passa por L1, o início do programa principal, e não faz nada." / "Passes L1, the start of the main program, and does nothing." (a label without a `labels` entry is said alone, and an unlabelled `NADA` is "Não faz nada." / "Does nothing."). New `stage-run` failures, through 04's problems: "`DSVS L9` jumps to the label `L9`, which the listing doesn't have: it has `L1`" (or "it has no labels"), "`DSVS 3` isn't `DSVS L`, with a label", "the label `L1` is already on line 1: give each line its own", "`L2:` labels no instruction: write one after it, as `L2: NADA`", and, for a note, "`labels` names the label `L2`, which the listing doesn't have: it has no labels".

**Commits:** 84c7319 (claim), a44fcc4 (implementation, tests, catalog, docs, note on 06), and this closing commit.

**Validation:**
- `tests/check/valid-artifacts.test.ts`: `maquina-de-pilha` gains a second Stage, `salto`, whose `DSVS L1` skips `CRCT 9` / `IMPR` to `L1: NADA`. Its tables were worked out by hand for x = 6: 6 stored in M[0], copied to M[1] and printed alone, so the output is `6` (it would be `9, 6` if the jump didn't skip), and `PARA` leaves `i` at 11. It was red first ("`DSVS L1` isn't a MEPA instruction", "`L1: NADA` isn't …", and `labels` unknown to the notes' type) and passes now.
- `tests/check/artifact-checks.test.ts`: the `stack-machine` fixture gains the Stages `jumps`, `labelled` and `labels` and a `DSVS 3` line in `arguments`, each failure asserted as its full line. The fixture totals rise by 5, from 122 to 127 (full) and from 121 to 126 (artifacts only). Both files pass.
- In a real browser on a built site, with `capture-stages.ts` from the shared notes pointed at `/catalog/mepa/` and `/catalog/mepa/?lang=pt-BR`, light and dark: each of the four Stage runs opens on step 14 of 21 (`SOMA` at line 12 `reversed`, line 13 `dashed`, the sum 8 in M[3] `strong`). Each steps from the first example to its last step, which matches its tables as written (`i` 19, `saída`/`output` 16, M[0] to M[4] 3, 5, 4, 16, 2). Step 4 says the jump with line 2 `reversed` and line 3 `dashed`, and step 5 says the `NADA`, in each Stage's language. There were no page errors. `impeccable detect` on the page finds nothing.
- `tsc -p tsconfig.builds.json`, ESLint and Prettier pass on the changed files. The full gate runs after the integration tip is merged.

**Decisions:**
- `roles` and `after` stay keyed by address only. The spec's "keyed by address or label" is met by `labels` (and 06's `subroutines`), which are keyed by label.
- `labels` is optional per label: a label with no entry is said by its name alone, rather than failing, since a label may only be a target with nothing to teach.
- Labels resolve at parse time, so `DSVS` carries its target's address and a forward jump works. A label on two lines and a label with nothing after it are parse problems too, beyond the ticket's list, since either would leave a jump's target ambiguous or empty.
- `DSVS` and `NADA` don't need `s`, so they run before `INPP` without the "s has no value yet" fault.
- Operands are named per instruction (`operands`: `L` a label, any other a whole number), and the wrong-arguments problem is built from those names, so the existing messages are unchanged.
- The catalog program, and the doc comment's example, start as a compiler lays a program out: `INPP / AMEM 3 / DSVS L1 / L1: NADA`, the jump over the subroutines to the main program's start. With no subroutines yet, it lands on the next line, and the page's prose says so; 06 puts its subroutine in between. Every later address moved by 2, so both Stages now open on step 14 (still `SOMA`), and the prose, the tables as written (`i` 19) and both builds' `roles`/`after` keys moved with them.
- MEPA has no conditional jump, so the doc comment says a jump back repeats forever and runs past the Stage's 200 steps.
- impeccable: the owner's brief authorizes autonomous decisions, so its interview step was replaced by the brief's direction: a refinement with no visual change (content and builds only).

**Shared parts:** none changed. The change stays inside MEPA's definition, its catalog page and builds, and the docs; the Stage renders the jump through its existing marks.

**Left undone:** nothing in scope.
