# 04: Look and the catalog read the Stage's host

Status: claimed
Blocked by: 03

Spec: [The Stage on its page](../spec.md).

**What to build:** the Stage's element reflects three facts on its host, as the Stepper already reflects its count with `data-count`: the step it shows, how many steps the run has, and whether the page refused the run. `pnpm look` and the catalog's `stage-runs.ts` then read those and the step row, and nothing else inside the Stage.

Today `scripts/look.ts` decides a run "ran or was refused" when the host has `data-stepped` or the said line differs from the prompt. `data-stepped` is a hook for a CSS transition, and a refusal never clears it. A run whose first line equals the prompt defeats the second test, which is why the fixture `look-equal-prompt` exists. With the host saying its state, the guess and that fixture go.

`data-stepped` stays for the transition. The names of the three attributes are this ticket's to choose.

This is design-system work: do it in a local session with impeccable (`design-system/CLAUDE.md`).

- [x] The Stage's host says its step and its count while a run shows, neither before a choice, and that the run was refused when the page refused it.
- [x] A new run after a refusal clears the refusal from the host.
- [x] `scripts/look.ts` reads a Stage's run, its steps and a refusal from the host. It no longer reads `data-stepped`, compares the said line with the prompt, or reads the counter's text.
- [x] `design-system/catalog/stage-runs.ts` reads the count from the host.
- [x] `tests/stepping` asserts the three facts on the host: through a run, at a refusal, and at the run after it.
- [x] The look acceptance cases pass (`ARTIFACTORY_BROWSER_ACCEPTANCE=1`): a refusal recorded and a stuck forward failing stay. The `look-equal-prompt` fixture and its case go, with its line in `docs/agents/test-seams.md` if it has one.
- [x] `pnpm look` prints the same line under each Stage as before.
- [x] No doc comment, `COMPONENTS.md` or `artifact` skill text changes: what look prints and what an agent writes are unchanged.

## Comments

### 2026-11-11: what 02 left for the step row's readers

From [02](02-the-step-row-owns-stepping.md)'s implementation. `scripts/look.ts` now steps a Stepper and a Stage the same way, through `stepRow`. It clicks the row's last button (`.step-controls > button:last-of-type`) and reads the step shown from the start of `.step-counter`. When look reads the step from the Stage's host, the Stepper still needs another source, or the counter read stays for it. `StepControls.astro` still writes `${kind}-back` and `${kind}-forward`. Nothing in the element reads them any more, but `design-system/catalog/stage-runs.ts` reads `.stage-forward`, and so does the look-stuck fixture in `tests/check/browser-verification.test.ts`, whose script blocks `button.stage-forward`. Once those read the step row, the `kind` prop and both classes can go.

### 2026-11-11: what 03 left for the host's state

From [03](03-one-module-for-the-stage-on-its-page.md)'s implementation. `design-system/src/stage-on-page.ts` (`StageOnPage`) now writes everything a shown step or a refusal puts on the page. `show(shown, step, count, announcement)` writes the counter, the said line and the announcement, and `refuse(why, field?)` hides the counter and says the refusal. The element calls them from `#show` and `#refuse`. They are where the host's step, count and refused facts belong, beside the `.stage-` classes they replace for look. A run's name for look's printed line is `runName` from the same module (`@artifactory/design-system/stage-on-page`). Look's `shootStage` still reads `data-control`, `.stage-field input`, `.stage-start`, `.stage-choice`, `data-group` and `.stage-option input` to find and start the first run, which this ticket's checklist leaves to you.

### 2026-11-11: implementation

Implementer session, branch `impl/stage-on-its-page-04`, from the integration branch at `310be9e`. Commits: `474b661` (claim), `9d5b992` (the change), and this record.

**Result.** The Stage's host says three facts, written by `StageOnPage.show` and `refuse` in `design-system/src/stage-on-page.ts`:

- `data-current-step` and `data-count` while a run shows, set by `show` and absent before a choice and after a refusal. `data-step` was passed over because a figure Stepper's parts already use it, for the steps a part shows in.
- `data-refused`, set by `refuse` to the refusal's text, the line the Stage says, and removed by the next `show`. It holds the text so look can print its `refused: …` line from the host. A field whose rule the typed input breaks is a refusal too.

`data-stepped` is unchanged, still only the transition's hook.

