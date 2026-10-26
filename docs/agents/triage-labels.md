# Triage labels

This repo uses the five canonical triage roles under their own names, as the `Status:` line of a ticket:

| Label             | Meaning                                  |
| ----------------- | ---------------------------------------- |
| `needs-triage`    | Maintainer needs to evaluate this issue  |
| `needs-info`      | Waiting on reporter for more information |
| `ready-for-agent` | Fully specified, ready for an AFK agent  |
| `ready-for-human` | Requires human implementation            |
| `wontfix`         | Will not be actioned                     |

## Lifecycle statuses

Once work starts, a ticket's `Status:` moves on to:

| Status     | Meaning                                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| `claimed`  | An agent is working on the ticket.                                                                        |
| `resolved` | Work is complete; the checklist and closing comment record the outcome and any owner-approved deferrals. |

[issue-tracker.md](issue-tracker.md) covers claiming and closing tickets.
