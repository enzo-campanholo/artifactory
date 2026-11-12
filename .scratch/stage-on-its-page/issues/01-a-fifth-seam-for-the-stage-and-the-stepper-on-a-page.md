# 01: A fifth seam for the Stage and the Stepper on a page

Status: resolved
Blocked by: None (can start immediately)

Spec: [The Stage on its page](../spec.md). Tests of today's behaviour: no design-system or platform code changes beyond naming the seam.

**What to build:** the seam `tests/stepping`, and its first tests, so that [02](02-the-step-row-owns-stepping.md) and [03](03-one-module-for-the-stage-on-its-page.md) refactor under them. A test file builds one small fixture repo with the helper in `tests/check/fixture-repo.ts`, mounts a built page under happy-dom, loads the page's shipped scripts and drives it. The spec's [What the spike found](../spec.md#what-the-spike-found) has the lines that worked and what is fragile about them.

Find each control as the owner would, by its role and its accessible name ("Next step", "Próximo passo", an option's label), never by an inner class. The tests must pass unchanged through 02 and 03, which rename and move those classes. Assert what the page shows: text, marks on drawn parts, the announcement, `aria-disabled`, `aria-invalid`.

Start a fixture repo's check through `FixtureRepo.check`, and keep Vitest on the two workers `vitest.config.ts` sets (`CODING_STANDARDS.md` › Tests). One built page serves one test file: an element is defined once per file.

- [x] `scripts/check/seams.ts` lists `tests/stepping`, and a test file there runs under `pnpm check`.
- [x] `CODING_STANDARDS.md` › Tests names five seams, with this one's line, and `docs/agents/test-seams.md` gains its section.
- [x] **A Stage with one choice:** before a choice, the prompt shows and no step is counted. Choosing an option shows step 1 of N with its said line. Each later step shows its marks on the drawn parts, its rewritten cells and its said line. A drawn part named like an option chooses it.
- [x] **A Stage with two choice groups:** the run starts only once every group has a choice, and a change to either runs again from step 1.
- [x] **A refused run:** the page says the refusal and counts no step.
- [x] **A Stage with typed input:** it runs its first example, and typed input that breaks a field's rule is refused at its field. If happy-dom can't run this, the closing comment says what failed, and it goes under "Not tested automatically".
- [x] **A Stage whose step colours parts:** each part carries its swatch at each step. The same proviso applies.
- [x] **The step row, on a Stage, a code Stepper and a figure Stepper:** the forward and back buttons, the left and right arrow keys, both ends refusing to go further and saying so with `aria-disabled`, and the buttons usable once the element is connected.
- [x] **A code Stepper** announces its step, and a one-block Stepper its lit lines.
- [x] `docs/agents/test-seams.md` › "Not tested automatically" gains a D2 Stepper's stepping, with the reason, and whatever else this ticket found happy-dom can't run.
- [x] Every expected value is a literal from the fixture, never recomputed from the build.
- [x] The closing comment records what the seam adds to a full `pnpm check`, in seconds.

## Comments

### 2026-11-10: implementation

Implementer session, branch `impl/stage-on-its-page-01`, from the integration branch at d120625. Commits: f52fa57 (claim), b77c946 (the seam, its tests and docs), 7fdda98 (the misplaced-test line in `tests/check/reporting.test.ts`, which lists the seam folders).

**Result.** `scripts/check/seams.ts` lists `tests/stepping`. `CODING_STANDARDS.md` › Tests names five seams, with this one's line and the owner's agreement linked, and `docs/agents/test-seams.md` gains its section and the "Not tested automatically" items below. Two test files, 21 tests, each building its own fixture repo:

- `tests/stepping/stage.test.ts` (pt-BR page, `stage-fixture.ts`): a one-choice Stage with a drawing and a table (prompt and no count before a choice; marks on drawn parts, rewritten cells, the said line and the announcement at each step; cells given back on going back; a drawn part choosing its option), the step row on that Stage, a two-group Stage, a typed Stage with a number field, a text field and a code block (the first example run, the line each step runs marked and announced, a number and a text refused at their own field with `aria-invalid` and the focus, and a run of more than 200 steps refused with no step counted), and a colouring Stage (each part's `data-colour` and its label's colour name at each step, going back and choosing by the drawing included).
- `tests/stepping/stepper.test.ts` (en page, `stepper-fixture.ts`): the step row on a code-blocks Stepper, a one-block Stepper and a figure Stepper; the code Stepper's announcement with a block's marked line and its caption; the one-block Stepper's lit lines and their announcement; the figure Stepper's parts at each step.

`tests/stepping/built-page.ts` builds the fixture with `FixtureRepo.check(["--artifacts-only"])`, parses the built page into a happy-dom window before any script loads, maps `data-module` and every `script[type="module"][src]` to `dist/`, and imports them all, the store's and the theme's included. Controls are found by role and accessible name: buttons by their name ("Próximo passo", "Next step", "Começar"), options and fields by their label, the said line as the element that showed the prompt, the counter as the element reading "N de M" or "N of M", and the announcement as the host's one `aria-live` region. The drawing is reached by its `data-part` and `data-step` attributes, and marks, colours and lit lines by `data-mark`, `data-colour` and `data-off`. No test names a class. Every expected value is a literal from the fixture.

**What happy-dom could and couldn't run.** Typed input and colourings both run. Part-linking runs too: `getBBox` gives an empty box, so a part's hit area has a made-up size, but the click chooses. Three things are left to `pnpm look` and the catalog, recorded under "Not tested automatically":

- **A D2 Stepper's stepping.**
- **The page's styles.** happy-dom applies none of the page's stylesheets, which sit in cascade layers. Its `:lang(pt)` doesn't match `pt-BR`, and it doesn't read nested rules. So a rewritten cell is asserted to contain the step's text, since the content as written stays beside it for print, and the other language's words are left out of accessible names by their `data-lang`.
- **The colour cross-fade.** happy-dom rejects each animation the fade cancels and nothing handles the rejection, so Vitest reported 3 unhandled errors. The window opens with reduced motion, so the page doesn't fade.

**Validation.** `scripts/heavy pnpm exec vitest run tests/stepping`: 21 passed. To show the tests can fail, `stage-element.ts` and `Stepper.astro` were broken in place and then restored. The breaks were: the forward button never saying `aria-disabled` at the end, one part's mark dropped, `aria-invalid="false"` on a refused field, the Stepper's clamp at the last step removed, and its caption left out of the announcement. 10 tests failed, and the source was restored unchanged (`git status` clean outside `tests/stepping`).

**Cost.** Each file spends 10 to 12 s, almost all of it in its fixture's `check --artifacts-only`. With Vitest's two workers the pair takes about 12 s of wall time. In a full `pnpm check` the Vitest step took 403 s, against 396 s for the same suite without the seam at d120625 in another worktree. That 7 s difference is inside the run-to-run spread seen on this machine (284 to 396 s), so the seam adds about 12 s, and at most about 23 s of worker time.

**Shared parts.** No platform or design-system code changed. The tests reach `StepControls.astro` on the Stage and on code, one-block and figure Steppers.

**Left undone.** Nothing on the checklist. `tests/check/reporting.test.ts` lists the seam folders in an expected failure line, so adding the seam changes that literal. That file is outside this ticket's files: the orchestrator should know it in case component rules 01 also edits it.

### 2026-11-12: resolved

Orchestrator, implement-spec session (integration branch `architecture-review-implementation`). This ticket's work landed on the integration branch, and a full `pnpm check` passed (`current`) on each landed HEAD. The last was `7c62489`, after the review fixes. A two-axis code review (Standards and Spec) of the whole branch ran on 2026-11-11. Its findings, and the owner's four decisions on them (recorded on the specs), were fixed in `impl/review-fixes` (`bcd4fab`…`7c62489`). It reaches `main` through the integration branch's PR.
