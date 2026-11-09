# 04: Document the Stage's three kept limits

Status: claimed
Blocked by: None (can start immediately)

Spec: [Stage choice groups](../spec.md) › Documented limits, Documentation. Decisions: [Stage controls and drawing](../../artifact-generation-gaps/issues/03-stage-controls-and-drawing.md) › Answer. Each limit was kept on purpose, so this ticket documents it, never lifts it.

**What to build:** the next agent who hits one of these limits finds the workaround in `COMPONENTS.md`'s Stage entry, without asking or rediscovering it:

- **New structure per run: not yet.** A short "not yet" paragraph: a build can't draw a structure a run produces, such as a search tree. The workaround: the tree is a subgraph of the graph, so the build marks the tree's edges `strong`, keeps a `π` column, and lets a growing `body` table list each vertex's level or children. A second artifact that needs a drawn tree reopens the question under ADR 0007's second-need rule.
- **Four marks, no grey fill.** Beside **Marks**: a static figure showing a state the Stage also shows draws it with the Stage's mark, so the two agree; a discovered (frontier) vertex is dashed in both, since it is provisional, and grey stays for unavailable or background.
- **`say` is one text for the eye and the ear.** **Say it for the ear** gains an assignment example: "M[4] recebe 7", not "M[4] ← 7".

Only the `Stage` doc comments change, so nothing renders differently and no shared part is reached; `pnpm components` regenerates `COMPONENTS.md`, or `pnpm check` fails as `component-reference`. Neither `pnpm check`'s output nor the workflow changes, so the `artifact` skill doesn't.

## Acceptance criteria

- [ ] The `Stage` doc comment has the "not yet" paragraph with the search-tree workaround and the ADR 0007 second-need rule, as above.
- [ ] The **Marks** part says a static figure draws a state the Stage also shows with the Stage's mark, with the dashed discovered vertex as its example.
- [ ] **Say it for the ear** has the "M[4] recebe 7", not "M[4] ← 7", example.
- [ ] `COMPONENTS.md` is regenerated with `pnpm components` and `pnpm check` passes.
- [ ] No mark, prop or behaviour is added; the wording names only public artifacts, or none.
