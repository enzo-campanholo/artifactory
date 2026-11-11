# 01: A fifth seam for the Stage and the Stepper on a page

Status: claimed
Blocked by: None (can start immediately)

Spec: [The Stage on its page](../spec.md). Tests of today's behaviour: no design-system or platform code changes beyond naming the seam.

**What to build:** the seam `tests/stepping`, and its first tests, so that [02](02-the-step-row-owns-stepping.md) and [03](03-one-module-for-the-stage-on-its-page.md) refactor under them. A test file builds one small fixture repo with the helper in `tests/check/fixture-repo.ts`, mounts a built page under happy-dom, loads the page's shipped scripts and drives it. The spec's [What the spike found](../spec.md#what-the-spike-found) has the lines that worked and what is fragile about them.

Find each control as the owner would, by its role and its accessible name ("Next step", "Próximo passo", an option's label), never by an inner class. The tests must pass unchanged through 02 and 03, which rename and move those classes. Assert what the page shows: text, marks on drawn parts, the announcement, `aria-disabled`, `aria-invalid`.

Start a fixture repo's check through `FixtureRepo.check`, and keep Vitest on the two workers `vitest.config.ts` sets (`CODING_STANDARDS.md` › Tests). One built page serves one test file: an element is defined once per file.

- [ ] `scripts/check/seams.ts` lists `tests/stepping`, and a test file there runs under `pnpm check`.
- [ ] `CODING_STANDARDS.md` › Tests names five seams, with this one's line, and `docs/agents/test-seams.md` gains its section.
- [ ] **A Stage with one choice:** before a choice, the prompt shows and no step is counted. Choosing an option shows step 1 of N with its said line. Each later step shows its marks on the drawn parts, its rewritten cells and its said line. A drawn part named like an option chooses it.
- [ ] **A Stage with two choice groups:** the run starts only once every group has a choice, and a change to either runs again from step 1.
- [ ] **A refused run:** the page says the refusal and counts no step.
- [ ] **A Stage with typed input:** it runs its first example, and typed input that breaks a field's rule is refused at its field. If happy-dom can't run this, the closing comment says what failed, and it goes under "Not tested automatically".
- [ ] **A Stage whose step colours parts:** each part carries its swatch at each step. The same proviso applies.
- [ ] **The step row, on a Stage, a code Stepper and a figure Stepper:** the forward and back buttons, the left and right arrow keys, both ends refusing to go further and saying so with `aria-disabled`, and the buttons usable once the element is connected.
- [ ] **A code Stepper** announces its step, and a one-block Stepper its lit lines.
- [ ] `docs/agents/test-seams.md` › "Not tested automatically" gains a D2 Stepper's stepping, with the reason, and whatever else this ticket found happy-dom can't run.
- [ ] Every expected value is a literal from the fixture, never recomputed from the build.
- [ ] The closing comment records what the seam adds to a full `pnpm check`, in seconds.

## Comments
