# 03: One module for the Stage on its page

Status: ready-for-agent
Blocked by: 02

Spec: [The Stage on its page](../spec.md). A refactor: no behaviour changes.

**What to build:** one module, shared by the Stage's element and the check, that owns everything about a Stage as it stands on a page:

- reading the page's markup: the control, the choice groups, the fields, the content as written;
- listing the inputs the page offers: every option, every combination of one option per group, every example;
- running the build on one input and checking each step it gives;
- painting a shown step onto the nodes it read: the marks, the swatches, the rewritten cells and text;
- naming a run, `B` or `a = 48, b = 18`.

Today these are split between `step-applier.ts`, which reads and checks, and `stage-element.ts`, whose `#paint`, `#colour` and `#rewrite` reach back into the other file's arrays by index. `scripts/check/steps/custom-build-runs.ts` reads `.stage-input[data-examples]` and `.stage-option input` for itself, and it and `scripts/look.ts` each format a run's name.

The module's interface is this ticket's to design. Keep it small: a caller shouldn't need to know a class name, an attribute name or the order of two arrays. What stays in the element is what only a browser can do and what is the element's own: its events, focus, the part-linking and the colour fade.

This is design-system work: do it in a local session with impeccable (`design-system/CLAUDE.md`).

- [ ] Reading, listing inputs, running, painting and naming a run live in one module, and the element and the check both call it.
- [ ] `stage-element.ts` reads no array of written content by index, and paints through the module.
- [ ] `scripts/check/steps/custom-build-runs.ts` reads no class or attribute of the Stage's markup itself.
- [ ] A run's name is formatted by one function, which the check's `stage-run` lines and `pnpm look`'s printed line both use.
- [ ] The `changes` model of what each mark acts on sits in the module beside the painting it describes. The CSS is unchanged.
- [ ] Every `tests/stepping` and `tests/check` case passes unchanged: the `stage-run` and `build-input` lines, and the look acceptance cases (`ARTIFACTORY_BROWSER_ACCEPTANCE=1`).
- [ ] No doc comment, `COMPONENTS.md` or `artifact` skill text changes.
- [ ] Every Stage on the catalog's Stage page and on the public sample, `/rsa-from-scratch/`, steps from its first option or example to its last step as before, in both themes. The closing comment records how that was compared.
- [ ] It reaches no shared part `CODING_STANDARDS.md` lists; the closing comment says so, or names the ones it reached.

## Comments

### 2026-11-10: what `tests/stepping` reaches

From [01](01-a-fifth-seam-for-the-stage-and-the-stepper-on-a-page.md)'s implementation. The tests find no class, but they do rely on these, so keep them or change the tests' helpers (`tests/stepping/built-page.ts`) in the same commit:

- **Hosts:** `artifact-stage`, found by an option group's or the input's legend, and `artifact-stepper`, found in page order.
- **The step row's buttons:** found by their names, "Passo anterior" and "Próximo passo" in pt-BR, "Previous step" and "Next step" in English. The other language's words are skipped by `data-lang`.
- **Text:** the said line is the one element that showed the prompt before any run. The counter is the innermost element whose text starts "N de M" or "N of M", and is hidden by `hidden`. The announcement is the host's only `aria-live` element.
- **Inputs:** options and fields, found by their `<label>`.
- **Attributes:** drawn parts by `data-part`, with `data-mark` and `data-colour`; code lines by their text, with `data-mark` in a Stage and `data-off` in a one-block Stepper; a figure Stepper's parts by `data-step`, with `data-off`.
- **Loading:** the helper imports every `script[type="module"][src]` and maps `data-module` to `dist/`. A Stepper element moved into a module that `Stepper.astro`'s script imports loads the same way. A Stage that finds its build by any other means than `data-module` needs the helper changed.
