# 02: Shoot one-block code Steppers at every step

Status: claimed
Blocked by: 01 (Shoot every look item through one path)

Spec: [What `pnpm look` captures](../spec.md) › What look shoots

**What to build:** an agent running `pnpm look` on an artifact with a code Stepper sees every step of it rendered. Look selects items by element: every `artifact-stepper`, `artifact-stage`, `figure.diagram` and `figure.figure` in `main`, and never by what a Stepper contains. A Stepper form can then never drop out of the shots without a word. Each item is selected once. A Stage counts once, even though its frame is also a `figure.figure`.

A one-block code Stepper (`lines`) is shot at every step at 393 px and 1920 px, in the light theme, on screen. Look clicks forward between steps and names the files `NN-stepper-step-K-<width>.png`, as it does for figure Steppers. A code Stepper has no `alt`, so look prints its caption in its place, as it already does for a Stage without a drawing. A Stepper's only caption is its per-step `captions`, so the line names those. A code Stepper without captions prints "no caption" in their place. When an artifact has nothing to shoot, look's last line says it "has nothing for look to shoot", not "has no diagrams or figures".

The sample shows the change: `pnpm look rsa-from-scratch` now shoots the `pow_mod` Stepper at every step, and printed nothing about it before.

- [x] Selection is by element, as above, and each item is selected exactly once (a Stage isn't shot twice).
- [x] A one-block code Stepper is shot at every step at both widths, with `NN-stepper-step-K-<width>.png` names and its captions printed in place of an `alt`, or "no caption" when it has none.
- [x] Figure Steppers, D2 Steppers, Diagrams, Figures and Stages are shot as before.
- [x] An artifact with nothing to shoot ends with "has nothing for look to shoot".
- [x] Seam 1 test, a new opt-in Look fixture beside the Stage ones: a one-block code Stepper is shot at every step at both widths, with its caption printed. The test asserts the exit code (0), the printed lines, and `results.json`'s captures and outcome (`captured-awaiting-visual-review`).
- [x] In the same commit, the `artifact` skill's **Look** section says what's shot (every `Diagram`, `Figure`, `Stepper` (figure, D2 or code, at every step) and `Stage`, and a code Stepper's captions printed in place of an `alt`, to compare its shots with). It also says what isn't shot and what checks it instead: plain code blocks, tables and questions are checked through the source and `pnpm check`, and dark mode and print on the design system's catalog.

## Comments

### 2026-11-08: implemented, awaiting review

Result: `scripts/look.ts` selects items by element with one selector, `main :is(artifact-stepper, artifact-stage, figure.diagram, figure.figure):not(artifact-stage > figure)`, which also goes into each case's `requested.target` in `results.json`. A Stage's frame is a `figure.figure`, so it's left out and the Stage counts once. `resolveItem` then shoots a Stage by that frame, as before, because the frame holds its caption and number. A new `Kind`, `stepper-lines` (stem `stepper`, `shootStepper`), covers a Stepper with `.stepper-code`. Its describer, `describeCaptions`, prints `no drawing; captions, one per step: "…", "…"`, or `no drawing and no caption` (the Stage's wording) when it has no captions. With nothing to shoot, look prints `<entry> has nothing for look to shoot`. As before, the results-and-contact-sheet line still follows it: I read "last line" as the summary line that replaces "has no diagrams or figures".

The `artifact` skill's **Look** section now says what's shot (figure, D2 and code Steppers at every step, in the light theme), that a code Stepper's captions are printed in place of an `alt` to compare its steps with, and what isn't shot and what checks it instead. One line outside **Look** changed too: Revise's "look (if a diagram, figure, `Stepper` or `Stage` changed)", so a revised code Stepper still triggers look.

Commits: 63bd9b4 (claim), a3c899f (look, Seam 1 test and skill, one commit), ae00494 (merge of `gaps-implementation` at 3ffc9aa).

Validation:

- Seam 1: new opt-in fixture `opt-in Look Stepper evidence` in `tests/check/browser-verification.test.ts`. It has one artifact with a captioned and an uncaptioned one-block code Stepper, and asserts exit 0, both printed blocks (caption line and file lines at 393 and 1920 px), and each case's `captures` and `captured-awaiting-visual-review` outcome. It failed before the change (neither Stepper printed) and passes after. `ARTIFACTORY_BROWSER_ACCEPTANCE=1 … vitest run tests/check/browser-verification.test.ts -t Look`: 4 passed (the new one and the 3 unchanged Look Stage fixtures).
- `rsa-from-scratch`, ticket 01's look against this one: both exit 0. The only printed change is the new `03-stepper` (`pow_mod`, 7 steps × 2 widths, its 7 captions printed); the items after it are renumbered 04–07. All 96 earlier PNGs are byte-identical under their new names, Stage frames included, and the 14 new ones show the right lines highlighted at each step (checked 393 step 4 and 1920 step 7 by eye). Both cases are `captured-awaiting-visual-review` with 0 failed assertions (953 → 1091 per case).
- A throwaway artifact with prose and a plain code block only (not committed) printed `artifacts/look-empty/index.mdx has nothing for look to shoot`.
- Full `pnpm check` at ae00494: 0 failures. Before it, as the delegator asked, I ran `chmod 644 README.md` in this worktree, which was `0600` under umask 077 (git sees no change), so `tests/check/reporting.test.ts` › "attaches full success …" passed.

Seams for the later tickets:

- 03 (model-answer reveal): the reveal still goes around `kinds[item.kind].shoot(…)` in the main loop. `item.element` is the element shot (a Stage's frame, not `artifact-stage`), so `item.element.closest("details")` finds the model answer for every kind.
- 04 (failure rule): `resolveItem` now has two silent fallbacks to replace with a failure. A Stepper with neither `.stepper-boards` nor `.stepper-code` resolves to `stepper-figure`, so an unknown form (07's block-per-step form, until 07 adds its `Kind`) would be shot as a figure Stepper and described "no drawing and no caption". A Stage without `:scope > figure` is shot as `artifact-stage` itself. The broad selector means every Stepper and Stage now reaches `resolveItem`.
- 05 (fixed layers): every element shot, code Stepper steps included, still goes through `shoot`.

Left undone: nothing in scope. Seams are recorded here, as the brief asked, not as comments on 03–05.
