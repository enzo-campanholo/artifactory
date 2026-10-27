# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`. They belong to the upstream repo: a private copy carries them only from the sync, so claim, comment on and close them in a checkout of the upstream repo, even when the work itself happens in the copy.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never a single combined tickets file
- Triage state is a `Status:` line near the top of each issue file, one of the [statuses](#statuses) below
- Comments and conversation history append to the bottom of the file under a `## Comments` heading
- A ticket or spec names its concepts as [`CODING_STANDARDS.md` › Domain language](../../CODING_STANDARDS.md#domain-language) says

## Statuses

The five canonical triage roles, under their own names:

| Label             | Meaning                                  |
| ----------------- | ---------------------------------------- |
| `needs-triage`    | Maintainer needs to evaluate this issue  |
| `needs-info`      | Waiting on reporter for more information |
| `ready-for-agent` | Fully specified, ready for an AFK agent  |
| `ready-for-human` | Requires human implementation            |
| `wontfix`         | Will not be actioned                     |

Once work starts, a ticket's `Status:` moves on to:

| Status     | Meaning                                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| `claimed`  | An agent is working on the ticket.                                                                        |
| `resolved` | Work is complete; the checklist and closing comment record the outcome and any owner-approved deferrals. |

## Implementation tickets

- Before starting a `ready-for-agent` ticket, check that every `Blocked by:` ticket is `resolved`, then set its `Status:` to `claimed`.
- To close a ticket, tick the met checklist items, complete the required checks and review, append a dated closing comment under `## Comments`, and set its `Status:` to `resolved`. The comment records the result, commits, validation, decisions and anything left undone. An explicit owner deferral of a required review must be recorded there.
- Put anything a later ticket must know in a dated comment on that later ticket itself, even when it has no direct dependency on this one.

## Decisions

Keep approvals, open decisions and deferrals in the existing spec or ticket's dated `## Comments`. Cite the owner message with its thread/date/item, or the source ticket comment, and state the affected scope. Later briefs and [handoffs](delegation.md#handoffs) link that comment; append a superseding decision when the owner changes it, preserving history.

- **Approved:** the authorized scope and its source.
- **Unresolved:** the decision-maker and the action their answer actually blocks. An optional design question does not become a dependency of approved work; missing information remains unknown.
- **Deferred:** the owner's decision and the scope left undone. Keep it deferred until that decision changes, including an accepted review or device-check deferral.

These categories describe decisions within comments; a ticket's `Status:` still takes a [status](#statuses). Use `Blocked by:` for actual prerequisites. Record completion evidence separately from authorization.

## Plugin skills

When a [mattpocock-skills](https://github.com/mattpocock/skills) skill (`/to-tickets`, `/triage`, `/wayfinder`) says to publish to the issue tracker, fetch a ticket, or use the tracker's Wayfinding operations, read [issue-tracker-skills.md](issue-tracker-skills.md).
