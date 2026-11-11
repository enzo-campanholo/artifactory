# 01: The Worker's tests save and load through the store's transports

Status: needs-info
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

### 2026-11-10: the first step stops at the Worker's type program

Implementer, branch `impl/http-transport-against-the-worker-01`. No test landed; production code, `worker/` and `scripts/check` are unchanged.

**What was tried.** A throwaway `tests/worker/transports.test.ts` imported `httpTransport` from `@artifactory/design-system/state` and `httpLibraryTransport` from `@artifactory/design-system/library-statuses`, stubbed global `fetch` to send a relative path to `exports.default.fetch` at `https://artifactory.test` with a signed Access token (passing every other request, such as the Worker's own Access-certs fetch, through), and ran under the `worker` Vitest project.

- **Runtime: works.** `scripts/heavy pnpm exec vitest run tests/worker/transports.test.ts` passed. The import loads, and `httpTransport().save("orbits01", …, orbit-period)` returned `saved` from the Worker.
- **Types: fail.** `worker/tsconfig.json` includes `../tests/worker/**/*` with `lib: ["ESNext"]` and the Workers types only, and `pnpm check`'s `tsc` step runs it. Following the import, `tsc -p worker/tsconfig.json` reports 17 errors, all inside the design system: `window` and `document` in `state.ts` (`keepFresh`), `localStorage` in `state.ts`, `library-statuses.ts` and `owner-mark.ts`, and `document`/`HTMLElement` in `question-markers.ts`. The test file itself has none. So the ticket can't pass `pnpm check` without a change outside its bounds, and the probe file was deleted.

**Unresolved, for the owner.** Which of these, if any, the ticket may do. It blocks the whole ticket.

1. **A DOM-free module for the HTTP transports** (recommended): move `loadOverHttp`, `httpTransport` and `httpLibraryTransport`, with the outcome types, into a design-system module that names no DOM global, which `state.ts` and `library-statuses.ts` import from. This is a production refactor with no behaviour change, against this ticket's "no production code changes" and its checklist item keeping `state.ts` and `library-statuses.ts` unchanged. It makes the spec's assumption true: the transports' module doesn't touch the DOM.
2. **Ambient declarations in `tests/worker`** for `window`, `document`, `localStorage` and `HTMLElement`. No production change, but these declarations join the Worker's whole TypeScript program, so Worker code naming a browser global would type-check and fail only when it runs.
3. **A separate TypeScript program for the transport test**: exclude it from `worker/tsconfig.json` and add a project to `scripts/check/steps/tsc.ts`. That touches `worker/` and `scripts/check`, and the DOM and Workers types clash in a single program (the reason `tsc.ts` gives for the split), so that program would still need one of the other two answers.
