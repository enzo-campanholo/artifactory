# Machine trace

Source: [Machine-trace component](../artifact-generation-gaps/issues/04-machine-trace-component.md), on the [Artifact generation gaps](../artifact-generation-gaps/map.md) map. Every decision below was made with the owner on 2026-11-08, and the ticket's `## Answer` records them. [ADR 0008](../../docs/adr/0008-the-design-system-holds-machines.md) records why machines live in the design system.

## Problem

Three custom builds in the owner's private copy simulate the same stack machine, MEPA (a P-code machine with the program counter `i`, the stack top `s`, a display `D` and memory `M`): one in a base artifact and two in a follow-up on subroutine calls. Each was copied from the base and extended. The two follow-up builds differ only in about 30 lines of program data. What's copied is MEPA's instruction semantics and how each instruction is narrated, about 100 of each build's 160 to 230 lines. Presentation is the smaller part: the register and memory tables, the current and next instruction marks, the input and the output. Each program is also written twice: once in the Stage's code fence, its addresses typed by hand because line numbers started at 1, and once as a TypeScript array.

More MEPA artifacts are coming, and the owner also means to trace register machines, JVM-style machines, three-address code, Turing machines and finite automata. So the fix is general: a **machine trace** in the design system that runs **machine** definitions inside a Stage, with MEPA's as the first.

## Behaviour

### A build that traces a machine

A machine trace is an ordinary Stage with `input` (or `choose`), its code fence and its tables written as content, as today. Its build is a few lines:

```ts
// exemplo2.build.ts
import { trace } from "@artifactory/design-system/stage-build";
import mepa from "@artifactory/design-system/machines/mepa";

export default trace(mepa, {
  reads: ["x", "y"],
  labels: { L1: "o início de main", L2: "o início de div" },
  subroutines: { L2: { params: ["a", "b"], returns: true } },
  roles: {
    1: ["x, global", "y, global"],
    5: "cópia de a",
    6: "cópia de b",
    7: "a div b",
    11: "lido",
    13: "lido",
    15: ["valor de retorno"],
    16: "parâmetro a",
    17: "parâmetro b",
  },
  after: { 20: "As globais x e y estão liberadas." },
});
```

- `trace(machine, notes)` returns a `Build`. It reads the program from the Stage's content, runs the machine on the owner's input, and returns its steps. `defineBuild`'s type check of the input against the Stage's fields still applies.
- A build imports only the design system: `stage-build` and the machine modules under `@artifactory/design-system/machines/`. ADR 0007's "imports nothing but the design system" still holds.
- A Stage whose build doesn't trace a machine is unchanged.

### The Stage hands builds their content

