# 04: Look and the catalog read the Stage's host

Status: ready-for-agent
Blocked by: 03

Spec: [The Stage on its page](../spec.md).

**What to build:** the Stage's element reflects three facts on its host, as the Stepper already reflects its count with `data-count`: the step it shows, how many steps the run has, and whether the page refused the run. `pnpm look` and the catalog's `stage-runs.ts` then read those and the step row, and nothing else inside the Stage.

Today `scripts/look.ts` decides a run "ran or was refused" when the host has `data-stepped` or the said line differs from the prompt. `data-stepped` is a hook for a CSS transition, and a refusal never clears it. A run whose first line equals the prompt defeats the second test, which is why the fixture `look-equal-prompt` exists. With the host saying its state, the guess and that fixture go.

`data-stepped` stays for the transition. The names of the three attributes are this ticket's to choose.

This is design-system work: do it in a local session with impeccable (`design-system/CLAUDE.md`).

- [ ] The Stage's host says its step and its count while a run shows, neither before a choice, and that the run was refused when the page refused it.
- [ ] A new run after a refusal clears the refusal from the host.
- [ ] `scripts/look.ts` reads a Stage's run, its steps and a refusal from the host. It no longer reads `data-stepped`, compares the said line with the prompt, or reads the counter's text.
- [ ] `design-system/catalog/stage-runs.ts` reads the count from the host.
- [ ] `tests/stepping` asserts the three facts on the host: through a run, at a refusal, and at the run after it.
- [ ] The look acceptance cases pass (`ARTIFACTORY_BROWSER_ACCEPTANCE=1`): a refusal recorded and a stuck forward failing stay. The `look-equal-prompt` fixture and its case go, with its line in `docs/agents/test-seams.md` if it has one.
- [ ] `pnpm look` prints the same line under each Stage as before.
- [ ] No doc comment, `COMPONENTS.md` or `artifact` skill text changes: what look prints and what an agent writes are unchanged.

## Comments
