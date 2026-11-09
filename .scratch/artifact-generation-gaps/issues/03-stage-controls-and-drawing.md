# 03: Stage controls and drawing

Type: grilling
Status: resolved

## Question

Which of these Stage limits should the Stage lift, and which should stay as documented limits?

## What the agents reported

- **One choice control per Stage.** A graph-search artifact wanted the owner to pick both the start vertex and the search (breadth-first or depth-first), so it became two Stages.
- **A build can't draw new structure per run.** The same artifact couldn't draw the search tree each run produces. It shows the tree as thickened edges on the graph, a `π` column and a final step that lists each vertex's children. ADR 0007 allows adding "elements of the kinds the content already uses"; that wasn't enough here.
- **No grey fill mark.** In the Stage, a grey (discovered) vertex can only get a dashed outline. The static figures give it a light-grey fill too, so the text has to explain the difference.
- **Each step's line is read aloud, so it can't use `←` notation.** A stack-machine artifact writes "M[4] recebe …" instead of the brief's `M[4] ← …`. This may be deliberate.

## To decide

For each limit: lift it (and how, from these real builds, as ADR 0007 asks), or keep it and document the workaround in `COMPONENTS.md`. If lifting "new structure per run" stretches ADR 0007, say so.

## Answer

Decided with the owner on 2026-11-08 (grilling session, rounds 1 and 2, every recommendation accepted). The build is specified in [Stage choice groups](../../stage-choice-groups/spec.md).

- **One choice control: lifted.** `choose` keeps `{ label, options }` and also takes a list of two or more named groups, so `steps` gets `{ [name]: option }`, typed through `defineBuild<…>`. No group opens chosen. The run starts once every group has a choice, and any later change runs again from step 1. Option names are unique across groups, which the check enforces, so a drawn part chooses the option it's named for. `pnpm check` runs every combination, with no cap, and `pnpm look` shoots the first option of each group. A Stage still takes `choose` or `input`, never both. No glossary entry: a choice group is a prop's shape, not a domain concept.
- **New structure per run: kept, "not yet".** Drawing a per-run tree would mean a tree layout in the Stage, which goes beyond ADR 0007's "elements of the kinds the content already uses", for one artifact. `COMPONENTS.md` documents the workaround: tree edges marked `strong` on the graph, a `π` column, and a growing `body` table. A second artifact that needs a drawn tree reopens the question under ADR 0007's second-need rule.
- **Grey fill mark: kept.** The four marks stay. A static figure showing a state the Stage also shows draws it with the Stage's mark (a discovered vertex is dashed in both), since `DESIGN.md` keeps grey for unavailable or background, and a frontier vertex is provisional.
- **`←` in `say`: kept, deliberate.** One text for the eye and the ear can't drift. "Say it for the ear" gains "M[4] recebe 7", not "M[4] ← 7".
- **Spec boundaries:** this ticket gets its own spec, and [Machine-trace component](04-machine-trace-component.md) gets another. The Stage didn't split into controls, structure and marks specs, since only one control changes.
- **Not raised here:** a Stage whose code changes between steps. [Code display](02-code-display.md) handed it to this ticket, but no agent reported needing it, so it stays out unless the machine trace needs it.
- No ADR: choice groups are cheap to reverse. Consistent with ADR 0001 (a build's choices reset on reload) and ADR 0007, whose second-need rule the search tree now waits on.

## Comments

- **2026-11-08:** Superseded in part. This ticket kept `input` as whole numbers in fields, since no report asked for more. [Typed words in a Stage](10-typed-words-in-a-stage.md) adds text fields (`kind: "text"`) beside the number fields, decided with the owner on 2026-11-08, and specified in [Stage text input](../../stage-text-input/spec.md). [Stage choice groups](../../stage-choice-groups/spec.md) is unaffected: a Stage still takes `choose` or `input`, never both.
