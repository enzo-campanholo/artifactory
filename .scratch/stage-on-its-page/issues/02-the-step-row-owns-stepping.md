# 02: The step row owns stepping

Status: claimed
Blocked by: 01

Spec: [The Stage on its page](../spec.md). A prefactor: no behaviour changes.

**What to build:** today `StepControls.astro` emits two buttons and the class names `${kind}-back` and `${kind}-forward`, and each host writes the stepping behind them: a click moving one step, the left and right arrow keys, the clamp at the first and last step, `aria-disabled` at the ends, and dropping `disabled` once the element connects. `stage-element.ts` has one copy and `Stepper.astro`'s inline element the other.

Make the step row carry that behaviour and one contract: a host tells it how many steps there are, and shows the step it is told. Move the Stepper's element out of `Stepper.astro`'s inline script into a module on the way; `stepper.ts` is already taken by the Stepper's build-time code. Then `scripts/look.ts` keeps one way of stepping, not `stepperStepping` and `stageStepping`.

This is design-system work: do it in a local session with impeccable (`design-system/CLAUDE.md`).

- [x] The click, the arrow keys, the clamp, `aria-disabled` at the ends and enabling on connect are written once, with the step row.
- [x] The Stage's and the Stepper's elements hold none of it. Each says its count and shows the step it is told.
- [x] The Stepper's element is a module the design system can import, and `Stepper.astro` holds no inline element.
- [x] `scripts/look.ts` steps a Stepper and a Stage the same way.
- [x] Every `tests/stepping` case from [01](01-a-fifth-seam-for-the-stage-and-the-stepper-on-a-page.md) passes unchanged, and so does every `tests/check` case, the look acceptance cases included (`ARTIFACTORY_BROWSER_ACCEPTANCE=1`).
- [x] No doc comment, `COMPONENTS.md` or `artifact` skill text changes.
- [x] Shared part: `StepControls.astro` reaches every Stepper form and the Stage. On their catalog pages, a code Stepper, a one-block Stepper, a D2 Stepper, a figure Stepper and a Stage each step with the buttons and the arrow keys, stop at both ends, and print as before. The closing comment records it.

## Comments

### 2026-11-10: what `tests/stepping` reaches

From [01](01-a-fifth-seam-for-the-stage-and-the-stepper-on-a-page.md)'s implementation. The tests find no class, but they do rely on these, so keep them or change the tests' helpers (`tests/stepping/built-page.ts`) in the same commit:

- **Hosts:** `artifact-stage`, found by an option group's or the input's legend, and `artifact-stepper`, found in page order.
- **The step row's buttons:** found by their names, "Passo anterior" and "Próximo passo" in pt-BR, "Previous step" and "Next step" in English. The other language's words are skipped by `data-lang`.
- **Text:** the said line is the one element that showed the prompt before any run. The counter is the innermost element whose text starts "N de M" or "N of M", and is hidden by `hidden`. The announcement is the host's only `aria-live` element.
- **Inputs:** options and fields, found by their `<label>`.
- **Attributes:** drawn parts by `data-part`, with `data-mark` and `data-colour`; code lines by their text, with `data-mark` in a Stage and `data-off` in a one-block Stepper; a figure Stepper's parts by `data-step`, with `data-off`.
- **Loading:** the helper imports every `script[type="module"][src]` and maps `data-module` to `dist/`. A Stepper element moved into a module that `Stepper.astro`'s script imports loads the same way. A Stage that finds its build by any other means than `data-module` needs the helper changed.

### 2026-11-11: implementation

Branch `impl/stage-on-its-page-02`. Commits: `8885914` (claim), `4df6a95` (the change), and this record.

**Result.** `design-system/src/step-row.ts` holds the stepping that both hosts wrote before: the click on each button, the left and right arrow keys, the clamp at the first and last step, `aria-disabled` at both ends, and dropping `disabled` when the host connects. Its contract is `new StepRow(host, show)` plus `setCount(count)`. A host tells the row how many steps there are, and `setCount(0)` means none: a Stage before a run or after a refusal. The row then calls `show(step)` with each step it moves to, the first included. `stage-element.ts` and the new `stepper-element.ts` keep no step logic of their own. Each passes its count, a Stage's run or a Stepper's `data-count`, and paints the step the row gives it. The Stepper still shows its first step unannounced and without `data-stepped`. `Stepper.astro`'s script now only imports `./stepper-element.ts`, which `design-system/package.json` exports as `./stepper-element`. (`./stepper` was taken by the component.) `scripts/look.ts` has one `stepRow` in place of `stepperStepping` and `stageStepping`. It goes forward with the row's last button and reads the step shown from the start of `.step-counter`.

**Markup unchanged.** `StepControls.astro` is untouched, `kind` prop and `${kind}-back`/`${kind}-forward` classes included. The row finds its two buttons as `.step-controls > button`, back then forward, since `StepControls.astro` writes them in that order. The classes stay because `design-system/catalog/stage-runs.ts` and the look-stuck acceptance fixture (`tests/check/browser-verification.test.ts`) still read `stage-forward`. Ticket 04 has a note.

**Validation.**

- `tests/stepping`: 21 passed before the change and 21 after, the tests unchanged. As a check that they reach the new module, the forward button's `aria-disabled` at the end was broken in `step-row.ts`. 8 tests failed, on the Stage and on every Stepper form, and the source was restored.
- `ARTIFACTORY_BROWSER_ACCEPTANCE=1 pnpm exec vitest run tests/check/browser-verification.test.ts`: 33 passed. Those are the look acceptance cases, a refusal recorded and a stuck forward failing included.
- Catalog, in Chromium (Puppeteer through `scripts/browser-session.ts`'s `startBrowser`), with reduced motion at 1280 × 900. I built the integration tip `8885914` in a detached worktree and this branch with `astro build`, and ran one script against each build. It went through every `artifact-stepper` and `artifact-stage` on `/catalog/`, `/catalog/?lang=pt-BR`, `/catalog/stage/` and `/catalog/mepa/`: a D2 Stepper, a figure Stepper, two one-block (`lines`) Steppers, a one-block-per-step code Stepper, 12 Stages and two MEPA Stages, 24 hosts in all. A Stage first ran its Start or the first option of each group. Then the script clicked forward 8 times and back once, pressed ArrowRight twice (once past the end), pressed ArrowLeft 8 times (past the start), and took a print-media shot. At every state it recorded the counter, the announcement, `disabled` and `aria-disabled` on both buttons, `data-stepped`, a hash of the host's `outerHTML` and an element screenshot. Each page also got a full-page screenshot in print media. The two records are identical: 518 states, and 522 PNGs byte for byte (518 host shots, 4 full-page print shots). The record shows each Stepper went through every step and stopped at both ends, refusing past them, and the two Stages built to refuse their run refused both buttons.

**Shared parts reached.** `StepControls.astro`'s row, now behind `step-row.ts`, reaches every Stepper form and the Stage, all checked above. Its markup and `page.css`'s `step-` row are unchanged. `step-row.ts` is part of that shared part. `CODING_STANDARDS.md` › Design system lists only `StepControls.astro`, and that file belongs to another worker in this run, so the list wasn't changed. Adding `step-row.ts` to it is for the orchestrator to decide.

**Left undone.** Nothing on the checklist. No doc comment, `COMPONENTS.md` or `artifact` skill text changed.
