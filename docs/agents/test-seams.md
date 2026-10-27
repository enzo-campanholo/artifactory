# Test seams

What each of the four seams in `CODING_STANDARDS.md` owns, and what none tests.

## 1. `tests/check`

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
- `pnpm probe` against the deployed site's stand-in, with fixture artifacts: each public artifact's page, the trailing-slash redirect to it and its former slugs' redirects, the favicon and the first public page's `/_astro/` files open, by status, destination and `noindex`, and a first public page naming no `/_astro/` file refused; the Library, the drafts page, the catalog and a published private artifact closed by Access's login redirect or a 401, the Library API by the login redirect only, and the favicon with them once nothing is public; a path that's off retried until it opens or the retry runs out; the custom domain taken from a filled-in `wrangler.jsonc` over `ARTIFACTORY_DOMAIN`, and refused with neither; and the origin it asks and the line it prints for each path, with what it expected and what it got
- heavy-command queue ownership/nesting, read-only status and check provenance through public fixture commands
- `scripts/verify-browser.ts`'s argument and missing-output refusals; with `ARTIFACTORY_BROWSER_ACCEPTANCE=1`, one built fixture's theme keyboard focus and toggles, media isolation, overflowing-table cues and startup notices, with broken output as negative cases

## 2. `tests/worker`

- saving an answer: first answer wins, a retry gets its own answer back, an unknown artifact or question, an attempt from another artifact, the size limit, a body that isn't JSON, and rollback of a failed save
- loading an artifact's state: every attempt with its answers, and the content hash
- the Library API: the latest-attempt rule, drafts included, artifacts without questions left out, and the build ID
- Access: a missing or invalid token, and a valid one let through

## 3. `tests/store`

- the device copy: starting from it, the first load's check, keeping it after loads and saves, and forgetting it on sign-out
- the owner mark: left by an artifact's load and saves and the Library's load, never by a failed load or throwaway state, and kept on sign-out
- loading, saving and the "saving" lifecycle, retries, sign-out, answers given on another device, refreshes, and content hash mismatches
- attempts: the latest attempt, Start over, switching attempts, and the attempts panel
- each question kind's behaviour on the page: inert until the store starts, locking, marks, self-marking an open question, and the numeric field's refusal of input that isn't a number, its locking as typed and the right answer it shows on a wrong answer
- the page's attempt: progress, where the owner stopped, Next question, and what to revisit
- state notices, the Library's statuses and what to revisit in the Library, and the theme choice

## 4. `tests/scoring`

It owns each question kind's `check`, the number syntax a numeric answer and its key are written in (refused and ambiguous input included), the numeric key's rules, and the revision rules of [ADR 0001](../adr/0001-artifact-state-stores-answers-only.md): a corrected key or tolerance rescores, self-checked marks stand, an added question reopens a finished attempt, a removed question is ignored until its ID returns, and progress and score arithmetic. Seams 2 and 3 trust it and don't repeat these cases.

## Not tested automatically

How diagrams and figures look (agents use `pnpm look`), the CI workflow, Access login and routing (what the public Access script, `scripts/public-access.ts`, actually opens on the live account, and what the live site answers `pnpm probe`; both are tested against the stand-ins above, and the probe, which CI runs after every deploy, is the check on the live site), browser accessibility (the design system checks it with impeccable), and external links.
