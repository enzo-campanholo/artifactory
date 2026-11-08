# Artifact generation gaps

Type: map

## Destination

A spec in `.scratch/<feature-slug>/spec.md` for each group of gaps below, ready for `/to-tickets`. Nothing is built inside this map. For a gap whose behaviour turns out to be deliberate, "keep it and document the workaround in `design-system/COMPONENTS.md` or the `artifact` skill" counts as a resolution, just as a design change does.

## Notes

- **Origin:** between 2026-10-29 and 2026-11-05, the agents that wrote study artifacts in the owner's private copy reported gaps in their final reports: places where the design system, `pnpm look` or the workflow made them drop, approximate or work around something the brief asked for. The owner judged every gap worth fixing. Each ticket restates the gaps it covers and what the agents did instead.
- **Public repo:** name only public artifacts here. The private artifacts the gaps came from are described by subject only ("a graph-colouring artifact").
- **Skills:** every grilling ticket calls the Skill tool for `grilling` and `domain-modeling`. Before deciding anything about the design system, read `CODING_STANDARDS.md`, `design-system/CLAUDE.md`, `design-system/DESIGN.md` and `design-system/COMPONENTS.md`. Name concepts as `GLOSSARY.md` does.
- **ADRs in play:** [0001](../../docs/adr/0001-artifact-state-stores-answers-only.md) (artifact state stores answers only) and [0007](../../docs/adr/0007-artifacts-contain-content-data-and-staged-behaviour.md) (custom builds inside a Stage, and the proposal to promote a build at the second need). Say so explicitly when a decision contradicts one.

## Decisions so far

<!-- one line per resolved ticket: [title](issues/NN-slug.md): gist -->

## Not yet specified

- **What `pnpm look` should capture.** This depends on the findings of [Find out what `pnpm look` misses](issues/07-find-out-what-pnpm-look-misses.md). Whether look should step through every Stepper step, open hidden model answers, or report what it couldn't capture becomes sharp once we know why it misses them.
- **How Stage decisions combine.** [Stage controls and drawing](issues/03-stage-controls-and-drawing.md) may split into several specs (controls, structure per run, marks), and [Machine-trace component](issues/04-machine-trace-component.md) may reshape what the Stage needs. The spec boundaries become clear once both are decided.

## Out of scope

- **The private copy's GitHub token can't read Actions, checks, statuses or variables (HTTP 403 since about 2026-11-01).** This is a setting in the owner's account, not a platform decision. The owner fixes it directly.
- **Leftover agent worktrees and briefs in the private copy.** Housekeeping, already done on 2026-11-08.
