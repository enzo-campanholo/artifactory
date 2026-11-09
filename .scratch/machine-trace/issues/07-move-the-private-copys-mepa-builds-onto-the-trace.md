# 07: Move the private copy's MEPA builds onto the trace

Status: ready-for-agent
Blocked by: 06

**What to build:** the three MEPA builds in the owner's private copy (one in a base artifact, two in a follow-up on subroutine calls) become `trace(mepa, …)` builds of a few lines each, with their programs written once, in their Stages' fences. The work happens in the private copy, after the Sync upstream workflow has brought tickets 01 to 06 in; claim, comment on and close this ticket here, upstream. Being public, this ticket and its closing comment name no private artifact ([Machine trace](../spec.md) › Moving the private copy's builds).

- [ ] Each of the three builds is `trace(mepa, notes)`, with its notes (`reads`, `labels`, `subroutines`, `roles`, `after`) carrying what the copies changed besides the program, and imports only the design system.
- [ ] Each fence takes `start=0` and drops its typed-in addresses; each Stage's tables take MEPA's headers (the base artifact's `Conteúdo` column becomes `Dado`).
- [ ] The header comments saying a machine-trace component is due are gone.
- [ ] Each page shows the same steps as before, compared with `pnpm look` shots taken before and after; where a sentence changes, the change comes from the shared narration, and the closing comment lists those changes without naming the artifacts.
- [ ] `pnpm check` passes in the private copy.

## Comments

### 2026-11-09: what 06 leaves for the move

From machine trace 06's implementation (`design-system/src/machines/mepa.ts`; its doc comment, and so `COMPONENTS.md` › Machines, has the whole contract):

- **Semantics** follow the common MEPA: `CHPR L,k` pushes the return address (the next line's) and k, then jumps; `ENPR k` pushes `D[k]` and sets `D[k]` to the next cell, the record's base; `RTPR k,n` sets `D[k]` back from the top, `i` from the return address and drops `s` by n + 3. The k `CHPR` pushes is only data: nothing reads it back. If a build's copy did something else (say, kept a different value in that cell), its tables as written change, and the closing comment should say so.
- **`D[k]` with no value:** `ENPR 1` before any earlier `D[1]` keeps `?` in its cell, and `RTPR` gives `D[1]` back that lack of value, so the registers table's `D[1]` row reads `?` after the last return. The tables as written show that.
- **Roles:** without a `roles` note at their address, `CHPR`'s two cells take the roles "endereço de retorno" and "nível k" ("return address", "level k") and `ENPR`'s "D[k] guardado" ("saved D[k]"). A `roles` note on a `CHPR` is a list of 2, and on an `ENPR` one role, to say them as a copy did. Parameters and the return value take their roles from the `roles` notes on the instructions that push them (`AMEM 1` for the return value, the `CRVL`s for the arguments), and `ARMZ` keeps them.
- **`Desl.`:** a record's cells get their offsets from `ENPR` to `RTPR`, from its return value (when `subroutines` says it returns one) or first parameter up to the top; with no `subroutines` entry for the called label, from the return address (−3). Globals and cells above `s` show none.
- **Narration** of the new instructions is the shared one: "Chama L2, o início de div: M[5] recebe 18, o endereço de retorno, M[6] recebe 1, o nível, s recebe 6 e i recebe 3.", "Entra em L2, o início de div, no nível 1: s recebe 7, M[7] guarda D[1], ainda sem valor, e D[1] recebe 8. Os parâmetros a e b estão em M[3] e M[4], nos deslocamentos menos 5 e menos 4. O valor de retorno vai em M[2], no deslocamento menos 6." and "Retorna: D[1] volta a não ter valor, i recebe 18 e s recebe 2. O valor de retorno, 3, fica no topo, em M[2]." List where these differ from the copies' sentences.
- **Failures:** a `subroutines` entry on a label no `CHPR` calls ("`subroutines` names the label `L2`, which no `CHPR` calls: the listing calls `L1`") and a call to a missing label ("`CHPR L9,1` calls the label `L9`, …") fail as `stage-run`. MEPA doesn't check `RTPR`'s n against the `subroutines` entry's parameters, so keep them in step by hand.
