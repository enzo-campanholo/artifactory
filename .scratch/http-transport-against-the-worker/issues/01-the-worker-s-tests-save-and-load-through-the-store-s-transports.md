# 01: The Worker's tests save and load through the store's transports

Status: resolved
Blocked by: None (can start immediately)

Spec: [The HTTP transport against the Worker](../spec.md). Tests only: no production code changes.

**What to build:** in `tests/worker`, route global `fetch` to the Worker under test, adding the origin and the Access token as `apiRequest` in `tests/worker/requests.ts` does today, and call `httpTransport()` and `httpLibraryTransport()` from the design system against it. Add one test per outcome, each asserting the outcome the transport returns, never the status code behind it: the raw-request tests already own the codes.

**First step:** import `design-system/src/state.ts` in a `tests/worker` file and run it. If the Worker's test runtime can't import it, stop there: write what failed in a dated comment, set this ticket to `needs-info`, and leave the choice to the owner. Don't add a parameter to `httpTransport` to get around it.

- [x] A `tests/worker` file imports the store's transports and runs under the Worker's test project.
- [x] A load returns `loaded` with the attempts and answers saved before it, `signed out` without a token, and `failed` for an unknown artifact.
- [x] A save returns `saved` with the answer, `already answered` with the first answer when the question already has one in that attempt, `signed out` without a token, and `failed` for a question the manifest doesn't have.
- [x] The Library's load returns `loaded` with the latest attempts' summaries, and `signed out` without a token.
- [x] The existing `tests/worker` cases pass unchanged, and no `tests/store` file changes.
- [x] `worker/` is unchanged, and `design-system/src/state.ts` and `library-statuses.ts` change only to take the HTTP transports from a DOM-free design-system module, with no behaviour change ([owner decision](#2026-11-10-owner-decision-on-the-type-program)).
- [x] `CODING_STANDARDS.md` › Tests says routing `fetch` to the Worker under test is plumbing, not a test double, and seam 2's line names the transports' outcomes.
- [x] `docs/agents/test-seams.md` › `tests/worker` lists the outcomes this adds.

## Comments

### 2026-11-10: the first step stops at the Worker's type program

Implementer, branch `impl/http-transport-against-the-worker-01`. No test landed; production code, `worker/` and `scripts/check` are unchanged.

**What was tried.** A throwaway `tests/worker/transports.test.ts` imported `httpTransport` from `@artifactory/design-system/state` and `httpLibraryTransport` from `@artifactory/design-system/library-statuses`, stubbed global `fetch` to send a relative path to `exports.default.fetch` at `https://artifactory.test` with a signed Access token (passing every other request, such as the Worker's own Access-certs fetch, through), and ran under the `worker` Vitest project.

- **Runtime: works.** `scripts/heavy pnpm exec vitest run tests/worker/transports.test.ts` passed. The import loads, and `httpTransport().save("orbits01", …, orbit-period)` returned `saved` from the Worker.
- **Types: fail.** `worker/tsconfig.json` includes `../tests/worker/**/*` with `lib: ["ESNext"]` and the Workers types only, and `pnpm check`'s `tsc` step runs it. Following the import, `tsc -p worker/tsconfig.json` reports 17 errors, all inside the design system: `window` and `document` in `state.ts` (`keepFresh`), `localStorage` in `state.ts`, `library-statuses.ts` and `owner-mark.ts`, and `document`/`HTMLElement` in `question-markers.ts`. The test file itself has none. So the ticket can't pass `pnpm check` without a change outside its bounds, and the probe file was deleted.

**Unresolved, for the owner.** Which of these, if any, the ticket may do. It blocks the whole ticket.

1. **A DOM-free module for the HTTP transports** (recommended): move `loadOverHttp`, `httpTransport` and `httpLibraryTransport`, with the outcome types, into a design-system module that names no DOM global, which `state.ts` and `library-statuses.ts` import from. This is a production refactor with no behaviour change, against this ticket's "no production code changes" and its checklist item keeping `state.ts` and `library-statuses.ts` unchanged. It makes the spec's assumption true: the transports' module doesn't touch the DOM.
2. **Ambient declarations in `tests/worker`** for `window`, `document`, `localStorage` and `HTMLElement`. No production change, but these declarations join the Worker's whole TypeScript program, so Worker code naming a browser global would type-check and fail only when it runs.
3. **A separate TypeScript program for the transport test**: exclude it from `worker/tsconfig.json` and add a project to `scripts/check/steps/tsc.ts`. That touches `worker/` and `scripts/check`, and the DOM and Workers types clash in a single program (the reason `tsc.ts` gives for the split), so that program would still need one of the other two answers.

### 2026-11-10: owner decision on the type program

Owner, implement-spec orchestration session, 2026-11-10, answering the comment above.

- **Approved:** option 1, a DOM-free module for the HTTP transports. Move `loadOverHttp`, `httpTransport` and `httpLibraryTransport`, with their outcome types, into a design-system module that names no DOM global, and have `state.ts` and `library-statuses.ts` import from it. This supersedes the ticket's "no production code changes" and its item keeping `state.ts` and `library-statuses.ts` unchanged, for this move only: no behaviour changes, and `worker/` stays unchanged.

### 2026-11-10: implementation

Implementer, branch `impl/http-transport-against-the-worker-01b`, under the [owner decision](#2026-11-10-owner-decision-on-the-type-program) above. Every checklist item is met.

**Result.**

- **The move** (`0c64221`): `design-system/src/http-transports.ts` holds `loadOverHttp`, `httpTransport`, `httpLibraryTransport`, the `LoadOutcome` and save outcome types, and the `Transport` and `LibraryTransport` interfaces the two transports return. It names no DOM global, and it imports only types from `saved-state.ts` and `scoring.ts`, which the Worker's program already includes. Its code is the old code, moved unchanged. `state.ts` re-exports `httpTransport` and `Transport`, and `library-statuses.ts` re-exports `httpLibraryTransport`, so `ArtifactLayout.astro`, `LibraryLayout.astro`, the catalog and `tests/store` import as before, all unchanged. `loadOverHttp` is now private to the new module, the only place that calls it. `design-system/package.json` exports it as `./http-transports`, for the Worker's tests.
- **The tests** (`1132e12`): `tests/worker/transports.test.ts` stubs global `fetch` so that a same-origin path goes to `exports.default.fetch` at `https://artifactory.test`, with a signed Access token unless the test is signed out. Any other request passes through to the real `fetch`. There are nine tests, one per outcome the ticket lists, each asserting the outcome the transport returns.
- **Docs:** `CODING_STANDARDS.md` › Tests calls the `fetch` routing plumbing, not a test double, and seam 2's line names the transports' outcomes. `docs/agents/test-seams.md` › `tests/worker` lists them and says the raw-request cases own the status codes.
- **Ticket:** the checklist item about unchanged files now matches the owner's decision.

**Validation.**

- `tsc -p worker/tsconfig.json` passes with the test file in that program.
- `vitest run tests/worker`: 4 files and 36 tests pass, with the existing cases unchanged.
- **A deliberate breakage, reverted afterwards:** the answer path changed to `/attempt/`, the Library path to `/api/libraries`, the save's 409 to 410 and the load's 401 to 403. Six of the nine tests failed: every `loaded`, `saved`, `already answered` and load `signed out` case. The three that passed are the `failed` outcomes, which any wrong path also produces, and the save's `signed out`, whose 401 check wasn't changed. Changing that check to 403 alone fails the save's `signed out` test.
- `git diff architecture-review-implementation` shows no change under `worker/` or `tests/store`. A full `pnpm check` runs on the final HEAD.

**Shared parts reached:** none (no component, style or token).

**Left undone:** nothing.

### 2026-11-10: the owner's review of the PR

Owner, in this implementation session, on PR #7 (`impl/http-transport-against-the-worker-01b` into `architecture-review-implementation`).

- **Approved:** ignore the impeccable hook's cache at the repo root in `.gitignore`, since Prettier failed `pnpm check` on it (`de3b39e`).
- **Approved:** fix the CI failure in `tests/check/reporting.test.ts`, outside this ticket's files. CI failed this branch and the integration branch, never `main`, on "records the comparison…": a fixture check's report must appear within 10 s. A `--last-passed` check first waits its turn behind other full-scope fixture checks, and the integration branch's added `tests/check` and `tests/stepping` work runs beside it. Both of that file's report polls now wait until the check starts, bounded by the test's own timeout. This overlaps component rules 02's files, so merging the two may need a hand-merge in that file.
- **Asked for:** only tests that are needed and well designed. The nine stay, one per outcome as the spec requires, but each now asserts only what the transport adds. The load and the Library's load use one saved answer, not two answers or two artifacts, since ordering and the summary rules belong to the raw-request tests and seam 4. The save no longer re-checks the time format the raw tests own, and a `savedAnswer` helper replaces the precondition guards.

### 2026-11-12: resolved

Orchestrator, implement-spec session (integration branch `architecture-review-implementation`). This ticket's work landed on the integration branch, and a full `pnpm check` passed (`current`) on each landed HEAD. The last was `7c62489`, after the review fixes. A two-axis code review (Standards and Spec) of the whole branch ran on 2026-11-11. Its findings, and the owner's four decisions on them (recorded on the specs), were fixed in `impl/review-fixes` (`bcd4fab`…`7c62489`). Review fixes: the transports have one import path, `./http-transports` (owner decision), and the interfaces moved to `./transport`. It reaches `main` through the integration branch's PR.
