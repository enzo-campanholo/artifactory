# The HTTP transport against the Worker

Source: the architecture review of 2026-11-10, candidate 6. The decisions below were made with the owner that day, and [Comments](#comments) records them.

## Problem

The state store reaches the server through a transport, and that seam has two adapters. Every test in `tests/store` runs the in-memory one. The deployed one, `httpTransport()` in `design-system/src/state.ts`, runs in no test, and neither does `httpLibraryTransport()` in `library-statuses.ts`.

The protocol between that transport and the Worker is written on both sides and checked on neither:

- **The paths:** `/api/state/<artifact ID>` and `/api/state/<artifact ID>/attempts/<attempt ID>/answers/<question ID>` are built in `state.ts` and matched by `statePath` and `answerPath` in `worker/index.ts`.
- **The outcomes:** the transport reads 201 as saved, 401 as signed out, a 409 carrying an answer as already answered, and anything else as failed. The Worker answers 201, 409 with the saved answer, 409 `artifact changed`, 400, 404 and 413.

`tests/worker` asserts the Worker's responses from hand-built requests, and the in-memory transport's forced outcomes model the same contract by hand. A path or a status that drifts on one side fails nothing.

## Behaviour

Tests only. No production code changes.

- `tests/worker` saves and loads through the store's own `httpTransport()` and `httpLibraryTransport()`.
- Global `fetch` is routed to the Worker under test, adding the origin and the Access token. A signed-out case sends no token.
- One test per outcome:
  - a load: loaded, signed out, failed;
  - a save: saved, already answered, signed out, failed;
  - the Library's load: loaded, signed out.
- The existing raw-request tests stay. They own the responses the transport can't express: the size limit, a body that isn't JSON, and the token variants.
- `tests/store` keeps the in-memory transport.

## Standards

- `CODING_STANDARDS.md` › Tests says the only test doubles are the in-memory transport and fixtures. Routing `fetch` to the Worker under test is plumbing, not a double, and that list says so once this lands.
- `CODING_STANDARDS.md` › The four seams, seam 2, and `docs/agents/test-seams.md` › `tests/worker` each gain the transports' outcome mapping. Seam 2 owns it, and seam 3 doesn't repeat it.

## Not known yet

Whether the Worker's test runtime can import `design-system/src/state.ts`. Its top level looks free of the DOM, but nobody has tried. The ticket proves it first.

## Out of scope

- A `fetch` parameter on `httpTransport`. No production caller would use it.
- What Cloudflare Access itself answers an expired session. The Worker's own 401 stands in for it here, and the live site stays with `pnpm probe`.

## Comments

### 2026-11-10: owner decisions at the architecture review

Owner, architecture review session, 2026-11-10 (thread 8d57bee0-37b7-4277-bf58-cace669ef571), every recommendation accepted.

- **Approved, round 1 Q7:** seam 2 owns the store's HTTP transport against the Worker, with global `fetch` routed to the Worker under test and production code unchanged; `CODING_STANDARDS.md` › Tests says the routing is plumbing.
- **Approved, round 2 Q10:** one test per outcome, with the existing raw-request tests kept.
- **Approved, round 3 Q1:** one ticket, whose first step proves the import; if it can't be done, the ticket returns to the owner as `needs-info`.
- **Order of work, round 2 Q12:** third. It depends on no other feature.
