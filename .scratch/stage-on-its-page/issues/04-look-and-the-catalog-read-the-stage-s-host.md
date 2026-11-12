# 04: Look and the catalog read the Stage's host

Status: claimed
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

### 2026-11-11: what 02 left for the step row's readers

From [02](02-the-step-row-owns-stepping.md)'s implementation. `scripts/look.ts` now steps a Stepper and a Stage the same way, through `stepRow`. It clicks the row's last button (`.step-controls > button:last-of-type`) and reads the step shown from the start of `.step-counter`. When look reads the step from the Stage's host, the Stepper still needs another source, or the counter read stays for it. `StepControls.astro` still writes `${kind}-back` and `${kind}-forward`. Nothing in the element reads them any more, but `design-system/catalog/stage-runs.ts` reads `.stage-forward`, and so does the look-stuck fixture in `tests/check/browser-verification.test.ts`, whose script blocks `button.stage-forward`. Once those read the step row, the `kind` prop and both classes can go.

### 2026-11-11: what 03 left for the host's state

From [03](03-one-module-for-the-stage-on-its-page.md)'s implementation. `design-system/src/stage-on-page.ts` (`StageOnPage`) now writes everything a shown step or a refusal puts on the page. `show(shown, step, count, announcement)` writes the counter, the said line and the announcement, and `refuse(why, field?)` hides the counter and says the refusal. The element calls them from `#show` and `#refuse`. They are where the host's step, count and refused facts belong, beside the `.stage-` classes they replace for look. A run's name for look's printed line is `runName` from the same module (`@artifactory/design-system/stage-on-page`). Look's `shootStage` still reads `data-control`, `.stage-field input`, `.stage-start`, `.stage-choice`, `data-group` and `.stage-option input` to find and start the first run, which this ticket's checklist leaves to you.
