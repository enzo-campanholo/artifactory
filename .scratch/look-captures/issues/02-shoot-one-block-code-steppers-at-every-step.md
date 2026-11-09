# 02: Shoot one-block code Steppers at every step

Status: ready-for-agent
Blocked by: 01 (Shoot every look item through one path)

Spec: [What `pnpm look` captures](../spec.md) › What look shoots

**What to build:** an agent running `pnpm look` on an artifact with a code Stepper sees every step of it rendered. Look selects items by element: every `artifact-stepper`, `artifact-stage`, `figure.diagram` and `figure.figure` in `main`, and never by what a Stepper contains. A Stepper form can then never drop out of the shots without a word. Each item is selected once. A Stage counts once, even though its frame is also a `figure.figure`.

A one-block code Stepper (`lines`) is shot at every step at 393 px and 1920 px, in the light theme, on screen. Look clicks forward between steps and names the files `NN-stepper-step-K-<width>.png`, as it does for figure Steppers. A code Stepper has no `alt`, so look prints its caption in its place, as it already does for a Stage without a drawing. A Stepper's only caption is its per-step `captions`, so the line names those. A code Stepper without captions prints "no caption" in their place. When an artifact has nothing to shoot, look's last line says it "has nothing for look to shoot", not "has no diagrams or figures".

The sample shows the change: `pnpm look rsa-from-scratch` now shoots the `pow_mod` Stepper at every step, and printed nothing about it before.

- [ ] Selection is by element, as above, and each item is selected exactly once (a Stage isn't shot twice).
- [ ] A one-block code Stepper is shot at every step at both widths, with `NN-stepper-step-K-<width>.png` names and its captions printed in place of an `alt`, or "no caption" when it has none.
- [ ] Figure Steppers, D2 Steppers, Diagrams, Figures and Stages are shot as before.
- [ ] An artifact with nothing to shoot ends with "has nothing for look to shoot".
- [ ] Seam 1 test, a new opt-in Look fixture beside the Stage ones: a one-block code Stepper is shot at every step at both widths, with its caption printed. The test asserts the exit code (0), the printed lines, and `results.json`'s captures and outcome (`captured-awaiting-visual-review`).
- [ ] In the same commit, the `artifact` skill's **Look** section says what's shot (every `Diagram`, `Figure`, `Stepper` (figure, D2 or code, at every step) and `Stage`, and a code Stepper's captions printed in place of an `alt`, to compare its shots with). It also says what isn't shot and what checks it instead: plain code blocks, tables and questions are checked through the source and `pnpm check`, and dark mode and print on the design system's catalog.
