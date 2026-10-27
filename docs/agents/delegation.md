# Delegation and handoffs

## Briefs

A delegated brief names the ticket, the branch or worktree, the files the child owns, the [decision comments](issue-tracker.md#decisions) that bound the work, and the `scripts/heavy` rules from `CLAUDE.md`. Carry those pointers and accepted findings into a replacement brief. Recorded authorization covers its stated scope after interruption or compaction; ask only for a still-unresolved decision that blocks the next action.

A review brief also says who receives the review, who decides on each finding, and how accepted findings reach the implementer: in the implementer's next brief, or appended to the ticket. The child reports completion in its final message.

## Ownership

Only the session that started a delegated agent can check, message or stop it (in T3 Code, the thread that called it). Keep each returned ID or link exactly as returned. An error saying it belongs to another session means exactly that: the agent is still running, so leave it to that session. Start new work only for what a child left unfinished, never a duplicate of a task still running.

## Capacity

Keep at most two delegated workers active at once on a local machine, nested workers included. The queue runs one heavy job at a time, so a second worker's job waits for the first. Stop a delegated task's session once its result is in, reviewers' included.

## Local evidence

Before resuming local commands, run `scripts/heavy --status --json` from the worktree root. It reports the queue's holder, this checkout's recent jobs and the latest check, without taking the queue. It reports processes, not task completion or approval.

Its `check.applicability` describes the latest local attempt:

- `current`: a successful plain full check of this HEAD, with the source unchanged since.
- `stale`: that pass, but HEAD or the source has changed.
- `unknown`: a scoped or `--last-passed` run, a failure, an interrupted run, or source that changed during the check.
- `none`: no local check evidence.

A missing result never implies success. Keep the source fixed during verification, and never reuse a check result in place of running the gate.

## Handoffs

Append a dated handoff under the ticket's `## Comments` at the end of each task and before a long verification such as `pnpm check`. On a usage or rate limit, write one and stop: if the error gives a reset time and the runtime can wake you then, schedule that; otherwise tell the owner.

```md
### <date>: handoff

Owner: <this session>; delegated agents <exact IDs or links>.
Where: <checkout>, <branch>, HEAD <sha>.
Done: <demonstrated result>; check <scope>, <applicability>.
Partial: <unchecked edits>. Findings: <accepted fixes still due>.
Decisions: <links to approved, unresolved (decision-maker, what it blocks) and deferred comments>.
Running: <command and PID, or none>. Next: <one unblocked action>.
```

A handoff is a snapshot. Before acting on one, confirm branch, push and process facts with Git, `scripts/heavy --status` and `ps`, and read the linked decisions and child histories.
