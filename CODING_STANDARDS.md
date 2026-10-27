# Coding standards

These cover the platform, the Worker, the design system package and the repo scripts. Artifacts contain content, data and custom builds, which these standards don't cover: the `artifact` skill and the Stage's contract do ([ADR 0007](docs/adr/0007-artifacts-contain-content-data-and-staged-behaviour.md)).

`pnpm check` enforces what tooling can (see the last section). This file covers what needs judgement, and `/code-review` checks every diff against it.

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

**The one required kind:** doc comments on the design system package's exported components and their props. `COMPONENTS.md` is generated from them, and agents building artifacts read nothing else. Write them for that reader: what the component is for, when to use it instead of the alternatives, and what each prop does, as briefly as that allows.

## Tests

Tests exist so agents can rewrite code freely while behaviour holds. A test that can't fail for a real bug, or that fails on a harmless refactor, costs more than it gives.

- Test only at the four seams below. A new seam needs the owner's agreement, recorded here.
- Test each behaviour at exactly one seam, the one listed for it below.
- Assert only what an outside caller sees: exit codes and failure lines, HTTP responses, store results and events, returned summaries, and the build's deployable output. Never internal functions, intermediate files or call order.
- The build's deployable output is `dist/` and `dist-worker/`, which `wrangler deploy` ships, so a test may assert what's in them. Anything else a build writes, such as `.astro/` or `.build/`, is an intermediate file.
- Take expected values from an independent source: a literal, a worked example or the spec. Never recompute them the way the code does.
- No smoke tests: "renders", "is defined", "exports X", or "doesn't throw" with nothing else asserted. The type checker and the build already catch those.
- The only test doubles are the in-memory transport and fixtures: fixture repos, a fixture question manifest, a local D1, a local stand-in for Cloudflare's Access API, and a local stand-in for the deployed site as a visitor meets it. Our own modules are never mocked.
- A bug fix adds a test only if no existing test could have caught it, and extending the nearest existing test comes first.
- Name a test after the behaviour, in `GLOSSARY.md` vocabulary ("a retried answer that returns your own answer counts as saved"), never after the bug or the ticket.
- When a behaviour is removed, delete its tests.

### The four seams

1. **`pnpm check` and public repo CLIs against fixture repos** (`tests/check`). Tests run the check or relevant public CLI against fixture input and assert on exit codes, failure lines, returned reports or deployable output. It owns:
   - the frontmatter schema, a draft marked public included (refused, and counting no Access destinations), and the type checks skipped when content couldn't sync
   - artifact ID format and uniqueness, slug and former-slug clashes (reserved routes included), subject spellings, and public paths beyond one Access app's destinations
   - the content-only rule: allowed imports, files beside the entry, styles and scripts
   - the Stage and custom builds: files, imports, the build's types, and every option and example run against the built page, with the tables as written checked against the first example's result
   - Temml, Shiki and D2 failures at their source positions, a stepper with too few boards, and a missing `alt` failing the type checks
   - question IDs: kebab-case and unique within an artifact
   - statements: the clause number each takes beside paragraphs and h3s, the label naming its group and its citations' text and link, in both languages; statement IDs kebab-case and unique within an artifact and found by the name the entry imports `Statement` as, a statement before the first section, in a list or in a question, and a citation of no statement
   - proofs: the opening of one right after its statement and of one elsewhere, with its statement's label, number and link, and its end square, in both languages; the mark that only a proof right after its own statement carries, a proof right after another statement included; the end square on a closing list's last item; a proof of no statement, of a definition or of an example
   - examples: an example's number, label and solution, shown openly after its run-in label, in both languages; an example without a solution, and any other statement with a `---`
   - internal links and anchors, with links to former slugs failing
   - an MDX syntax error at its line, and a component's own error at its artifact's entry, at the component when the entry has only one of that name
   - a numeric question's key that can't work failing as `build`, with the scoring module's reason
   - html-validate failures mapped to the source, an entry that isn't `index.mdx`, and the build's warnings
   - a stale component reference, unformatted code, unused files and misplaced tests
   - every failure in one run, the closing block, skipped built-output steps after a failed build, and no question manifest, public paths manifest or build ID after one
   - running Vitest only when a file the tests read changed since the last commit that passed
   - the built site: the Library and drafts page and the eye in their running head, "Public" on a public artifact's Library row and on no other row, an artifact masthead's back link, date line and eye, the remembered theme applied in every page's head (the 404's included) and no eye on the 404, a public artifact's page (its public marker, back link, visitor's line and signed-out link to the Library, none of which a private page has) and the viewer its head decides from the owner mark, with none decided on a private page, rendered math, code, tables, diagrams, figures and images, the question manifest, the Library questions block (each listed artifact's question numbers and sections, in the list's order), content hashes, the build ID, redirects for former slugs, the public paths manifest, the `noindex` header rule with no `robots.txt`, and an empty Library passing with no public paths
   - holding an artifact page's first paint until its scripts have run
   - `pnpm new` and `pnpm rename`
   - `pnpm public-access` against the Access API stand-in: `open` creating the public app with its Bypass for everyone, replacing its whole list and repairing hand edits, and refusing to open anything without the protected app, with its Cookie Path Attribute on, or with the Bypass on it; `close` keeping only what stays public and adding nothing; both repairing a Bypass that isn't a bypass for everyone; the app and its Bypass deleted once nothing is public, with a Bypass another app uses kept and the run failing; a manifest path that could reach `/api`, wildcards included, refused, by `open` before any change and by `close` after taking away what isn't public; a missing manifest or a `wrangler.jsonc` still holding its placeholders refused, `close` first deleting the public app; and the destinations it prints as removed and added
   - `pnpm probe` against the deployed site's stand-in, with fixture artifacts: each public artifact's page, the trailing-slash redirect to it and its former slugs' redirects, the favicon and the first public page's `/_astro/` files open, by status, destination and `noindex`; the Library, the drafts page, the Library API, the catalog and a published private artifact closed by Access's login redirect or a 401, and the favicon with them once nothing is public; a path that's off retried until it opens or the retry runs out; the custom domain taken from a filled-in `wrangler.jsonc` over `ARTIFACTORY_DOMAIN`, and refused with neither; and the line it prints for each path, with what it expected and what it got
   - heavy-command queue ownership/nesting, read-only status and check provenance through public fixture commands
   - `scripts/verify-browser.ts`'s argument and missing-output refusals; with `ARTIFACTORY_BROWSER_ACCEPTANCE=1`, one built fixture's theme keyboard focus and toggles, media isolation, overflowing-table cues and startup notices, with broken output as negative cases