`steps` gets a second argument: the Stage's content as written. This includes the code block's lines by the number the page shows (with [Code display](../code-display/spec.md)'s `start=N`), each line's plain text, and each table's headers and rows as plain text, found as `rows` and `cells` find them. Every build gets it, not only machine traces: a non-machine build may read it too. Existing builds ignore it.

So a program is written once, in the content. MEPA reads its program from the fence. A Turing machine could read its own from a fence of transitions or from a transition table.

### The general layer

A machine definition gives:

- `parse(content, notes)`: the program, or the problems that stop it, each naming a code line or a table cell.
- `start(program, input)`: the starting state.
- `step(state)`: the next state, the sentence that says what happened, and whether the machine has halted.
- `view(state)`: what the Stage shows for that state, as a `Step` without `say`: `lines`, `rows`, `cells`, `parts`, `body`.

The trace gives:

- **The run loop:** a first step that shows the starting state, then one step per `step` until the machine halts, under the Stage's 200-step limit, which stays for every Stage. A run past it gets the Stage's "Isso dá mais de 200 passos" line. An artifact keeps runs short through its input bounds.
- **Automatic `strong`** on every cell whose text changed since the step before. The first step marks only what the view marks. A view can still mark a cell `strong` itself, such as a write of the value the cell already held, which a text diff can't see.
- **Number formatting:** a true minus sign shown (`−1`), the spoken form said ("menos 1"), and the `?` / "sem valor" of a cell with no value. The machine's sentences use them, so every machine says numbers alike.

"Current" and "next" belong to each machine's view. MEPA reverses the line it ran and dashes the line `i` points at next, while a Turing machine reverses the transition that fired.

### Narration

A machine's sentences come in pt-BR and English, chosen by the artifact's main language, as the Stage's own lines are. Every sentence follows "Say it for the ear": operators in words, "M[4] recebe 7", not "M[4] ← 7".

### Notes

Notes are the per-program data a build gives, in the artifact's language, keyed by address or label. They hold what the three copies change today besides the program. MEPA's are:

- `reads`: the Stage's field names in the order `LEIT` reads them.
- `labels`: each label's place name ("o início de div"), said when a jump lands there or passes its `NADA`.
- `subroutines`: per label, its parameters, first to last, and whether it returns a value. MEPA's view uses them for the record's offsets (`Desl.`), and its `ENPR` narration names where each parameter sits.
- `roles`: by address, the role of each cell that instruction writes ("parâmetro a", "valor de retorno"). An `AMEM n` takes a list of `n` roles.
- `after`: by address, a sentence added to that instruction's narration ("Só resta a global n na pilha.").

The notes aren't read from the fence's `;` comments: that would be fragile, and it would put teaching text in code comments.

### MEPA

`@artifactory/design-system/machines/mepa` covers every instruction the three builds use: `INPP`, `AMEM`, `DMEM`, `LEIT`, `ARMZ`, `CRVL`, `CRCT`, `SOMA`, `MULT`, `DIVI`, `IMPR`, `DSVS`, `NADA`, `CHPR`, `ENPR`, `RTPR`, `PARA`, and `FIM` as the listing's last line. More join with the first artifact that needs them, by the same proposal.

- **The listing** is the fence, with `start=0`, so address k is the shown line k. Each line is an optional label (`L2:`), an instruction with its arguments (`CRVL 1,-5`, `CHPR L2,1`), and an optional `;` comment. Addresses are no longer typed into the listing.
- **The registers table** has the header `Registrador | Valor` (`Register | Value` in English) and the rows `i`, `s`, every `D[k]` the program uses, `entrada` and `saída` (`input`, `output`). The input and output rows list values in order, `—` when empty.
- **The memory table** has the header `Célula | Dado | Papel | Desl. | Topo` (`Cell | Data | Role | Offset | Top`). `Papel` and `Desl.` are optional: the view writes only the optional columns the table has. Its rows are `M[0]` up to as many cells as the artifact writes, in any order. The view reads how many there are from the table. A cell above `s` is `muted` and shows no role or offset. `← s` marks the top.
- **The lines:** the instruction that ran is `reversed`, and the one `i` points at next is `dashed`, unless the run has stopped.

The catalog and `COMPONENTS.md` show these tables as written in both languages, so an agent writes them without reading the definition.

### Failures

- A program that doesn't parse fails as `stage-run`, naming the code line, as other Stage runs do: an unknown instruction, wrong arguments, a jump or call to a missing label, a listing whose fence doesn't start at 0.
- So do notes keyed to an address or label the program doesn't have, a `subroutines` entry on a label `CHPR` never calls, and a `reads` name that isn't one of the Stage's fields.
- A table the view writes into that's missing, or missing a required column, fails as the Stage's existing "a row, column … the content doesn't have" failure does.

### The paper check

Each machine the owner expects fits `parse` / `start` / `step` / `view` without changing the general layer:

| Machine | State | Program from | View | Needs |
| --- | --- | --- | --- | --- |
| Register machine | registers, memory, program counter | the fence | a registers table and a memory table; ran line `reversed`, next `dashed` | nothing new |
| JVM-style | operand stack, locals, frames, program counter | the fence | one table holding locals and the operand stack, with a role column per cell as MEPA's record does, since `body` needs the Stage's only table | nothing new |
| Three-address code | named variables and temporaries, program counter | the fence | a variables table with every name written as a row, `muted` until assigned | nothing new |
| Turing machine | control state, head, tape | a fence of transitions, or a transition table | the transition that fired `reversed`; the tape as table rows with a head column, as MEPA's `Topo` | text input; runs past 200 steps are refused |
| Finite automaton | current state, position in the word | a transition table, or a fence | the current state's part `reversed` in a drawing, and the word's symbols as rows | text input |

What this shows:

- Automata and Turing machines read a word, which `input`'s whole numbers can't hold. [Typed words in a Stage](../artifact-generation-gaps/issues/10-typed-words-in-a-stage.md) decides how a Stage takes one, and each of those machines waits on it.
- A Stage with `body` holds exactly one table, so a growing structure beside a fixed one (frames beside locals, a tape beside a transition table) shares one table with a role column, as MEPA's record does, or puts its program in the fence. This stays a documented limit, not a change.
- Every other machine's definition joins the design system by the owner-confirmed proposal when an artifact needs it. None is part of this spec.

## Moving the private copy's builds

A private-copy ticket moves the three MEPA builds onto `trace(mepa, …)`. Their fences drop the typed-in addresses for `start=0`, their tables take MEPA's headers (the base artifact's `Conteúdo` column becomes `Dado`), and their header comments saying a component is due go. Their pages should show the same steps they show today. Where a sentence changes, the change comes from the shared narration.

## Documentation

- The `Stage` doc comments (and so `COMPONENTS.md`, via `pnpm components`): `steps`'s content argument, under `Build`, and a "Machine traces" paragraph pointing to the machines.
- Doc comments on `trace` and each machine module, generated into `COMPONENTS.md` under a **Machines** section. MEPA's covers its instructions, its tables in both languages, its notes and its failures.
- The `artifact` skill:
  - `.claude/skills/artifact/rules.md` › **Custom builds**: "The second time, propose a component" becomes "propose a component or a machine". A build that runs a machine the design system has uses `trace`, never a copy. "Missing a control or a mark?" lists that a Stage hands builds their content.
  - `.claude/skills/artifact/stage.md`: the content argument, `trace`, and the new `stage-run` failures.
- `design-system/PRODUCT.md`: beside "They must work across subjects rather than being tailored to one", a line saying machines are the exception: subject content, run by a subject-neutral trace (ADR 0008).
- The catalog: a page per machine. MEPA's holds a short program that uses every instruction its definition covers, in a pt-BR and an English Stage. Catalog work runs through impeccable in a local session (`design-system/CLAUDE.md`).

## Shared parts

- `stage-element.ts` and the check's Stage runner reach every Stage: handing builds their content must leave every existing Stage's steps as they are. Check the catalog's Stage page and the sample artifact's Stages.
- `stage-build.ts` gains `trace` and the content type, and reaches every build's types.
- No visual part changes: the trace renders through the Stage's existing marks, tables and code lines.

## Out of scope

- Definitions for the register machine, JVM-style machine, three-address code, Turing machine and finite automaton: each joins by proposal when an artifact needs it.
- Text input: [Typed words in a Stage](../artifact-generation-gaps/issues/10-typed-words-in-a-stage.md), specified in [Stage text input](../stage-text-input/spec.md).
- Raising the 200-step limit.
- A component that replaces the Stage and renders a machine's listing and tables itself.
- A Stage whose code changes between steps: the trace doesn't need it, since a program doesn't change while it runs.
