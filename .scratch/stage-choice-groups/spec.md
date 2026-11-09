# Stage choice groups

Source: [Stage controls and drawing](../artifact-generation-gaps/issues/03-stage-controls-and-drawing.md), on the [Artifact generation gaps](../artifact-generation-gaps/map.md) map. Every decision below was made with the owner on 2026-11-08, and the ticket's `## Answer` records them.

## Problem

Agents writing study artifacts hit four Stage limits:

- A Stage takes one choice control, so a graph-search artifact that let the owner pick both the start vertex and the search (breadth-first or depth-first) became two Stages.
- A build can't draw new structure per run, so the same artifact couldn't draw each run's search tree.
- There is no grey fill mark, so a discovered vertex is dashed in the Stage but filled light grey in the artifact's static figures, and the text explains the difference.
- Each step's line is read aloud, so a stack-machine artifact wrote "M[4] recebe …" instead of the brief's `M[4] ← …`.

The first is lifted. The other three stay as documented limits.

## Behaviour

### Choice groups

- `choose` keeps its current form, `{ label, options }`, and `steps` still gets the chosen option as text. Existing Stages and builds don't change.
- `choose` also takes a list of two or more groups, `[{ name, label, options }, …]`. `steps` then gets `{ [name]: option }`, one chosen option per group, and the build types it with the groups' names, each a `string`: `defineBuild<{ inicio: string; busca: string }>({ … })`, as `input` types its fields.
- Each group is a row of options under its own label, as one group is today, the groups one under another in the order written.
- No group opens with an option chosen. The step's line holds the prompt, and the counter stays hidden, until every group has a choice. The run starts at that choice, and any later change to any group runs again from step 1.
- Option names are unique across all of a Stage's groups. A drawn part named like an option chooses that option in its own group, as one group's shortcut does today, so a vertex can choose the start while the search stays a row of options.
- Without JavaScript and in print, the content as written stays the starting state, with no option named, as today.
- A Stage still takes one of `choose` and `input`, never both.

### Runs and Look

- `pnpm check` runs the build on every combination of options, one option from each group (7 vertices × 2 searches = 14 runs), with no cap. A failure names the combination as typed input names an example, `inicio = A, busca = largura`.
- `pnpm look` shoots the first option of every group, and prints what it ran as it does now (`first options inicio = A, busca = largura, 5 steps`).

## Documented limits

These stay as they are. `COMPONENTS.md` documents them so the next agent doesn't rediscover them.

- **New structure per run: not yet.** A build can't draw a structure each run produces, such as a search tree. The workaround: the tree is a subgraph of the graph, so the build marks its edges `strong`, keeps a `π` column, and lets a growing `body` table list each vertex's level or children. A second artifact that needs a drawn tree reopens the question under ADR 0007's second-need rule. Drawing one would mean the Stage laying out structure from the build's data, which goes beyond ADR 0007's "elements of the kinds the content already uses".
- **Four marks, no grey fill.** A static figure showing a state the Stage also shows draws it with the Stage's mark, so the two agree: a discovered vertex is dashed in both. `DESIGN.md` keeps grey for unavailable or background, and a frontier vertex is provisional, which is what `dashed` means.
- **`say` is one text for the eye and the ear.** "Say it for the ear" gains an assignment example: "M[4] recebe 7", not "M[4] ← 7".

## Failures

A Stage's own rules fail as `build`, under the `artifact` skill's [Build failures](../../.claude/skills/artifact/rules.md#build-failures):

- A list of groups with fewer than two groups.
- Two groups with the same `name`.
- An option name in more than one group.

`build-input` fails a list-form build whose type isn't the groups' names, each a `string`, and a one-group build typed with names, with messages shaped like the typed-input ones.

Runs fail as `stage-run`, as today, naming the combination.

## Documentation

- The `Stage` doc comments (and so `COMPONENTS.md`, via `pnpm components`):
  - The `choose` prop: both forms, and when the run starts.
  - The click shortcut: option names are unique across groups.
  - `Build` and `defineBuild`: the list form's input.
  - The three documented limits above: the search-tree workaround under a short "not yet" paragraph, the static-figure rule beside **Marks**, and the `←` example in **Say it for the ear**.
- The `artifact` skill:
  - `.claude/skills/artifact/stage.md`: the new failure messages, runs naming the combination, and what Look shoots and prints.
  - `.claude/skills/artifact/rules.md` › **Custom builds**: the `defineBuild` shape for the list form, and the list of what the Stage takes under "Missing a control or a mark?", which now includes several choice groups.
- `DESIGN.md` › the Stage's description: several labelled rows of options, and the run starting once every group has a choice.
- The catalog's Stage page (`design-system/catalog/stage.mdx`) adds a Stage with two groups, whose drawn parts choose from one of them.

## Shared parts

- `StepControls.astro` reaches every Stepper: check a Stepper still steps on its catalog page.
- The option rows and their click shortcut live in `Stage.astro` and `stage-element.ts` and reach only the Stage.

## Out of scope

- Mixing `choose` and `input` in one Stage.
- A default option in a group.
- A Stage that draws structure per run, and a fifth mark: kept as documented limits above.
- A separate shown and spoken text for a step's line.
- A Stage whose code changes between steps: no report asked for it. [Machine-trace component](../artifact-generation-gaps/issues/04-machine-trace-component.md) raises it again if the machine trace needs it.

## Comments

### 2026-11-08: owner decisions at ticketing

Owner, /to-tickets review in the Artifact generation gaps session, 2026-11-08, every recommendation accepted. Each bullet amends this spec or fills a gap in it; the tickets in `issues/` carry the detail.

- **A refused run with several groups** (02) says "Escolha outras opções." / "Choose other options.". A one-group Stage keeps today's line.
