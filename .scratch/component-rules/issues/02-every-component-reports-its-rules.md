# 02: Every component reports its rules

Status: ready-for-agent
Blocked by: 01

Spec: [Component rules](../spec.md).

**What to build:** every other component's rules take the path [01](01-a-stepper-s-rules-are-reported-at-its-tag.md) built for the Stepper: `SingleChoice`, `NumericQuestion`, `Matching`, `OpenQuestion`, `Figure`, `Stage`, and the two SVG rules `InlineSvg.astro` holds for a `Figure` and a figure `Stepper`. A numeric question's key that can't work is one of these rules, so it stops failing as `build`.

Then the scraping goes: `componentNamesIn`, `failedPage`, `componentInArtifact`, `componentsNamedIn`, `onlyTagOffset` and the `component` target. `failureFromAstroError` stays for Astro's own errors.

The `InlineSvg` rules keep their wording, `Figure or Stepper: …`, and are placed at the `Figure` or `Stepper` that holds the drawing.

This is design-system work: do it in a local session with impeccable (`design-system/CLAUDE.md`).

- [ ] No component throws `componentError` in a build. Each broken one renders its marker, and each is reported as `component-rule` at its own tag.
- [ ] A Stage, a `Matching` and a `Figure` still name every rule they break in one line.
- [ ] A broken question renders no question, so the question manifest never lists it; the build has failed, so no manifest is written at all.
- [ ] Two Stages in one entry are each reported at their own tag.
- [ ] The scraping named above is deleted, and an MDX syntax error still fails as `build` at its line.
- [ ] `tests/check`: one fixture repo breaks every component rule, each asserted once at its position. The single-rule fixture repos in `artifact-failures.test.ts` and `reporting.test.ts` go, and the Stage's type-error cases stay.
- [ ] The `artifact` skill follows in the same commit: `rules.md` › **Components** and **Build failures**, and each mention in `stage.md`, `figures.md` and `statements.md` that a component rule fails as `build`.
- [ ] `docs/agents/test-seams.md` › `tests/check` no longer says a component's error is placed "when the entry has only one of that name".
- [ ] Shared part: `InlineSvg.astro` reaches `Figure` and the figure `Stepper`. A valid one of each renders on its catalog page as before, and the ticket's closing comment says so.
- [ ] A valid component of every kind renders on its catalog page as before.

## Comments