2. **The Worker's HTTP API against a local D1** (`tests/worker`), with the real migrations and a fixture question manifest. It owns:
   - saving an answer: first answer wins, a retry gets its own answer back, an unknown artifact or question, an attempt from another artifact, the size limit, a body that isn't JSON, and rollback of a failed save
   - loading an artifact's state: every attempt with its answers, and the content hash
   - the Library API: the latest-attempt rule, drafts included, artifacts without questions left out, and the build ID
   - Access: a missing or invalid token, and a valid one let through
3. **The state store's public interface over the in-memory transport** (`tests/store`), with happy-dom, seeded state and forced outcomes. It owns:
   - the device copy: starting from it, the first load's check, keeping it after loads and saves, and forgetting it on sign-out
   - the owner mark: left by an artifact's load and saves and the Library's load, never by a failed load or throwaway state, and kept on sign-out
   - loading, saving and the "saving" lifecycle, retries, sign-out, answers given on another device, refreshes, and content hash mismatches
   - attempts: the latest attempt, Start over, switching attempts, and the attempts panel
   - each question kind's behaviour on the page: inert until the store starts, locking, marks, self-marking an open question, and the numeric field's refusal of input that isn't a number, its locking as typed and the right answer it shows on a wrong answer
   - the page's attempt: progress, where the owner stopped, Next question, and what to revisit
   - state notices, the Library's statuses and what to revisit in the Library, and the theme choice
4. **The scoring module** (`tests/scoring`). It owns each question kind's `check`, the number syntax a numeric answer and its key are written in (refused and ambiguous input included), the numeric key's rules, and the revision rules of [ADR 0001](docs/adr/0001-artifact-state-stores-answers-only.md): a corrected key or tolerance rescores, self-checked marks stand, an added question reopens a finished attempt, a removed question is ignored until its ID returns, and progress and score arithmetic. Seams 2 and 3 trust it and don't repeat these cases.

Not tested automatically: how diagrams and figures look (agents use `pnpm look`), the CI workflow, Access login and routing (what the public Access script, `scripts/public-access.ts`, actually opens on the live account, and what the live site answers `pnpm probe`; both are tested against the stand-ins above, and the probe, which CI runs after every deploy, is the check on the live site), browser accessibility (the design system checks it with impeccable), and external links.

The browser acceptance above runs only with `ARTIFACTORY_BROWSER_ACCEPTANCE=1`: `ARTIFACTORY_BROWSER_ACCEPTANCE=1 pnpm exec vitest run tests/check/browser-verification.test.ts`. Real screen readers and physical devices stay outside it.

### Verifying browser behaviour

To review a platform or design system change in a real browser, build first, then run `node scripts/verify-browser.ts <artifact-slug> [--dist <built-directory>]` (`--help` lists its cases). It serves the built output and never builds, so the build must include `/catalog/eye/` and an artifact of your own, made with `pnpm new`, that has questions and a table that overflows at 393 px. It writes `.look/<slug>/browser/results.json` and a contact sheet. Exit 0 means every required assertion passed, 2 a bad argument or missing build, and 1 a failed, unavailable or unsupported case. Its output hashes identify the files it inspected, not the commit that built them, and its captures still need a person to judge them.

## Code

- Name things with `GLOSSARY.md` vocabulary: attempt, latest attempt, stopping point, throwaway state.
- Validate untrusted input once, at the boundary: request bodies, frontmatter through the collection schema, command arguments. Past the boundary, trust the types and add no checks for states they rule out.
- Handle errors where something can be done about them: the transports, the Worker's request handling, the check's reporter. Don't wrap internal calls in a `try` that logs and rethrows, or that swallows.
- No speculative generality: no option, parameter or abstraction for a caller that doesn't exist yet.
- Don't add a dependency for what a few lines or the web platform already do.

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
