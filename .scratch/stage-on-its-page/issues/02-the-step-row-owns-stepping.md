# 02: The step row owns stepping

Status: ready-for-agent
Blocked by: 01

Spec: [The Stage on its page](../spec.md). A prefactor: no behaviour changes.

**What to build:** today `StepControls.astro` emits two buttons and the class names `${kind}-back` and `${kind}-forward`, and each host writes the stepping behind them: a click moving one step, the left and right arrow keys, the clamp at the first and last step, `aria-disabled` at the ends, and dropping `disabled` once the element connects. `stage-element.ts` has one copy and `Stepper.astro`'s inline element the other.

Make the step row carry that behaviour and one contract: a host tells it how many steps there are, and shows the step it is told. Move the Stepper's element out of `Stepper.astro`'s inline script into a module on the way; `stepper.ts` is already taken by the Stepper's build-time code. Then `scripts/look.ts` keeps one way of stepping, not `stepperStepping` and `stageStepping`.

This is design-system work: do it in a local session with impeccable (`design-system/CLAUDE.md`).

- [ ] The click, the arrow keys, the clamp, `aria-disabled` at the ends and enabling on connect are written once, with the step row.
- [ ] The Stage's and the Stepper's elements hold none of it. Each says its count and shows the step it is told.
- [ ] The Stepper's element is a module the design system can import, and `Stepper.astro` holds no inline element.
- [ ] `scripts/look.ts` steps a Stepper and a Stage the same way.
- [ ] Every `tests/stepping` case from [01](01-a-fifth-seam-for-the-stage-and-the-stepper-on-a-page.md) passes unchanged, and so does every `tests/check` case, the look acceptance cases included (`ARTIFACTORY_BROWSER_ACCEPTANCE=1`).
- [ ] No doc comment, `COMPONENTS.md` or `artifact` skill text changes.
- [ ] Shared part: `StepControls.astro` reaches every Stepper form and the Stage. On their catalog pages, a code Stepper, a one-block Stepper, a D2 Stepper, a figure Stepper and a Stage each step with the buttons and the arrow keys, stop at both ends, and print as before. The closing comment records it.

## Comments

### 2026-11-10: what `tests/stepping` reaches

From [01](01-a-fifth-seam-for-the-stage-and-the-stepper-on-a-page.md)'s implementation. The tests find no class, but they do rely on these, so keep them or change the tests' helpers (`tests/stepping/built-page.ts`) in the same commit:

- **Hosts:** `artifact-stage`, found by an option group's or the input's legend, and `artifact-stepper`, found in page order.
- **The step row's buttons:** found by their names, "Passo anterior" and "Próximo passo" in pt-BR, "Previous step" and "Next step" in English. The other language's words are skipped by `data-lang`.
- **Text:** the said line is the one element that showed the prompt before any run. The counter is the innermost element whose text starts "N de M" or "N of M", and is hidden by `hidden`. The announcement is the host's only `aria-live` element.
- **Inputs:** options and fields, found by their `<label>`.
- **Attributes:** drawn parts by `data-part`, with `data-mark` and `data-colour`; code lines by their text, with `data-mark` in a Stage and `data-off` in a one-block Stepper; a figure Stepper's parts by `data-step`, with `data-off`.
- **Loading:** the helper imports every `script[type="module"][src]` and maps `data-module` to `dist/`. A Stepper element moved into a module that `Stepper.astro`'s script imports loads the same way. A Stage that finds its build by any other means than `data-module` needs the helper changed.
