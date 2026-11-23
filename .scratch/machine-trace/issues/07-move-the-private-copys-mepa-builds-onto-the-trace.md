# 07: Move the private copy's MEPA builds onto the trace

Status: resolved
Blocked by: 06, 08

**What to build:** the three MEPA builds in the owner's private copy (one in a base artifact, two in a follow-up on subroutine calls) become `trace(mepa, …)` builds of a few lines each, with their programs written once, in their Stages' fences. The work happens in the private copy, after the Sync upstream workflow has brought tickets 01 to 06 in; claim, comment on and close this ticket here, upstream. Being public, this ticket and its closing comment name no private artifact ([Machine trace](../spec.md) › Moving the private copy's builds).

- [x] Each of the three builds is `trace(mepa, notes)`, with its notes (`reads`, `labels`, `subroutines`, `roles`, `after`) carrying what the copies changed besides the program, and imports only the design system.
- [x] Each fence takes `start=0` and drops its typed-in addresses; each Stage's tables take MEPA's headers (the base artifact's `Conteúdo` column becomes `Dado`).
- [x] The header comments saying a machine-trace component is due are gone.
- [x] Each page shows the same steps as before, compared with `pnpm look` shots taken before and after; where a sentence changes, the change comes from the shared narration, and the closing comment lists those changes without naming the artifacts.
- [x] `pnpm check` passes in the private copy.

## Comments

### 2026-11-09: what 06 leaves for the move

From machine trace 06's implementation (`design-system/src/machines/mepa.ts`; its doc comment, and so `COMPONENTS.md` › Machines, has the whole contract):

- **Semantics** follow the common MEPA: `CHPR L,k` pushes the return address (the next line's) and k, then jumps; `ENPR k` pushes `D[k]` and sets `D[k]` to the next cell, the record's base; `RTPR k,n` sets `D[k]` back from the top, `i` from the return address and drops `s` by n + 3. The k `CHPR` pushes is only data: nothing reads it back. If a build's copy did something else (say, kept a different value in that cell), its tables as written change, and the closing comment should say so.
- **`D[k]` with no value:** `ENPR 1` before any earlier `D[1]` keeps `?` in its cell, and `RTPR` gives `D[1]` back that lack of value, so the registers table's `D[1]` row reads `?` after the last return. The tables as written show that.
- **Roles:** without a `roles` note at their address, `CHPR`'s two cells take the roles "endereço de retorno" and "nível k" ("return address", "level k") and `ENPR`'s "D[k] guardado" ("saved D[k]"). A `roles` note on a `CHPR` is a list of 2, and on an `ENPR` one role, to say them as a copy did. Parameters and the return value take their roles from the `roles` notes on the instructions that push them (`AMEM 1` for the return value, the `CRVL`s for the arguments), and `ARMZ` keeps them.
- **`Desl.`:** a record's cells get their offsets from `ENPR` to `RTPR`, from its return value (when `subroutines` says it returns one) or first parameter up to the top; with no `subroutines` entry for the called label, from the return address (−3). Globals and cells above `s` show none.
- **Narration** of the new instructions is the shared one: "Chama L2, o início de div: M[5] recebe 18, o endereço de retorno, M[6] recebe 1, o nível, s recebe 6 e i recebe 3.", "Entra em L2, o início de div, no nível 1: s recebe 7, M[7] guarda D[1], ainda sem valor, e D[1] recebe 8. Os parâmetros a e b estão em M[3] e M[4], nos deslocamentos menos 5 e menos 4. O valor de retorno vai em M[2], no deslocamento menos 6." and "Retorna: D[1] volta a não ter valor, i recebe 18 e s recebe 2. O valor de retorno, 3, fica no topo, em M[2]." List where these differ from the copies' sentences.
- **Failures:** a `subroutines` entry on a label no `CHPR` calls ("`subroutines` names the label `L2`, which no `CHPR` calls: the listing calls `L1`") and a call to a missing label ("`CHPR L9,1` calls the label `L9`, …") fail as `stage-run`. MEPA doesn't check `RTPR`'s n against the `subroutines` entry's parameters, so keep them in step by hand.

### 2026-11-23: owner decisions

Claimed by a cloud session (Claude Code), working in a checkout of the private copy and this upstream checkout.

- **Found:** the follow-up's two builds, and its prose, figure, instruction table and questions, teach a call convention other than the one 06 built. `CHPR p,k` pushes the return address, the old `D[k]` and k; `ENPR k` pushes an access link, `D[k-1]`; `RTPR n` drops n + 4 and rebuilds the outer displays; the last parameter sits at −5. Moved as they are, its Stages would contradict its page. The base artifact uses no call and moved as planned.
- **Approved** (owner, in this session, 2026-11-23): the design system's MEPA follows the course's convention ([08](08-mepa-calls-follow-the-course-s-convention.md)), and the follow-up then moves with its listings as written. Scope: `machines/mepa.ts`, its doc comment, its catalog page, its tests and the `artifact` skill.
- **Approved** (owner, in this session, 2026-11-23): 08 runs in this cloud session without impeccable, waiving `design-system/CLAUDE.md`'s local-session rule for this change, which touches no component, token or style.

### 2026-11-23: the base artifact moved

The base artifact's build is `trace(mepa, …)` with `reads` and two `after` sentences (the variables reserved and freed), in the private copy's `main` at `8587a28`, whose CI run passed. Its fence takes `start=0` and `FIM`, its input and output rows moved into the registers table, and `Conteúdo` became `Dado`. `pnpm look` before and after: the same 17 steps, each with the same lines marked and the same tables. Every sentence changes, all from the shared narration: the steps no longer open with the address and instruction ("P[10], SOMA: …"), the first step says the machine hasn't run yet rather than what the input holds, the effect is said as "recebe" ("M[3] recebe 5 mais 20, que é 25, e s recebe 3."), loads and stores no longer name the variable, and `PARA` says "O programa para." without the output. A full `pnpm check` passed in the private copy before the push.

### 2026-11-23: handoff

Owner: a cloud session (Claude Code); no delegated agents.
Where: the private copy's branch `claude/clever-mendel-ka9tdd`, HEAD `ed55b46`, on top of the base artifact's move (`8587a28`, on its `main`); upstream, this branch, with [08](08-mepa-calls-follow-the-course-s-convention.md) resolved at `9f466c2`.
Done: the follow-up's two builds are `trace(mepa, …)` with `labels`, `subroutines`, `roles` (the copies' "end. de retorno", "D[1] anterior", "nível" for `CHPR`'s cells) and `after` (the copies' sentences on the empty stack, the globals reserved and freed, and the return value's cell); their fences take `start=0`, their input and output rows join the registers table, and the prose sentence on what sits below the code says so. With 08's machine in that checkout's working tree, `pnpm check --artifacts-only` passed with the tables as written, and `pnpm look` shows each step as before, plus the trace's starting step (16 and 23 steps, from 15 and 22): the same lines, cells, registers and top at the call, entry and return steps compared.
Partial: none. Narration changes, all from the shared narration: the steps lose the "P[4], ENPR 1:" opening; `CHPR` says "M[3] guarda D[1], ainda sem valor" for the saved display; `ENPR` says where the parameters sit ("O parâmetro a está em M[1], no deslocamento menos 5.") in place of "O registro está completo: a em D[1] menos 5, M[1]"; `RTPR` says "Retorna: D[1] volta a não ter valor, i recebe 13 e s recebe 0." without the level it read; a muted cell with no value shows `?`; roles and offsets are `strong` on the step they appear.
Decisions: [owner decisions](#2026-11-23-owner-decisions).
Running: none. Next: once this branch reaches upstream `main` and the Sync upstream workflow brings it into the private copy, rebase the copy's branch onto its `main`, run `pnpm check`, push to `main`, watch CI, then close this ticket.

### 2026-11-23: closing comment

Cloud session (Claude Code). Upstream: [08](08-mepa-calls-follow-the-course-s-convention.md) merged in #10 (`28b86c7`), and upstream CI passed on it.

**Result:** all three MEPA builds in the private copy are `trace(mepa, …)` builds of a few lines, importing only `trace` and the machine. The base artifact moved in `8587a28`, and the follow-up on subroutine calls in `c4f3664`, after the Sync upstream workflow (started by hand) brought 08 in as `28dcf28`. Each fence takes `start=0` and `FIM`, each Stage's input and output rows joined its registers table, the base artifact's `Conteúdo` became `Dado`, and the copies' header comments are gone.

**Validation:**

- In the private copy, a full `pnpm check` on `c4f3664`: 0 failures. Its CI run passed, deploy and probe included, as did the run on the sync's merge and the base artifact's run on `8587a28`.
- `pnpm look` before and after, for both artifacts: every step shows the same lines, cells, registers and top as before. The follow-up's Stages gain the trace's starting step (16 and 23 steps, from 15 and 22); the base artifact's already had one (17 steps).

**Sentences that changed**, all from the shared narration (2026-11-23 comments above): each step drops its "P[n], OP:" opening and says its effect as "recebe"; the base artifact's loads and stores no longer name the variable, its first step says the machine hasn't run yet, and `PARA` says "O programa para." without the output; in the follow-up, `CHPR` says the saved display ("M[3] guarda D[1], ainda sem valor"), `ENPR` names where each parameter sits in place of "O registro está completo: …", and `RTPR` no longer says the level it read. The copies' other sentences (the empty stack, the variables reserved and freed, the return value's cell) are `after` notes. A muted cell with no value shows `?`, and roles and offsets are `strong` on the step they appear.

**Decisions:** [owner decisions](#2026-11-23-owner-decisions): MEPA follows the course's call convention (08), with the local-session rule waived for it.

**Left undone:** nothing in scope. 08's closing comment notes the English memory table's `← s` wrapping at 393 px, for a design-system session.

