# 04: Document the Stage's three kept limits

Status: resolved
Blocked by: None (can start immediately)

Spec: [Stage choice groups](../spec.md) › Documented limits, Documentation. Decisions: [Stage controls and drawing](../../artifact-generation-gaps/issues/03-stage-controls-and-drawing.md) › Answer. Each limit was kept on purpose, so this ticket documents it, never lifts it.

**What to build:** the next agent who hits one of these limits finds the workaround in `COMPONENTS.md`'s Stage entry, without asking or rediscovering it:

- **New structure per run: not yet.** A short "not yet" paragraph: a build can't draw a structure a run produces, such as a search tree. The workaround: the tree is a subgraph of the graph, so the build marks the tree's edges `strong`, keeps a `π` column, and lets a growing `body` table list each vertex's level or children. A second artifact that needs a drawn tree reopens the question under ADR 0007's second-need rule.
- **Four marks, no grey fill.** Beside **Marks**: a static figure showing a state the Stage also shows draws it with the Stage's mark, so the two agree; a discovered (frontier) vertex is dashed in both, since it is provisional, and grey stays for unavailable or background.
- **`say` is one text for the eye and the ear.** **Say it for the ear** gains an assignment example: "M[4] recebe 7", not "M[4] ← 7".

Only the `Stage` doc comments change, so nothing renders differently and no shared part is reached; `pnpm components` regenerates `COMPONENTS.md`, or `pnpm check` fails as `component-reference`. Neither `pnpm check`'s output nor the workflow changes, so the `artifact` skill doesn't.

## Acceptance criteria

- [x] The `Stage` doc comment has the "not yet" paragraph with the search-tree workaround and the ADR 0007 second-need rule, as above.
- [x] The **Marks** part says a static figure draws a state the Stage also shows with the Stage's mark, with the dashed discovered vertex as its example.
- [x] **Say it for the ear** has the "M[4] recebe 7", not "M[4] ← 7", example.
- [x] `COMPONENTS.md` is regenerated with `pnpm components` and `pnpm check` passes.
- [x] No mark, prop or behaviour is added; the wording names only public artifacts, or none.

## Comments

### 2026-11-09: resolved

Implementer, impeccable-gaps-implementation pass (owner authorization: [spec](../spec.md) › Comments › 2026-11-09).

- **Result:** the `Stage` doc comment, and so `COMPONENTS.md`, documents the three kept limits as the Stage stands after choice groups 01–03 and Stage text input 01–04. A **New structure per run: not yet.** paragraph follows **Machine traces** (the other limit a build meets): a build can't draw a structure a run produces, such as a search's tree; mark the tree's edges `strong`, keep a `π` column, let a growing `body` table list each vertex's level or children; a second artifact needing a drawn tree reopens it under ADR 0007's second-need rule, proposed as a change to the Stage. A paragraph after **Marks** says the four marks are all, with no grey fill, and a static figure draws a state the Stage also shows with the Stage's mark: a discovered (frontier) vertex is dashed in both, grey (`fill-tint`, `fill-muted`) staying for unavailable or background. **Say it for the ear** says the screen's line is the same text and gives "M[4] recebe 7", not "M[4] ← 7".
- **Commits:** 51a0b58 (claim), d07bc2c (doc comment and regenerated `COMPONENTS.md`), this closing commit.
- **Validation:** `pnpm components` regenerated `COMPONENTS.md`; full `scripts/heavy pnpm check` on the merged HEAD (recorded in the merge's report). No test added: nothing behaves differently, so no seam owns it, and a test of doc text would be a smoke test.
- **Decisions:** the static-figure rule names grey by its classes (`fill-tint`, `fill-muted`) rather than citing `DESIGN.md`, since artifact agents read only `COMPONENTS.md` (ADR 0007). The "not yet" paragraph sits after **Machine traces** rather than after **A table that grows**, beside the other documented limit. The `artifact` skill doesn't change: neither `pnpm check`'s output nor the workflow does.
- **Shared parts:** none reached; only a doc comment changed, so nothing renders differently.
- **Left undone:** nothing.
