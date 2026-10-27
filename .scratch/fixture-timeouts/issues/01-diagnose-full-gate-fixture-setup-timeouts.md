# 01: Diagnose full-gate fixture setup timeouts

Status: wontfix

On 2026-10-25 a plain `pnpm check` exited 1 after Vitest fixture setup timed out in `tests/check/reporting.test.ts`, `artifact-checks.test.ts` and `valid-artifacts.test.ts`. Every earlier step passed, 350 tests passed, and Vitest ran for 69 minutes. The source didn't change during the run.

What has been ruled out, on the same source:

- The three files alone passed all 78 tests in about five minutes.
- A real fixture setup took about 0.2 s, and a real artifact-scope check about 6 s.
- The next plain full gate passed with 0 failures.

Transient host pressure fits the evidence but isn't established, and no code regression has been found. Don't raise timeouts or cut coverage for it.

**If it recurs:** capture which fixture setup or check startup is slow, with contemporaneous memory, I/O pressure and `scripts/heavy --status --json`, before proposing a fix. Prove any fix at the existing fixture seam.

## Comments

### 2026-10-27: closed, not recurred

Owner, T3 thread, 2026-10-27: close it. It hasn't recurred: the full `pnpm check` on `f7c9a1f` passed locally that day (Vitest 483 s), and the private copy's CI runs 40504985287 and 40510858345 passed. Closed as `wontfix` with no cause established and no code changed. If it recurs, reopen this ticket and follow "If it recurs" above.
