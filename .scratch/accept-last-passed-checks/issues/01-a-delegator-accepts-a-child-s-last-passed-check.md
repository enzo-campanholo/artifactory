# 01: A delegator accepts a child's `--last-passed` check

Status: resolved
Blocked by: None (can start immediately)

**Problem:** `docs/agents/delegation.md` › Briefs accepts a child's result only when `scripts/heavy --status --json` shows `check.applicability: current` for the child's HEAD. A successful `--last-passed` run on the child's HEAD, with the source unchanged since, shows `unknown`, so the delegator resumes the child and the gate runs again. The status shows neither the HEAD a `--last-passed` run checked nor whether the source changed after it. Without those, such a run looks the same as a run on another HEAD or on source edited since.

The owner narrowed the rule to `current` on 2026-11-08 (private copy workflow 02, merged in `3ffc9aa`). Widening it was deferred until the status can tell these runs apart, and no ticket was filed for it then.

**What to build:** first, `scripts/heavy --status --json` reports the HEAD a `--last-passed` run checked and whether the source still matches it. Then the delegator's rule also accepts a successful `--last-passed` run on the child's HEAD when the source hasn't changed.

- [x] The status reports a `--last-passed` run's HEAD and whether the source still matches it, and a `tests/check` case covers both fields.
- [x] `docs/agents/delegation.md` accepts that run, and still resumes the child on any other `unknown`.
- [x] The owner approves the widened rule before it lands.

## Comments

### 2026-11-23: approved and resolved

**Approved:** the owner approved the widened rule in the implementing session on 2026-11-23 (`/implement` of this ticket, first question). Review then found that `pnpm check --last-passed HEAD` on a clean tree skips Vitest without any commit having passed, so the owner chose, in the same session's second question, to also require that the run's comparison commit has a successful `ci.yml` run. Scope: `docs/agents/delegation.md` › Briefs and › Local evidence.

**Result:**

- `scripts/heavy --status --json` reports `check.lastPassedRun: { head, comparedWith, sourceUnchanged }` when the latest attempt is a completed, exit-0 `--last-passed` run on a HEAD whose steps all passed, Vitest alone allowed skipped; otherwise `null`. `comparedWith` is the `--last-passed` revision resolved to a full SHA when the check starts (`null` if it didn't resolve), recorded in the check report as `comparedWith`. `sourceUnchanged` holds when the source didn't drift during the run and matches it now. `check.applicability` stays `unknown` for these runs. The text `--status` line prints the same facts.
- `docs/agents/delegation.md` accepts such a run when `head` equals `git.head`, `sourceUnchanged` is `true`, and `gh run list --workflow ci.yml --commit <comparedWith> --status success` finds a run; any other `unknown` still resumes the child.
- `tests/check/reporting.test.ts` covers the fields: unchanged, edited and restored, HEAD moved on, drift during the run, and `null` for a full, an artifacts-only and a failing `--last-passed` run. The existing drift test now waits for a report that is new to its own run, since the directory now holds more than one earlier report.

**Validation:** `tsc`, ESLint and Prettier on the changed files; `tests/check/reporting.test.ts` 16/16; full `pnpm check` 0 failures; the documented `gh` command prints `1` for a green CI commit and `0` for an unknown one.

**Declined review notes (judgement calls):** the four `{ reportPath, applicability, lastPassedRun }` literals in `checkEvidence`, the test's own commit argv beside `fixture-repo.ts`'s private `commit()`, and the repeated `previous` snapshot before `reportOnceStarted` were left as they are. "Attempt" for a check in `delegation.md` predates this ticket and clashes with GLOSSARY's _Attempt_; that's worth a `/domain-modeling` pass, not filed here.
