# 04: Machine-trace component

Type: grilling
Blocked by: 02, 03
Status: resolved

## Question

Should the stack-machine simulator move into the design system as a component, and what would its interface be?

## What the agents reported

Three custom builds now simulate the same stack machine (a P-code machine with `i`, `s`, a display `D` and memory `M`): one in a base artifact and two in a follow-up artifact on subroutine calls. Each build is copied and extended from the base one. ADR 0007 says to propose a design-system component at the second need. The follow-up's brief said to copy the build, which overrode the proposal, so the two new builds carry a header comment saying a machine-trace component is due.

## To decide

- Promote it now, or answer "not yet" (and record that in the builds, as ADR 0007 says)?
- Is the component specific to this machine, or a general "machine trace": a program, registers and memory cells with roles, stepped from typed input?
- What it needs from [Code display](02-code-display.md) (addresses from 0, the current instruction marked) and [Stage controls and drawing](03-stage-controls-and-drawing.md).

## Answer

Decided with the owner on 2026-11-08 (grilling session, rounds 1 to 5; the owner chose a general solution in round 2 and agreed every recommendation after that, with text input moved to its own ticket in round 5). The build is specified in [Machine trace](../../machine-trace/spec.md), and [ADR 0008](../../../docs/adr/0008-the-design-system-holds-machines.md) records the trade-off.

- **Promote now, as a general machine trace with machine definitions.** More MEPA artifacts are coming, and the owner plans register machines, JVM-style machines, three-address code, Turing machines and finite automata. A general trace alone would remove only the presentation (about a quarter of each copy), so each machine's semantics, state, view and narration live as a **machine** definition in the design system, with MEPA's as the first. Contradicts `PRODUCT.md`'s "work across subjects" for machines only, which ADR 0008 records. ADR 0007's second-need rule now ends in "a component or a machine".
- **Inside the Stage, not replacing it.** A build is `trace(machine, notes)`, and the Stage keeps its controls, print, screen-reader text and check.
- **The general layer:** a machine gives `parse`, `start`, `step` and `view`. The trace gives the run loop, automatic `strong` on changed cells, and number formatting. "Current" and "next" are the machine's view, so a Turing machine needs no program counter.
- **The program is written once:** the Stage hands every build its content as written (code lines by shown number, tables' cells), and MEPA parses its program from a `start=0` fence.
- **Per-program notes** are data in the build, keyed by address or label (roles, added sentences, label places, subroutines), never read from `;` comments.
- **Narration in pt-BR and English**, by the artifact's main language, as the Stage's own lines.
- **Kept:** the 200-step limit for every Stage. A program that doesn't parse, or notes that name what it lacks, fail `pnpm check` as `stage-run`, naming the code line. Each machine gets a catalog page.
- **Scope:** the trace, the content argument, MEPA's definition (every instruction the three builds use), a paper check of the five other machines, and a private-copy ticket moving the three builds. Other machines join by proposal when an artifact needs one.
- **Text input** is essential for automata and Turing machines, but it's a Stage control, so it gets its own ticket, [Typed words in a Stage](10-typed-words-in-a-stage.md), which doesn't block this spec.
- **A Stage whose code changes between steps:** not needed. A program doesn't change while it runs.
- **Glossary:** machine, machine trace and program added. Custom build amended.

## Comments

- 2026-11-08, from [Code display](02-code-display.md#answer) (resolved): a fence can take `start=0`, so a program's listing can number from address 0, and a Stage step's `lines` then names lines by that shown number (line 0 is the first). Marking the current instruction stays the Stage's `reversed` line. A Stage's code doesn't change between steps; that remains [Stage controls and drawing](03-stage-controls-and-drawing.md)'s to decide. Spec: [Code display](../../code-display/spec.md).
- 2026-11-08, from [Stage controls and drawing](03-stage-controls-and-drawing.md#answer) (resolved): the Stage's only new control is choice groups, `choose` taking a list of named groups (spec: [Stage choice groups](../../stage-choice-groups/spec.md)). `input` stays whole numbers in fields, and a Stage takes `choose` or `input`, never both. A build still can't draw new structure per run ("not yet", under ADR 0007's second-need rule), the four marks stay, and `say` stays one text for the eye and the ear, so an assignment reads "M[4] recebe 7". A Stage's code still doesn't change between steps: no report asked for it, so raise it here if the machine trace needs it.
