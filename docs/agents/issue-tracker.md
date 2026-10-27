# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`. They belong to the upstream repo: a private copy carries them only from the sync, so claim, comment on and close them in a checkout of the upstream repo, even when the work itself happens in the copy.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never a single combined tickets file
- Triage state is a `Status:` line near the top of each issue file, using the strings in `triage-labels.md`
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## Implementation tickets

- Before starting a `ready-for-agent` ticket, check that every `Blocked by:` ticket is `resolved`, then set its `Status:` to `claimed`.
- To close a ticket, tick the met checklist items, complete the required checks and review, append a dated closing comment under `## Comments`, and set its `Status:` to `resolved`. The comment records the result, commits, validation, decisions and anything left undone. An explicit owner deferral of a required review must be recorded there.
- Put anything a later ticket must know in a dated comment on that later ticket itself, even when it has no direct dependency on this one.

## Decisions

Keep approvals, open decisions and deferrals in the existing spec or ticket's dated `## Comments`. Cite the owner message with its thread/date/item, or the source ticket comment, and state the affected scope. Later briefs and [handoffs](delegation.md#handoffs) link that comment; append a superseding decision when the owner changes it, preserving history.

- **Approved:** the authorized scope and its source. Continue within it after compaction or handoff without requesting the same approval again.
- **Unresolved:** the decision-maker and the action their answer actually blocks. An optional design question does not become a dependency of approved work; missing information remains unknown.
- **Deferred:** the owner's decision and the scope left undone. Keep it deferred until that decision changes, including an accepted review or device-check deferral.

These categories describe decisions within comments; ticket statuses still use `triage-labels.md`. Use `Blocked by:` for actual prerequisites. Record completion evidence separately from authorization, and resolve only after the ticket's required checks/review or their explicit owner deferral.

The sections from here on map this tracker for the [mattpocock-skills](https://github.com/mattpocock/skills) plugin (`/to-tickets`, `/triage`, `/wayfinder`); skip them without it.

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The owner usually passes the path or the issue number.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
