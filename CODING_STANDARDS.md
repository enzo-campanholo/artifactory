# Coding standards

These cover the platform, the Worker, the design system package and the repo scripts. Artifacts contain content, data and custom builds, which these standards don't cover: the `artifact` skill and the Stage's contract do ([ADR 0007](docs/adr/0007-artifacts-contain-content-data-and-staged-behaviour.md)).

`pnpm check` enforces what tooling can (see the last section). This file covers what needs judgement, and `/code-review` checks every diff against it.

## Where things live

- `src/`: the platform: the artifacts collection, the pages (Library, drafts page, artifact route) and the build integrations for math, code, D2 and the checks on built pages.
- `worker/`: the Worker serving the site and the state API. `pnpm dev:worker` runs it locally behind an Access stand-in with the real HTTP transport. `pnpm dev` and `pnpm build` use throwaway state unless `PUBLIC_STATE_TRANSPORT=http` is set.

## Showing a change

Upstream's only artifact is the sample, so platform work there is shown against fixtures and the sample, and against the owner's artifacts only in the private copy. Before reviewing a platform or design system change in a real browser, read [browser-verification.md](docs/agents/browser-verification.md).

## Comments

Names and structure explain the code. A comment is only for what they can't say.

- Write no comment by default. If code seems to need one, rename or restructure it first.
- Comment a reason a reader couldn't recover from the code: a workaround for a tool's bug, an external constraint, a decision that looks wrong but isn't. Link the ADR, ticket or upstream issue when there is one.
  - Good: `// D2 fonts go in as base64: Uint8Array fails under Node.`
  - Bad: `// Save the answer` above `saveAnswer()`.
- No comments that restate the code, narrate steps or label sections.
- No JSDoc on internal functions or types. The types are the documentation.
- No history ("was X", "changed to Y", "new:"). Git holds history.
- Leftover work becomes a ticket under `.scratch/`.

**The one required kind:** doc comments on the design system package's exported components and their props. `COMPONENTS.md` is generated from them, and agents building artifacts read nothing else. Write them for that reader: what the component is for, when to use it instead of the alternatives, and what each prop does, as briefly as that allows. After changing them or a component's `Props`, run `pnpm components`, or `pnpm check` fails as `component-reference`.

## Tests

Tests exist so agents can rewrite code freely while behaviour holds. A test that can't fail for a real bug, or that fails on a harmless refactor, costs more than it gives.

- Test only at the four seams below. A new seam needs the owner's agreement, recorded here.
- Test each behaviour at exactly one seam, the one that owns it. Before adding or moving a test, or reviewing where one sits, read [test-seams.md](docs/agents/test-seams.md): what each seam owns, and what none tests.
- Assert only what an outside caller sees: exit codes and failure lines, HTTP responses, store results and events, returned summaries, and the build's deployable output. Never internal functions, intermediate files or call order.
- The build's deployable output is `dist/` and `dist-worker/`, which `wrangler deploy` ships, so a test may assert what's in them. Anything else a build writes, such as `.astro/` or `.build/`, is an intermediate file.
- Take expected values from an independent source: a literal, a worked example or the spec. Never recompute them the way the code does.
- No smoke tests: "renders", "is defined", "exports X", or "doesn't throw" with nothing else asserted. The type checker and the build already catch those.
- The only test doubles are the in-memory transport and fixtures: fixture repos, a fixture question manifest, a local D1, a local stand-in for Cloudflare's Access API, and a local stand-in for the deployed site as a visitor meets it. Our own modules are never mocked.
- A bug fix adds a test only if no existing test could have caught it, and extending the nearest existing test comes first.
- Name a test after the behaviour ("a retried answer that returns your own answer counts as saved"), never after the bug or the ticket.
- When a behaviour is removed, delete its tests.

### The four seams

1. **`pnpm check` and public repo CLIs against fixture repos** (`tests/check`). Tests run the check or relevant public CLI against fixture input and assert on exit codes, failure lines, returned reports or deployable output.
2. **The Worker's HTTP API against a local D1** (`tests/worker`), with the real migrations and a fixture question manifest.
3. **The state store's public interface over the in-memory transport** (`tests/store`), with happy-dom, seeded state and forced outcomes.
4. **The scoring module** (`tests/scoring`).

## Code

- Astro 7 is newer than your training: check the `astro-docs` MCP server before using any Astro API.
- A change to the artifact workflow or to what `pnpm check` reports updates the `artifact` skill in the same commit.
- Name things, tests included, with `GLOSSARY.md` vocabulary, as [domain.md](docs/agents/domain.md#use-the-glossarys-vocabulary) says: attempt, latest attempt, stopping point, throwaway state.
- Validate untrusted input once, at the boundary: request bodies, frontmatter through the collection schema, command arguments. Past the boundary, trust the types and add no checks for states they rule out.
- Handle errors where something can be done about them: the transports, the Worker's request handling, the check's reporter. Don't wrap internal calls in a `try` that logs and rethrows, or that swallows.
- No speculative generality: no option, parameter or abstraction for a caller that doesn't exist yet.
- Add a dependency only for what a few lines or the web platform can't do.
- A design system fix that changes a shared part, one that reaches more than one component ([SHARED_PARTS.md](design-system/SHARED_PARTS.md) lists them), names, in its ticket, the other components it reaches and checks at least one of them on its catalog page, with the same evidence it gives its own component; a fix that stays inside one component says so. A review checks that note. A `Figure` sizing fix once overflowed a `Diagram` this way.

## Enforced by tooling

`pnpm check` runs these, so reviews skip them:

- **Formatting:** Prettier with the Astro plugin.
- **ESLint:** typescript-eslint's strict and stylistic type-checked presets, and `eslint-plugin-astro`, plus:
  - no commented-out code
  - no TODO or FIXME comments
  - no `console` outside the repo scripts
  - in tests: no snapshot matchers, no `vi.mock`, and every test asserts something
- **Test placement:** Vitest runs only test files in the four seam folders, and a test file anywhere else fails the check.
- **Dead code:** knip reports unused files, exports and dependencies.
