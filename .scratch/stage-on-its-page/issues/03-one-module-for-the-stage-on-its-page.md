# 03: One module for the Stage on its page

Status: claimed
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

- [x] Reading, listing inputs, running, painting and naming a run live in one module, and the element and the check both call it.
- [x] `stage-element.ts` reads no array of written content by index, and paints through the module.
- [x] `scripts/check/steps/custom-build-runs.ts` reads no class or attribute of the Stage's markup itself.
- [x] A run's name is formatted by one function, which the check's `stage-run` lines and `pnpm look`'s printed line both use.
- [x] The `changes` model of what each mark acts on sits in the module beside the painting it describes. The CSS is unchanged.
- [x] Every `tests/stepping` and `tests/check` case passes unchanged: the `stage-run` and `build-input` lines, and the look acceptance cases (`ARTIFACTORY_BROWSER_ACCEPTANCE=1`).
- [x] No doc comment, `COMPONENTS.md` or `artifact` skill text changes.
- [x] Every Stage on the catalog's Stage page and on the public sample, `/rsa-from-scratch/`, steps from its first option or example to its last step as before, in both themes. The closing comment records how that was compared.
- [x] It reaches no shared part `CODING_STANDARDS.md` lists; the closing comment says so, or names the ones it reached.

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

Implementer session, branch `impl/stage-on-its-page-03`, from the integration branch at `6db421a`. Commits: `a1faa07` (claim), `6bdd0d6` (the module), `030a42d` (its field list kept private), and this record.

**Result.** `design-system/src/stage-on-page.ts`, exported as `./stage-on-page`, is the one module for a Stage on its page. `step-applier.ts` is folded into it (git records the rename), so the `changes` model sits beside the painting it describes. Its interface:

- `new StageOnPage(stage, recolour?)` reads the page's markup: the control and `takes`, the content as written (`written`), the build's file (`build`) and the language (`lang`).
- `inputs` lists what the page offers: every option, every combination of one option per group, or every example. `name(input)` names a run in the fields' or groups' order through `runName`.
- `run(build, input)` runs the build and checks each step. The check's worker still calls `runBuild` with the plain data it is sent.
- For the element: `open()`, `chosen()`, `typed()` (the input, or the first field whose rule it breaks), `show(shown, step, count, announcement)` and `refuse(why, field?)`, plus `options`, `drawing` and `partsNamed(name)` for the part-linking. `show` and `refuse` paint through the module's `#paint`, `#colour` and `#rewrite`. A colour change reaches the part through the `recolour` callback, so the element keeps the fade.
- `runName(input)` is the one formatter of a run's name: `B`, or `a = 48, b = 18` in the order given.

`stage-element.ts` keeps its events, the focus, the part-linking, the colour fade, its wording and the step row. It names no Stage class and reads no written content by index. `custom-build-runs.ts` makes a `StageOnPage` for each `artifact-stage` element and takes its build, `takes`, inputs, written content, language and run names from it. It no longer reads a class or attribute itself, though it still finds Stages by their tag, with a quick `<artifact-stage` text test before parsing a page. `scripts/look.ts` prints its `first example …` and `first option(s) …` lines through `runName`. Nothing else in look changed.

**Outside the files this run assigned.** Folding `step-applier.ts` into the module changed one import line in each of `Stage.astro`, `scripts/check/build-runner.ts` and `scripts/check/build-input.ts`. The `package.json` export `./step-applier` became `./stage-on-page`.

**Validation.**

- `tests/stepping`: 21 passed, the tests unchanged. As a check that they reach the module, its part marks were dropped and a refused field was set to `aria-invalid="false"` in `stage-on-page.ts`. 4 tests failed, and the file was restored byte for byte.
- `ARTIFACTORY_BROWSER_ACCEPTANCE=1 pnpm exec vitest run tests/check/browser-verification.test.ts`: 33 passed. These include the printed lines `first options start = A, search = breadth, 2 steps` and `first example a = 4, b = 2, 2 steps`, a refusal recorded and a stuck forward failing.
- The `stage-run` and `build-input` lines: every `tests/check` case passes in the full `pnpm check` on the final HEAD.
- Catalog and sample, in Chromium (Puppeteer through `scripts/browser-session.ts`'s `startBrowser`), with reduced motion at 1280 × 900. I built the integration tip `6db421a` in a detached scratch worktree and this branch, each with `astro build`, and ran one script against each build. The script went through every `artifact-stage` on `/catalog/stage/`, `/catalog/stage/?lang=pt-BR`, `/catalog/mepa/` and `/rsa-from-scratch/` (`/catalog/` has none), in light and dark (`prefers-color-scheme`): 28 Stages per theme. On each Stage it recorded the state as written, ran Start or the first option of every group, went forward to the last step, then back one. At every state it recorded the counter, the said line, the announcement, `disabled` and `aria-disabled` on both buttons, `data-stepped`, a hash of the host's `outerHTML` and a hash of the host's screenshot. The two records are byte-identical: 668 states, 500 forward steps among them. The two Stages built to refuse their run (the Stage page's 5th and 7th) refused alike.
- `impeccable detect` on `stage-on-page.ts`, `stage-element.ts` and `Stage.astro` found nothing. No CSS or markup changed.

**Shared parts.** It reaches none that `CODING_STANDARDS.md` lists. `StepControls.astro` and `step-row.ts` are unchanged. The element hands the step row its count and is shown the step it is told, as before. The change stays inside the Stage, its check and look's printed line.

**Left undone.** Nothing on the checklist. No doc comment, `COMPONENTS.md` or `artifact` skill text changed.
