# 03: `pnpm look` shoots a choice-group Stage's first options

Status: resolved
Blocked by: 02

Spec: [Stage choice groups](../spec.md) › Runs and Look. Decisions: [Stage controls and drawing](../../artifact-generation-gaps/issues/03-stage-controls-and-drawing.md) › Answer.

**What to build:** an agent who writes a Stage with choice groups sees its run in `pnpm look`, as for one group today. Look shoots the Stage as written, chooses the first option of every group, in the order written, and shoots every step of that run. Under the Stage it prints what it ran, `first options inicio = A, busca = largura, 5 steps`, or the refusal it got. A one-group Stage keeps `first option A, 5 steps`, and a typed Stage keeps `first example …`. Look still asserts each choice it made is selected, that the run started or was refused, and that every step advances; a stuck control fails the case.

`pnpm look` is part of the artifact workflow, so the `artifact` skill changes in the same commit. [What `pnpm look` captures](../../look-captures/spec.md) also reworks look's selection; that's file overlap, not a prerequisite.

## Acceptance criteria

- [x] With a two-group Stage, look chooses the first option of each group before waiting for the run, and captures the as-written shot and one shot per step, named as one-group Stage shots are.
- [x] Look asserts each group's first option is selected after it chooses them.
- [x] Look prints `first options <name> = <option>, …, N steps` in the groups' order, and `…, refused: <line>` on a refusal; one-group and typed Stages print as today.
- [x] The browser acceptance in `tests/check` (seam 1, run with `ARTIFACTORY_BROWSER_ACCEPTANCE=1`) gains a fixture artifact with a two-group Stage and asserts its captures and the line look prints; the existing Stage look cases pass unchanged.
- [x] The `artifact` skill's Stage page › Look says look shoots the first option of every group, prints `first options …`, and that an agent puts the option worth looking at first in each group.

## Comments

### 2026-11-09: note from 01

Implementer of [01](01-name-the-stage-s-control-instead-of-inferring-it.md). `scripts/look.ts`'s `shootStage` still tells a typed Stage from a `choose` one by whether a `.stage-field input` exists. 01 left it alone because the ticket didn't list it. `<artifact-stage>` now carries `data-control` (`choose` or `input`), and `stageControl` in `step-applier.ts` gives `takes`, so look can branch on those when it adds several groups.

### 2026-11-09: note from 02

Implementer of [02](02-a-stage-takes-two-or-more-choice-groups.md). Each group is a `fieldset.stage-choice[data-group="<name>"]` in the groups' order, its radios named `stage-<build>-<name>`; a one-group Stage's fieldset has no `data-group`. `stageGroups(stage)` in `step-applier.ts` returns `[{ name, options }]` (the radio inputs) and is the one reader the page and the check use; `stageControl(stage).takes` is `named` for groups. Clicking an option only starts the run once every group has one, so look must check one per group before waiting: today `shootStage` clicks `.stage-option input` once and would wait out its timeout, then fail "Stage ran or explicitly refused". The check orders combinations groups-first, options in order, so look's first options are the check's first combination. The catalog's `/catalog/stage/` has a two-group Stage (`graph-search`) to try it on; the `artifact` skill's Stage page › Look still describes one option.

### 2026-11-09: resolved

Implementer of 03. Result: `pnpm look` branches on the Stage's `data-control`. A `choose` Stage gets its first option clicked in every `fieldset.stage-choice`, in the groups' order, before look waits for the run. Look then asserts each one is selected, and shoots the Stage as written and at every step, or its refusal, under the one-group file names. Under the Stage it prints `first options start = A, search = breadth, 2 steps` (or `…, refused: <line>`). One-group Stages still print `first option A, …` and typed Stages `first example …`. The `artifact` skill's Stage page › Look and `docs/agents/test-seams.md` say so.

Commits: `ae1777a` (look, Look acceptance, skill, test seams).

Validation:

- Seam 1 browser acceptance (`ARTIFACTORY_BROWSER_ACCEPTANCE=1 … -t "Look Stage evidence"`): 6 passed. That's the three existing Stage cases unchanged plus three new fixtures: a two-group Stage that runs, a two-group Stage whose build throws (refused, its line ending "Choose other options."), and a typed Stage. The two-group cases failed first against the previous `look.ts`, on "Stage ran or explicitly refused".
- `pnpm look rsa-from-scratch` still prints `first example e = 7, phi = 60, 22 steps` and `first example p = 5, q = 11, e = 3, m = 9, 10 steps`.
- Full `pnpm check` gate on the merged HEAD.

Decisions:

- Look reads `data-control` from the enclosing `artifact-stage`, since its item element is the Stage's `figure`. It doesn't test for a `.stage-field` any more. The typed form also holds a `fieldset.stage-choice`, so look tells the two forms apart by the control, never by the fieldsets.
- Every group's selected check is its own assertion, `<item>: first option of <group> selected`. A one-group Stage keeps `<item>: requested option selected`.
- A typed-Stage case joins the Look acceptance. No test covered that path, and an intermediate version of this change broke it (the `figure` has no `data-control`) without any test failing.

Shared parts: none. The change stays in `scripts/look.ts` and touches no design-system code. Nothing left undone.
