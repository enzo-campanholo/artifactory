# 08: MEPA calls follow the course's convention

Status: claimed
Blocked by: None (can start immediately)

**What to build:** `CHPR`, `ENPR` and `RTPR` run the call convention the owner's course teaches, the one the private copy's follow-up on subroutine calls is written in, in place of the convention 06 built. The owner decided this on 2026-11-23 ([07's comment](07-move-the-private-copys-mepa-builds-onto-the-trace.md#2026-11-23-owner-decisions)).

| Instruction | Effect                                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| `CHPR p,k`  | `M[s+1] ← i + 1; M[s+2] ← D[k]; M[s+3] ← k; s ← s + 3; i ← p`                                                  |
| `ENPR k`    | `s ← s + 1; M[s] ← D[k-1]; D[k] ← s + 1`                                                                       |
| `RTPR n`    | `t ← M[s-1]; D[t] ← M[s-2]; i ← M[s-3]; s ← s - (n + 4)`; while `t ≥ 2`: `D[t-1] ← M[D[t] - 1]; t ← t - 1` |

A record is then, from its base `D[k]` down: the access link at −1, the level at −2, the saved `D[k]` at −3, the return address at −4, the last parameter at −5 and the return value below the first parameter, at −(n + 5).

- [ ] `CHPR p,k` pushes the return address, `D[k]` (`?` when it has no value) and k, and jumps; `ENPR k` pushes `D[k-1]`, the access link, and points `D[k]` at the next cell; `RTPR n` takes one argument, reads the level from the record, restores `D[t]`, returns, drops `s` by n + 4 and rebuilds the outer displays through the access links.
- [ ] `RTPR k,n` is refused as wrong arguments ("`RTPR 1,2` isn't `RTPR n`, with 1 whole number").
- [ ] The registers table's `D[k]` rows are those an `ARMZ`, `CRVL`, `CHPR` or `ENPR` names.
- [ ] Default roles: `CHPR`'s three cells "endereço de retorno", "D[1] guardado", "nível 1" ("return address", "saved D[1]", "level 1"); `ENPR`'s "elo de acesso" ("access link"). A `roles` note on a `CHPR` is a list of 3.
- [ ] `Desl.` counts the record above from −(n + 5), or from the return address (−4) without a `subroutines` entry; `ENPR`'s narration names the parameters at −5 down.
- [ ] The narration of the three instructions says the new cells, in pt-BR and English.
- [ ] Tests at the check's seam (fixture repos): the call fixtures' listings and tables as written, worked out by hand for the new convention, pass; `RTPR k,n` fails at its line.
- [ ] Docs in the same commit: MEPA's doc comment (and `COMPONENTS.md` through `pnpm components`); the catalog's MEPA page, both Stages, their builds and prose; the `artifact` skill's `stage.md` where it names the call instructions.
- [ ] The catalog's MEPA page is checked in a real browser, light and dark, at 1280 and 393.

**Shared parts:** none. The change stays inside `machines/mepa.ts`; the Stage and the trace are used as they are.

Runs in this cloud session, without impeccable: the owner waived the local-session rule for this change ([07's comment](07-move-the-private-copys-mepa-builds-onto-the-trace.md#2026-11-23-owner-decisions)). It changes no component, token or style.

## Comments
