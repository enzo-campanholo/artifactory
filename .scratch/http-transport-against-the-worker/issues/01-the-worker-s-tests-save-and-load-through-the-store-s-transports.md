# 01: The Worker's tests save and load through the store's transports

Status: ready-for-agent
Blocked by: None (can start immediately)

Spec: [The HTTP transport against the Worker](../spec.md). Tests only: no production code changes.

**What to build:** in `tests/worker`, route global `fetch` to the Worker under test, adding the origin and the Access token as `apiRequest` in `tests/worker/requests.ts` does today, and call `httpTransport()` and `httpLibraryTransport()` from the design system against it. Add one test per outcome, each asserting the outcome the transport returns, never the status code behind it: the raw-request tests already own the codes.

**First step:** import `design-system/src/state.ts` in a `tests/worker` file and run it. If the Worker's test runtime can't import it, stop there: write what failed in a dated comment, set this ticket to `needs-info`, and leave the choice to the owner. Don't add a parameter to `httpTransport` to get around it.

- [ ] A `tests/worker` file imports the store's transports and runs under the Worker's test project.
- [ ] A load returns `loaded` with the attempts and answers saved before it, `signed out` without a token, and `failed` for an unknown artifact.
- [ ] A save returns `saved` with the answer, `already answered` with the first answer when the question already has one in that attempt, `signed out` without a token, and `failed` for a question the manifest doesn't have.
- [ ] The Library's load returns `loaded` with the latest attempts' summaries, and `signed out` without a token.
- [ ] The existing `tests/worker` cases pass unchanged, and no `tests/store` file changes.
- [ ] `design-system/src/state.ts`, `library-statuses.ts` and `worker/` are unchanged.
- [ ] `CODING_STANDARDS.md` › Tests says routing `fetch` to the Worker under test is plumbing, not a test double, and seam 2's line names the transports' outcomes.
- [ ] `docs/agents/test-seams.md` › `tests/worker` lists the outcomes this adds.

## Comments
