# 03: Machines in `COMPONENTS.md` and the catalog

Status: resolved
Blocked by: 02

**What to build:** an artifact agent learns to write a MEPA trace from `COMPONENTS.md` alone, and the owner sees MEPA run on its own catalog page. `COMPONENTS.md` gains a **Machines** section generated from the machine modules' doc comments, the `Stage` entry points to it, and the catalog gains a MEPA page with a short program in a pt-BR and an English Stage ([Machine trace](../spec.md) › Documentation).

- [x] `pnpm components` writes a **Machines** section: one entry per machine module the design system exports, from its doc comment, with the import line an artifact uses. MEPA's entry shows its instructions, its registers and memory tables as written in both languages, and its notes, so an agent writes them without reading the definition. A machine module without a doc comment fails the generator, as an undocumented component does.
- [x] The `Stage` doc comment gains a "Machine traces" paragraph pointing to the Machines section, and saying that a Stage with `body` holds one table, so a growing structure beside a fixed one shares a table with a role column, as MEPA's record does (the paper check's documented limit).
- [x] The check's `component-reference` failure catches a stale Machines section as it does any other: a test at the check's seam extends the existing stale-reference case only if no existing test could catch it.
- [x] The catalog has a MEPA page, linked from the catalog's index, whose short program uses every instruction MEPA covers so far, in a pt-BR Stage and an English Stage, each with its tables as written. It steps through both in a browser, with each language's sentences, the reversed and dashed lines and the strong cells showing.
- [x] Catalog work runs through impeccable in a local session, as `design-system/CLAUDE.md` says.
- [x] Shared parts: the page uses the Stage as it is; no shared part changes.

### 2026-11-09: what 02 leaves for the Machines section and the catalog

From machine trace 02's implementation:

- MEPA is `design-system/src/machines/mepa.ts`, exported as `./machines/mepa`. Its doc comment is the module's leading `/** … */`, before the imports, and already holds what an artifact agent needs: the instructions, both tables as written in pt-BR and English, the marks and the notes. The generator can take it as written and add the import line. `tsconfig.builds.json` includes `design-system/src/machines/*.ts`, so every machine type-checks under the builds' settings even before a build imports it.
- The general layer's types (`Machine`, `Parsed`, `Moved`, `View`, `Said`) and the number formatting (`shownNumber`, `spokenNumber`) are in `design-system/src/machine.ts`, which isn't a package export: artifact agents see only `trace`, documented in the build section from `stage-build.ts`.
- The build section's intro (`scripts/component-reference.ts`) already says a build may import the machines and that a trace's default export is `trace(machine, notes)`.
- Fixtures that run today: `tests/check/valid-artifacts.test.ts` › `machineTrace` (pt-BR, every instruction 02 covers, the memory rows written out of order) and `tests/check/artifact-checks.test.ts` › `stack-machine` (English headers). The catalog's program can start from the first.

### 2026-11-09: resolved

**Result:** `pnpm components` writes a **Machines** section after the components: an intro saying a Stage traces a machine with `trace(machine, notes)`, then one entry per `./machines/*` export in `design-system/package.json`, headed by the import name (`### mepa`), with its import line and the module's leading doc comment as written. A machine module without one fails the generator, "`design-system/src/machines/mepa.ts`: the machine has no doc comment", which the check reports as `component-reference: can't be generated: …`, as for an undocumented component. MEPA's doc comment now opens with a whole pt-BR Stage (a trapezoid's area, (a + b) × h div 2, using every instruction MEPA covers), its build with `reads`, `roles` and `after`, and its tables as written. It also shows the English registers and memory tables written out, and names the pt-BR memory header with `Desl.`. The `Stage` doc comment gains **Machine traces**: written as any Stage with `input`, the build is `trace`, each machine's entry is under "Machines", and a Stage with `body` holds one table, so a growing structure beside a fixed one shares it with a role column, as MEPA's record does. `trace`'s doc points to "Machines". The catalog has `/catalog/mepa/` (`catalog/mepa.mdx`, `pages/mepa.astro`), linked under a new "Machines" group in the catalog's nav: the trapezoid program in a pt-BR Stage (`mepa-trapezio.build.ts`) and an English one (`mepa-trapezoid.build.ts`), each in a `<div lang>` and opened on step 12, where `SOMA` runs. The Stage page's catalog script moved unchanged into `catalog/stage-runs.ts`, which both pages run.

**Commits:** d1bda8b (claim), 0c39ba6 (implementation, docs, notes on 05 and 06), and this closing commit.

**Validation:**
- Stale Machines section: the check compares the whole generated reference with `COMPONENTS.md`, so the existing stale-reference case in `tests/check/reporting.test.ts` already catches a stale Machines section. No test was added, as the ticket allows.
- The undocumented-machine refusal was checked by hand: with MEPA's doc comment stripped, `node scripts/components.ts` exits 1 with that message and writes nothing. No test was added, since the generator's doc-comment refusal for components has none either and a fixture repo for it would cost a full check run.
- In a real browser on a built site (`astro build`, then a Puppeteer script from `scripts/browser-session.ts`), light and dark, at 1280 and 393: `/catalog/mepa/` and `?lang=pt-BR` open both Stages on "12 of 19". Line 10 is `reversed` and line 11 `dashed`, the step's changed cells (`i`, `s`, M[3]'s 8 and its role, `← s`) are `strong`, and M[4] is `muted`. The steps are said in each Stage's language ("Passo 12 de 19. Linha 10. M[3] recebe 3 mais 5, que é 8, e s recebe 3." / "Step 12 of 19. Line 10. M[3] gets 3 plus 5, which is 8, and s gets 3."). Each Stage, stepped from its first example through all 19 steps, ends with exactly the tables as written, as `pnpm check` doesn't run catalog Stages. Without JavaScript and in print, both show the tables as written. There were no page errors and no horizontal overflow. The nav marks MEPA current on its page. The Stage page's catalog runs still open on steps 3, 5, 1 and 6, as its prose says.
- impeccable's detector found nothing on the new and changed catalog files. `tsc -p tsconfig.builds.json` passes with the two new builds, and Prettier is clean.

**Decisions:**
- Machines come from `design-system/package.json`'s `./machines/*` exports, the same list `build-import` allows, and each entry is headed by its import name, since the generator can't derive a display name ("MEPA") from a file.
- The section sits after the components and before the colour sections, so the Stage's build section's "below" pointers read in order.
- Both Stages open mid-run on the same step, so the two languages can be compared side by side. As written shows in print and without JavaScript.
- The catalog program is MEPA's doc-comment example, so the reference and the catalog show one program that uses every instruction.
- No `Desl.` column in the catalog's tables: nothing fills it until 06 (noted there).
- Each Stage sits in a `<div lang>`, so its build says its steps in its own language under either catalog language. The Stage's static chrome (Start, "of", Figure) follows the root `lang`, so one Stage's chrome is always in the page's other language. That's the Stage as it is, and the ticket keeps shared parts unchanged; noted on 05 for the owner.
- The artifact skill's `stage.md` and `SKILL.md` now point to the Machines section.

**Shared parts:** none from `CODING_STANDARDS.md`'s list changed. The page uses the Stage as it is. `CatalogLayout.astro` (a catalog file, not a shared part) gains the nav group, checked on the Components, Stage and MEPA pages. The Stage page's script moved to a module and was checked as above.

**Left undone:** nothing in scope. 05 and 06 must extend the catalog program and the doc-comment example together (notes left on both).
