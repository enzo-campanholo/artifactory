# 01: A delegator accepts a child's `--last-passed` check

Status: needs-triage
Blocked by: None (can start immediately)

**Problem:** `docs/agents/delegation.md` › Briefs accepts a child's result only when `scripts/heavy --status --json` shows `check.applicability: current` for the child's HEAD. A successful `--last-passed` run on the child's HEAD, with the source unchanged since, shows `unknown`, so the delegator resumes the child and the gate runs again. The status shows neither the HEAD a `--last-passed` run checked nor whether the source changed after it. Without those, such a run looks the same as a run on another HEAD or on source edited since.

The owner narrowed the rule to `current` on 2026-11-08 (private copy workflow 02, merged in `3ffc9aa`). Widening it was deferred until the status can tell these runs apart, and no ticket was filed for it then.

**What to build:** first, `scripts/heavy --status --json` reports the HEAD a `--last-passed` run checked and whether the source still matches it. Then the delegator's rule also accepts a successful `--last-passed` run on the child's HEAD when the source hasn't changed.

- [ ] The status reports a `--last-passed` run's HEAD and whether the source still matches it, and a `tests/check` case covers both fields.
- [ ] `docs/agents/delegation.md` accepts that run, and still resumes the child on any other `unknown`.
- [ ] The owner approves the widened rule before it lands.
