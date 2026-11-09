# 02: A delegator verifies a child's check before accepting it

Status: ready-for-agent
Blocked by: None (can start immediately)

Spec: [Private copy workflow](../spec.md) › A delegator verifies the child's check. Its decisions are in [Agent workflow in a private copy](../../artifact-generation-gaps/issues/09-agent-workflow-in-a-private-copy.md) › Answer. They bound this ticket, so don't reopen them. The owner widened the rule to `--last-passed` runs at ticketing: see the spec's `## Comments`.

**What to build:** a delegating agent no longer takes a child's word that its check passed. Before accepting the result, it runs `scripts/heavy --status --json` in the child's worktree. It accepts the result when the latest check is `current` for the child's HEAD, or when it is a successful `--last-passed` run of the child's HEAD with the source unchanged since (the `artifact` skill's gate on `main`, which reports `unknown`). On anything else (`stale`, `none`, a check still running, or `unknown` from anything but such a run), it resumes the child to finish the gate, instead of rerunning the gate itself or accepting the claim. This catches a child that ended its turn while a background check was still running.

The work is docs-only and goes in a checkout of the upstream repo, in the delegation doc. Read `/writing-for-agents` before editing.

- [ ] The delegation doc states the acceptance rule. Put it next to "The child reports completion in its final message", or in a short "Accepting a child's result" paragraph under Briefs, whichever reads better. Either way, it applies to every delegated child, not only reviewers.
- [ ] The rule links Local evidence for what each `check.applicability` value means and doesn't restate those definitions.
- [ ] The rule names its action positively (resume the child to finish the gate). It also rules out the two shortcuts: rerunning the gate as the delegator, and accepting the claim.
- [ ] Briefs gain no separate line on ending a turn early. A brief already carries `CLAUDE.md`'s `scripts/heavy` rules, and they include that one.
- [ ] Before writing the rule, confirm that `scripts/heavy --status --json` shows enough to tell a successful `--last-passed` run of the child's HEAD apart: its mode, its outcome, the HEAD it ran on, and that the source is unchanged since. If it does, the rule accepts such a run besides `current`, and the closing comment names the fields it reads. If it doesn't, stop and report to the owner what's missing instead of inventing a proxy.
- [ ] Walk three cases through the edited doc and confirm each reaches the action above: a child that reports a pass with its check still running, a child whose check is `current`, and a child whose successful `--last-passed` run is of its HEAD with the source unchanged. Record the walk-through in the closing comment.