- **`scripts/look.ts`:** a Stage counts as ran or refused when its host has `data-current-step` or `data-refused`. Look takes the run's steps from `data-count`, the refusal from `data-refused`, and the step shown from `data-current-step`. It no longer reads `data-stepped`, `.stage-say`, the prompt or `.stage-counter`. A Stepper's host says only its count, so look still reads a Stepper's step shown from the start of the row's `.step-counter`. Making that a host fact means changing `stepper-element.ts` or `step-row.ts`, which this run didn't assign. Look still finds and starts the first run through `data-control`, `.stage-field input`, `.stage-start`, `.stage-choice`, `data-group` and `.stage-option input`. The checklist doesn't cover those, and no host fact could stand in for them.
- **`design-system/catalog/stage-runs.ts`:** waits for the host's `data-count` and steps with the row's last button. It still clicks `.stage-start` or the option to start, and the typing loop still finds `.stage-field input`.
- **Class cleanup:** `StepControls.astro` loses its `kind` prop and the `stage-`/`stepper-` `back`/`forward` classes. Nothing else read them once the look-stuck fixture's blocking script matched `.step-controls > button:last-of-type`. Dropping the prop changed one attribute in each of `Stage.astro` and `Stepper.astro`, which this run didn't assign. No CSS named the classes.
- **Fixture:** `look-equal-prompt` and its case are gone. The remaining case, now named for a refused Stage and a stuck forward, lost the branch only that fixture reached. `test-seams.md` had no line for the fixture. Seam 5's list there now names the host's step and count, and the refusal on the host cleared by the next run.

**Validation.**

- `tests/stepping/stage.test.ts`: before a choice the host says nothing. At steps 1, 2, 3 and back to 1 it says each step of 3. At a refused field and at a refused run (too many steps) it says only the refusal, the same text as the said line. The run after it says step 1 of 3 with the refusal cleared. Red first, before the module wrote anything (1 failure). Two mutations: dropping the refusal attribute failed the field and run refusals (2 failures), and dropping only its removal in `show` failed the run after it (1 failure). The source was restored each time.
- `ARTIFACTORY_BROWSER_ACCEPTANCE=1 pnpm exec vitest run tests/stepping tests/check/browser-verification.test.ts`: 54 passed, none skipped. That includes a refusal recorded, a stuck forward failing (`advancement` expected 2, got 1), and the printed lines `first options start = A, search = breadth, 2 steps`, `… refused: … Choose other options.` and `first example a = 4, b = 2, 2 steps`.
- **Catalog and sample, in Chromium:** Puppeteer through `scripts/browser-session.ts`'s `startBrowser`, reduced motion, 1280 × 900. I built the integration tip `faf9987` in a detached scratch worktree and this branch, each with `astro build`, and ran one script against each build. It went through every `artifact-stage` and `artifact-stepper` on `/catalog/`, `/catalog/?lang=pt-BR`, `/catalog/stage/`, `/catalog/stage/?lang=pt-BR`, `/catalog/mepa/` and `/rsa-from-scratch/`: 41 hosts, 28 of them Stages. Each host was recorded as the page opened, with the catalog's own runs from `stage-runs.ts` applied. A Stage then ran Start or the first option of each group. Every host then went forward 8 times and back once. At each state the script recorded the counter, the said line, the announcement, `disabled` and `aria-disabled` on both buttons, `data-stepped`, a hash of the host's screenshot and a hash of its `outerHTML`. The hash was taken with the three new attributes and the four removed classes stripped. The two records are identical: 438 states, 176 forward clicks that moved a step. On this branch the host's facts agreed with what showed at all 308 Stage states: 254 counted (step and count as the counter reads), 44 refused (`data-refused` equal to the said line, no step or count) and 10 before a run (none of the three).
- **`pnpm look rsa-from-scratch` on both builds:** the report is identical once build timestamps and paths are stripped. Both Stages print the same line (`first example e = 7, phi = 60, 22 steps` and `first example p = 5, q = 11, e = 3, m = 9, 10 steps`), and all 110 PNGs match byte for byte.
- `impeccable detect` on `StepControls.astro`, `Stage.astro`, `Stepper.astro`, `stage-on-page.ts` and `stage-runs.ts` found nothing. The page's look is unchanged: the screenshots above are identical.

**Shared parts.** `StepControls.astro` loses only its per-kind classes and the `kind` prop. Its markup otherwise and `step-row.ts` are unchanged. It reaches the Stage and every Stepper form, all checked in the catalog comparison above (D2, figure, one-block and block-per-step code Steppers, Stages and MEPA Stages).

**Left undone.** Nothing on the checklist. A Stepper's step shown is still read from its counter's text, for the reason above. No doc comment, `COMPONENTS.md` or `artifact` skill text changed.

### 2026-11-11: handoff

Owner: implementer session for ticket 04; no delegated agents.
Where: `/home/isolino/.t3/worktrees/artifactory-oss/t3-93c42833-7c07accbe8abbcf1`, `impl/stage-on-its-page-04`, merged with the integration tip `faf9987`.
Done: the implementation above, with its validation; full check next.
Partial: none. Findings: none.
Decisions: [spec comments](../spec.md#comments), round 2 Q7.
Running: full `pnpm check`. Next: fix anything it reports, else hand back.
