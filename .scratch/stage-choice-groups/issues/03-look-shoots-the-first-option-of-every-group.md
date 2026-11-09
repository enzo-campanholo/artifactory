# 03: `pnpm look` shoots a choice-group Stage's first options

Status: ready-for-agent
Blocked by: 02

Spec: [Stage choice groups](../spec.md) › Runs and Look. Decisions: [Stage controls and drawing](../../artifact-generation-gaps/issues/03-stage-controls-and-drawing.md) › Answer.

**What to build:** an agent who writes a Stage with choice groups sees its run in `pnpm look`, as for one group today. Look shoots the Stage as written, chooses the first option of every group, in the order written, and shoots every step of that run. Under the Stage it prints what it ran, `first options inicio = A, busca = largura, 5 steps`, or the refusal it got. A one-group Stage keeps `first option A, 5 steps`, and a typed Stage keeps `first example …`. Look still asserts each choice it made is selected, that the run started or was refused, and that every step advances; a stuck control fails the case.

`pnpm look` is part of the artifact workflow, so the `artifact` skill changes in the same commit. [What `pnpm look` captures](../../look-captures/spec.md) also reworks look's selection; that's file overlap, not a prerequisite.

## Acceptance criteria

- [ ] With a two-group Stage, look chooses the first option of each group before waiting for the run, and captures the as-written shot and one shot per step, named as one-group Stage shots are.
- [ ] Look asserts each group's first option is selected after it chooses them.
- [ ] Look prints `first options <name> = <option>, …, N steps` in the groups' order, and `…, refused: <line>` on a refusal; one-group and typed Stages print as today.
- [ ] The browser acceptance in `tests/check` (seam 1, run with `ARTIFACTORY_BROWSER_ACCEPTANCE=1`) gains a fixture artifact with a two-group Stage and asserts its captures and the line look prints; the existing Stage look cases pass unchanged.
- [ ] The `artifact` skill's Stage page › Look says look shoots the first option of every group, prints `first options …`, and that an agent puts the option worth looking at first in each group.
