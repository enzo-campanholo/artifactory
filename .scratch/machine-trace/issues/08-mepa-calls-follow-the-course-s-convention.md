# 08: MEPA calls follow the course's convention

Status: resolved
Blocked by: None (can start immediately)

**What to build:** `CHPR`, `ENPR` and `RTPR` run the call convention the owner's course teaches, the one the private copy's follow-up on subroutine calls is written in, in place of the convention 06 built. The owner decided this on 2026-11-23 ([07's comment](07-move-the-private-copys-mepa-builds-onto-the-trace.md#2026-11-23-owner-decisions)).

| Instruction | Effect                                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| `CHPR p,k`  | `M[s+1] ← i + 1; M[s+2] ← D[k]; M[s+3] ← k; s ← s + 3; i ← p`                                                  |
| `ENPR k`    | `s ← s + 1; M[s] ← D[k-1]; D[k] ← s + 1`                                                                       |
| `RTPR n`    | `t ← M[s-1]; D[t] ← M[s-2]; i ← M[s-3]; s ← s - (n + 4)`; while `t ≥ 2`: `D[t-1] ← M[D[t] - 1]; t ← t - 1` |

A record is then, from its base `D[k]` down: the access link at −1, the level at −2, the saved `D[k]` at −3, the return address at −4, the last parameter at −5 and the return value below the first parameter, at −(n + 5).

- [x] `CHPR p,k` pushes the return address, `D[k]` (`?` when it has no value) and k, and jumps; `ENPR k` pushes `D[k-1]`, the access link, and points `D[k]` at the next cell; `RTPR n` takes one argument, reads the level from the record, restores `D[t]`, returns, drops `s` by n + 4 and rebuilds the outer displays through the access links.
- [x] `RTPR k,n` is refused as wrong arguments ("`RTPR 1,2` isn't `RTPR n`, with 1 whole number").
- [x] The registers table's `D[k]` rows are those an `ARMZ`, `CRVL`, `CHPR` or `ENPR` names.
- [x] Default roles: `CHPR`'s three cells "endereço de retorno", "D[1] guardado", "nível 1" ("return address", "saved D[1]", "level 1"); `ENPR`'s "elo de acesso" ("access link"). A `roles` note on a `CHPR` is a list of 3.
- [x] `Desl.` counts the record above from −(n + 5), or from the return address (−4) without a `subroutines` entry; `ENPR`'s narration names the parameters at −5 down.
- [x] The narration of the three instructions says the new cells, in pt-BR and English.
- [x] Tests at the check's seam (fixture repos): the call fixtures' listings and tables as written, worked out by hand for the new convention, pass; `RTPR k,n` fails at its line.
- [x] Docs in the same commit: MEPA's doc comment (and `COMPONENTS.md` through `pnpm components`); the catalog's MEPA page, both Stages, their builds and prose; the `artifact` skill's `stage.md` where it names the call instructions.
- [x] The catalog's MEPA page is checked in a real browser, light and dark, at 1280 and 393.

**Shared parts:** none. The change stays inside `machines/mepa.ts`; the Stage and the trace are used as they are.

Runs in this cloud session, without impeccable: the owner waived the local-session rule for this change ([07's comment](07-move-the-private-copys-mepa-builds-onto-the-trace.md#2026-11-23-owner-decisions)). It changes no component, token or style.

## Comments

### 2026-11-23: closing comment

Cloud session (Claude Code), branch `claude/clever-mendel-ka9tdd`, commit `9f466c2`.

**Result:** `CHPR p,k`, `ENPR k` and `RTPR n` run the convention in the table above, in `design-system/src/machines/mepa.ts`. A record has four linkage cells below its base, so its last parameter sits at −5, its return value at −(n + 5), and a record without a `subroutines` entry starts at its return address (−4). The narration says the new cells ("Chama L2, o início de div: M[5] recebe 18, o endereço de retorno, M[6] guarda D[1], ainda sem valor, M[7] recebe 1, o nível, s recebe 7 e i recebe 3.", "Entra em L2, o início de div, no nível 1: s recebe 8, M[8] recebe 0, o elo de acesso, D[0], e D[1] recebe 9.", "Retorna: D[1] volta a não ter valor, i recebe 18 e s recebe 2."), and a return that rebuilds outer displays names each one.

**Decisions:**

- The rebuild loop stops at a `D[t]` with no value rather than faulting: a level-2 subroutine called for the first time from a level-1 one gives `D[2]` back its lack of value, and the caller's `D[1]` is still right. Taking the course's loop literally there would read a cell from no record. A fixture covers it.
- `RTPR` takes its level from the record, so it faults when the cell below `s` holds no level a `CHPR` in the listing calls ("M[4] holds 0, which isn't a level a CHPR calls: RTPR runs with s on the access link"). This catches a subroutine that returns with locals still on the stack.
- The registers table has a row for every level from 1 up to one a `CHPR` or `ENPR` names, since the rebuild writes every outer display.
- Default roles: "endereço de retorno", "D[1] guardado", "nível 1" for `CHPR`, "elo de acesso" for `ENPR`, in English "return address", "saved D[1]", "level 1", "access link".

**Validation:**

- Test first at the check's seam (fixture repos): the `divisao` and `dobro` fixtures rewritten for the new convention, with tables worked out by hand, failed against 06's machine and pass now; so do a new `aninhada` fixture (a level-2 call from inside a level-1 subroutine, which faulted until the loop stopped at an empty `D[t]`) and the new `RTPR 1,2` and level failures. `tests/check/valid-artifacts.test.ts` and `artifact-checks.test.ts`: 86 of 86.
- Full `pnpm check` on this source: 0 failures (Vitest included).
- The catalog's MEPA page, built and opened in Chromium, light and dark, at 1280 and 393: both Stages open on step 24 of 28, `ARMZ 1,-7` reversed and `RTPR 2` dashed, saying "M[3] recebe 16, do topo, e s recebe 9." / "M[3] gets 16 from the top, and s gets 9.", with the record from M[3] (−7) to M[9] (−1) and M[10] and M[11] muted. No page errors, no horizontal overflow.
- A code review (`/code-review`, medium) found the three issues the decisions above fix, and two doc-comment lines past 100 columns, rewrapped.

**Not done:** impeccable didn't run (cloud session; the owner waived it for this change). At 393 px the English memory table wraps `← s` under the −1 offset, because `Offset` is a wider header than `Desl.`: table layout, not this change, left for a design-system session.

