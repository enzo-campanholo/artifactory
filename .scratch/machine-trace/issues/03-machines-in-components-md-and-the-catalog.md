# 03: Machines in `COMPONENTS.md` and the catalog

Status: ready-for-agent
Blocked by: 02

**What to build:** an artifact agent learns to write a MEPA trace from `COMPONENTS.md` alone, and the owner sees MEPA run on its own catalog page. `COMPONENTS.md` gains a **Machines** section generated from the machine modules' doc comments, the `Stage` entry points to it, and the catalog gains a MEPA page with a short program in a pt-BR and an English Stage ([Machine trace](../spec.md) › Documentation).

- [ ] `pnpm components` writes a **Machines** section: one entry per machine module the design system exports, from its doc comment, with the import line an artifact uses. MEPA's entry shows its instructions, its registers and memory tables as written in both languages, and its notes, so an agent writes them without reading the definition. A machine module without a doc comment fails the generator, as an undocumented component does.
- [ ] The `Stage` doc comment gains a "Machine traces" paragraph pointing to the Machines section, and saying that a Stage with `body` holds one table, so a growing structure beside a fixed one shares a table with a role column, as MEPA's record does (the paper check's documented limit).
- [ ] The check's `component-reference` failure catches a stale Machines section as it does any other: a test at the check's seam extends the existing stale-reference case only if no existing test could catch it.
- [ ] The catalog has a MEPA page, linked from the catalog's index, whose short program uses every instruction MEPA covers so far, in a pt-BR Stage and an English Stage, each with its tables as written. It steps through both in a browser, with each language's sentences, the reversed and dashed lines and the strong cells showing.
- [ ] Catalog work runs through impeccable in a local session, as `design-system/CLAUDE.md` says.
- [ ] Shared parts: the page uses the Stage as it is; no shared part changes.
