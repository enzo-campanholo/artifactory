# 02: A delegator verifies a child's check before accepting it

Status: claimed
Blocked by: None (can start immediately)

Spec: [Private copy workflow](../spec.md) › A delegator verifies the child's check. Its decisions are in [Agent workflow in a private copy](../../artifact-generation-gaps/issues/09-agent-workflow-in-a-private-copy.md) › Answer. They bound this ticket, so don't reopen them. The owner widened the rule to `--last-passed` runs at ticketing: see the spec's `## Comments`.

**What to build:** a delegating agent no longer takes a child's word that its check passed. Before accepting the result, it runs `scripts/heavy --status --json` in the child's worktree. It accepts the result when the latest check is `current` for the child's HEAD, or when it is a successful `--last-passed` run of the child's HEAD with the source unchanged since (the `artifact` skill's gate on `main`, which reports `unknown`). On anything else (`stale`, `none`, a check still running, or `unknown` from anything but such a run), it resumes the child to finish the gate, instead of rerunning the gate itself or accepting the claim. This catches a child that ended its turn while a background check was still running.

The work is docs-only and goes in a checkout of the upstream repo, in the delegation doc. Read `/writing-for-agents` before editing.

- [x] The delegation doc states the acceptance rule. Put it next to "The child reports completion in its final message", or in a short "Accepting a child's result" paragraph under Briefs, whichever reads better. Either way, it applies to every delegated child, not only reviewers.
- [x] The rule links Local evidence for what each `check.applicability` value means and doesn't restate those definitions.
- [x] The rule names its action positively (resume the child to finish the gate). It also rules out the two shortcuts: rerunning the gate as the delegator, and accepting the claim.
- [x] Briefs gain no separate line on ending a turn early. A brief already carries `CLAUDE.md`'s `scripts/heavy` rules, and they include that one.
- [x] Before writing the rule, confirm that `scripts/heavy --status --json` shows enough to tell a successful `--last-passed` run of the child's HEAD apart: its mode, its outcome, the HEAD it ran on, and that the source is unchanged since. If it does, the rule accepts such a run besides `current`, and the closing comment names the fields it reads. If it doesn't, stop and report to the owner what's missing instead of inventing a proxy. _Met by the first comment's stop: it doesn't. The owner's [narrowing decision](../spec.md#2026-11-08-the-delegators-rule-narrowed-back-to-current) then superseded the `--last-passed` acceptance, so the rule accepts `current` only._
- [x] Walk three cases through the edited doc and confirm each reaches the action above: a child that reports a pass with its check still running, a child whose check is `current`, and a child whose successful `--last-passed` run is of its HEAD with the source unchanged. Record the walk-through in the closing comment. _The owner's narrowing decision superseded the third case's action: the doc resumes that child instead of accepting it._

## Comments

### 2026-11-08: stopped at the field check, status can't show a `--last-passed` run's HEAD or unchanged source

Implementer for this ticket, delegated from the Artifact generation gaps session. Where: `/home/isolino/.t3/worktrees/artifactory-oss/t3-b7738002`, branch `t3/delegator-verifies-child-check`, based on `gaps-implementation`. Status stays `claimed` for the delegator's review.

**Result.** I stopped before writing the rule, as the field-check item says, so `docs/agents/delegation.md` is unchanged. `scripts/heavy --status --json` can't tell a successful `--last-passed` run of the child's HEAD, with the source unchanged since, from any other `--last-passed` run. No box is ticked: the rule doesn't exist yet, so neither does its walk-through.

**What the status shows.** I read `scripts/heavy-command.ts` (the `--status` branch), `scripts/heavy-state.ts` (`readJobs`), `scripts/check/provenance.ts` (`checkEvidence`, `beginCheck`, `fingerprint`), and real status output from this worktree and the main checkout (schema 1). For each field the widened rule needs:

- **Mode: shown.** `jobs[].argv` is `node scripts/check/main.ts --last-passed <sha>` (the `pnpm check` script wraps `heavy-command.ts`), and `jobs[].checkReportPath` matches `check.reportPath`. `<sha>` is the CI baseline passed to the flag, not the HEAD the run checked.
- **Outcome: shown in part.** `jobs[].state`, `exitCode` and `signal` show the job's result. The report's `failureCount`, `steps[].state` and `source.drifted` aren't in the status, and `check.applicability` is `unknown` for every `--last-passed` run, so it doesn't separate a pass from a failure.
- **HEAD the run ran on: missing.** `git.head` is the checkout's HEAD now. The run's HEAD is only in the report file (`head`), which the status points to with `check.reportPath` but doesn't include.
- **Source unchanged since: missing.** The report holds `source.start` and `source.end`, which are fingerprints of tracked and nonignored working content. `checkEvidence` compares the checkout's current fingerprint with them only for a plain full run (the `current`/`stale` split), and it returns `unknown` for a `--last-passed` run before computing anything. Nothing in the status or on disk exposes the current fingerprint, so a delegator can't compare.

**Why not a proxy.** The obvious stand-in is: read the report at `check.reportPath`, compare its `head` with `git.head`, and require `dirtyPaths` to be `[]`. It's wrong when the child ran the check on a dirty tree and then discarded the edits. HEAD and the tree would match, but the check covered different content. Fingerprint-equivalent logic is exactly what `checkEvidence` already holds, so I didn't copy it into the doc.

**What would make the widened rule writable** (the owner's decision; neither is in this ticket's scope):

- *Platform:* `check` in the status reports the latest run's scope, HEAD and whether the source matches now. One way is a separate applicability for a passing `--last-passed` run, such as `current` scoped to `last-passed`. With that, the rule reads `check` alone, like the `current` case.
- *Docs only:* the spec's original rule (accept only `check.applicability: current` for the child's HEAD) without the widening. Children in worktrees run the plain gate, so the `--last-passed` case comes up only for a gate on a private copy's `main`.

**Walk-through against today's fields** (the three cases from the checklist, without the rule):

- *Child reports a pass while its check is still running:* the job is `running` (`interrupted_or_unknown` once the turn ends kills it), and `check.applicability` is `unknown`. Either rule resumes the child.
- *Child's check is `current`:* `check.applicability: current` for `git.head`. Either rule accepts.
- *Child's successful `--last-passed` run of its HEAD with the source unchanged:* `check.applicability: unknown`, and the job shows `completed`, exit 0, with `--last-passed` in its argv. The status doesn't show the run's HEAD or whether the source matches, so this case can't be told apart from a run of another HEAD or of since-edited source. This is the gap above.

**Commits:** `386a30f` (claim), plus this comment.

**Validation:** I ran the full `scripts/heavy pnpm check` at `f7af5c6` in this linked worktree. Every step passed except Vitest, which failed on one test only. It's the known environment failure: `tests/check/reporting.test.ts` › "attaches full success to actual tracked and nonignored working content without staging it" (`expected 'stale' to be 'current'`), recorded on ticket 01. Nothing else failed. The `gaps-implementation` tip is still `0735893`, this branch's base, so the merge brought in nothing and I didn't rerun the check. After the check, this paragraph is the only change.

**Left undone:** every checklist item. They wait on the owner's choice between the two routes above.

### 2026-11-08: rule written, accepting `current` only

Implementer for this ticket, delegated from the Artifact generation gaps session. Where: `/home/isolino/.t3/worktrees/artifactory-oss/t3-f09dfff2`, branch `t3/f09dfff2`, based on `gaps-implementation`. Status stays `claimed` for the delegator's review.

**Result.** `docs/agents/delegation.md` › Briefs gains a paragraph right after "The child reports completion in its final message", written for any child, not only reviewers. The delegator runs `scripts/heavy --status --json` in the child's worktree and accepts only `check.applicability: current` for the child's HEAD. On any other value, `unknown` from a `--last-passed` run included, it resumes the child to finish the gate, even when the child's final message reports a pass, and leaves the gate to the child rather than running it itself. The paragraph links [Local evidence](../../../docs/agents/delegation.md#local-evidence) for the values and doesn't restate them. Briefs gain no line on ending a turn early. This follows the owner's [narrowing decision](../spec.md#2026-11-08-the-delegators-rule-narrowed-back-to-current), which superseded the `--last-passed` widening; the checklist's `--last-passed` items are ticked with that note.

**Walk-through against the edited doc:**

- _Child reports a pass with its check still running:_ the job is `running` (or `interrupted_or_unknown` once its turn ended), and `check.applicability` is `unknown`. That isn't `current`, so the delegator resumes the child to finish the gate, despite the reported pass.
- _Child's check is `current`:_ `check.applicability: current` for the child's HEAD, so the delegator accepts the result.
- _Child's successful `--last-passed` run of its HEAD, source unchanged:_ `check.applicability: unknown`. The paragraph names this case, so the delegator resumes the child to finish the plain gate. Per the owner's decision, this replaces the ticket's original "accepts".

**Commits:** `4c58617` (the rule), plus this comment and the checklist ticks.

**Validation:** the full `scripts/heavy pnpm check` at `4c58617` in this linked worktree. Every step passed except Vitest, which failed on one test only: the known environment failure, `tests/check/reporting.test.ts` › "attaches full success to actual tracked and nonignored working content without staging it" (`expected 'stale' to be 'current'`), recorded on ticket 01. After the check, this comment and the checklist ticks are the only changes.

**Left undone:** the delegator's review and closing. Widening the rule to `--last-passed` runs stays deferred, as the owner decided.
