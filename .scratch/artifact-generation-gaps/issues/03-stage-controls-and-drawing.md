# 03: Stage controls and drawing

Type: grilling

## Question

Which of these Stage limits should the Stage lift, and which should stay as documented limits?

## What the agents reported

- **One choice control per Stage.** A graph-search artifact wanted the owner to pick both the start vertex and the search (breadth-first or depth-first), so it became two Stages.
- **A build can't draw new structure per run.** The same artifact couldn't draw the search tree each run produces. It shows the tree as thickened edges on the graph, a `π` column and a final step that lists each vertex's children. ADR 0007 allows adding "elements of the kinds the content already uses"; that wasn't enough here.
- **No grey fill mark.** In the Stage, a grey (discovered) vertex can only get a dashed outline. The static figures give it a light-grey fill too, so the text has to explain the difference.
- **Each step's line is read aloud, so it can't use `←` notation.** A stack-machine artifact writes "M[4] recebe …" instead of the brief's `M[4] ← …`. This may be deliberate.

## To decide

For each limit: lift it (and how, from these real builds, as ADR 0007 asks), or keep it and document the workaround in `COMPONENTS.md`. If lifting "new structure per run" stretches ADR 0007, say so.
