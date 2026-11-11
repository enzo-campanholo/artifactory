# Test seams

What each of the five seams in `CODING_STANDARDS.md` owns, and what none tests.

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
- an MDX syntax error at its line; every broken component rule in one run as `component-rule`, each at its own tag, found by the name the entry imports the component as: a Stage, a `Matching` and a `Figure` naming every rule they break in one line, two Stages in one entry, an imported drawing's own rules at the `Figure`, figure `Stepper` or Stage that draws it, the entry's start when the entry's tags and the page's components of that kind don't count the same, and the config, as a platform change, on a page that isn't an artifact's
- a numeric question's key that can't work failing as `component-rule`, with the scoring module's reason
- html-validate failures mapped to the source, an entry that isn't `index.mdx`, and the build's warnings
- a stale component reference, unformatted code, unused files and misplaced tests
- every failure in one run, the closing block, skipped built-output steps after a failed build, or only for the artifacts with a broken component when that is all that failed, and no question manifest, public paths manifest or build ID after one
- running Vitest only when a file the tests read changed since the last commit that passed
- running a step again only once a file it reads has changed since it passed, with a failed step run every time
- the built site: the Library and drafts page and the eye in their running head, "Public" on a public artifact's Library row and on no other row, an artifact masthead's back link, date line and eye, the remembered theme applied in every page's head (the 404's included) and no eye on the 404, the first screen's fonts preloaded in every page's head (the 404's included) as the files its stylesheets name, a public artifact's page (its public marker, back link, visitor's line and signed-out link to the Library, none of which a private page has) and the viewer its head decides from the owner mark, with none decided on a private page, rendered math, code, tables, diagrams, figures and images, the question manifest, the Library questions block (each listed artifact's question numbers and sections, in the list's order), content hashes, the build ID, redirects for former slugs, the public paths manifest, the `noindex` header rule with no `robots.txt`, and an empty Library passing with no public paths
- holding an artifact page's first paint until its scripts have run, and the Library's only until its list is parsed
- `pnpm new` and `pnpm rename`
- `pnpm public-access` against the Access API stand-in: `open` creating the public app with its Bypass for everyone, replacing its whole list and repairing hand edits, and refusing to open anything without the protected app, with its Cookie Path Attribute on, or with the Bypass on it; `close` keeping only what stays public and adding nothing; both repairing a Bypass that isn't a bypass for everyone; the app and its Bypass deleted once nothing is public, with a Bypass another app uses kept and the run failing; a manifest path that could reach `/api`, wildcards included, refused, by `open` before any change and by `close` after taking away what isn't public; a missing manifest or a `wrangler.jsonc` still holding its placeholders refused, `close` first deleting the public app; and the destinations it prints as removed and added
- `pnpm probe` against the deployed site's stand-in, with fixture artifacts: each public artifact's page, the trailing-slash redirect to it and its former slugs' redirects, the favicon and the first public page's `/_astro/` files open, by status, destination and `noindex`, and a first public page naming no `/_astro/` file refused; the Library, the drafts page, the catalog and a published private artifact closed by Access's login redirect or a 401, the Library API by the login redirect only, and the favicon with them once nothing is public; a path that's off retried until it opens or the retry runs out; the custom domain taken from a filled-in `wrangler.jsonc` over `ARTIFACTORY_DOMAIN`, and refused with neither; and the origin it asks and the line it prints for each path, with what it expected and what it got
- heavy-command queue ownership/nesting, read-only status and check provenance through public fixture commands
- `scripts/verify-browser.ts`'s argument and missing-output refusals; with `ARTIFACTORY_BROWSER_ACCEPTANCE=1`, one built fixture's theme keyboard focus and toggles, media isolation, overflowing-table cues and startup notices, with broken output as negative cases
- `pnpm look`, with `ARTIFACTORY_BROWSER_ACCEPTANCE=1`, against fixture artifacts: a Stage shot as written and at every step of its first option, or of the first option of every group, the line printed under it, a refusal recorded and a stuck forward failing; code Steppers shot at every step, their captions printed in place of an `alt`; a figure inside a model answer revealed, named by its question and closed again; figures inside a `SingleChoice`'s, a `NumericQuestion`'s and a matching's explanation shot once look locks the question or the set, named by it, with nothing saved; the bottom bar hidden for every shot and shown again after; every item look can't shoot (unrendered when its turn comes, or a Stepper form it doesn't know) failing the case by name; and the closing line of an artifact with nothing to shoot

## 2. `tests/worker`

- saving an answer: first answer wins, a retry gets its own answer back, an unknown artifact or question, an attempt from another artifact, the size limit, a body that isn't JSON, and rollback of a failed save
- loading an artifact's state: every attempt with its answers, and the content hash
- the Library API: the latest-attempt rule, drafts included, artifacts without questions left out, and the build ID
- Access: a missing or invalid token, and a valid one let through
- the store's HTTP transports, through global `fetch` routed to the Worker: a load `loaded` with the attempts and answers saved before it, `signed out` without a token and `failed` for an unknown artifact; a save `saved` with the answer, `already answered` with the first answer, `signed out` without a token and `failed` for a question the manifest doesn't have; and the Library's load `loaded` with the latest attempts' summaries and `signed out` without a token. The raw-request cases above own the status codes, and seam 3 trusts these outcomes.

## 3. `tests/store`

A question test mounts its component's own markup: `rendered-question.ts` renders a small `.mdx` fixture with Astro's Container API, through the site's Markdown pipeline, and mounts it under happy-dom. A file that renders runs in node, since Astro won't render under a DOM environment, and gets its page from that module. `minimal-question.ts` is the one exception: it defines its own minimal element to test the store, and copies no component.

- the device copy: starting from it, the first load's check, keeping it after loads and saves, and forgetting it on sign-out
- the owner mark: left by an artifact's load and saves and the Library's load, never by a failed load or throwaway state, and kept on sign-out
- loading, saving and the "saving" lifecycle, retries, sign-out, answers given on another device, refreshes, and content hash mismatches
- attempts: the latest attempt, Start over, switching attempts, and the attempts panel
- each question kind's behaviour on the page: inert until the store starts, locking, marks, self-marking an open question, and the numeric field's refusal of input that isn't a number, its locking as typed and the right answer it shows on a wrong answer
- the page's attempt: progress, where the owner stopped, Next question, and what to revisit
- state notices, the Library's statuses and the text of each row's status ("Finished", "In progress · N of M answered", or none before the first answer), painted from this device's copy and from the load, what to revisit in the Library, and the theme choice

## 4. `tests/scoring`

It owns each question kind's `check`, the number syntax a numeric answer and its key are written in (refused and ambiguous input included), the numeric key's rules, and the revision rules of [ADR 0001](../adr/0001-artifact-state-stores-answers-only.md): a corrected key or tolerance rescores, self-checked marks stand, an added question reopens a finished attempt, a removed question is ignored until its ID returns, and progress and score arithmetic. Seams 2 and 3 trust it and don't repeat these cases.

## 5. `tests/stepping`

The Stage and the Stepper on a built page, under happy-dom. Each test file builds one small fixture repo with `tests/check/fixture-repo.ts`, opens one built page with its shipped scripts, and drives it as the owner would, finding each control by its role and accessible name, never by a class.

- a Stage with one choice: the prompt and no step counted before a choice, then at each step the counter, the line that says it, the announcement, the marks on drawn parts, and the cells it rewrites and gives back; a drawn part named like an option choosing it
- choice groups: the run waiting for a choice in every group, and running again from step 1 when either group changes
- typed input: the first example run from the fields as they open, the line each step runs marked and announced, and a number or text that breaks its field's rule refused at that field (`aria-invalid`, the focus, and the rule in the step's line)
- a refused run: the refusal said and announced, no step counted, and both buttons refused
- steps that colour parts: each part's swatch and its colour's name at each step, going back included
- the step row on a Stage, a code Stepper, a one-block Stepper and a figure Stepper: the buttons and the left and right arrow keys, both ends refusing to go further with `aria-disabled`, and the buttons usable once the element connects
- a Stepper's announcement: its step, a code block's marked lines and its caption; a one-block Stepper's lit lines; a figure Stepper's parts at each step

Seam 1 keeps every failure line for a build's steps, the printed steps in the built page, and `pnpm look`.

## Not tested automatically

Whether `pnpm look`'s shots read well (agents judge each one against its `alt` or caption), the CI workflow, Access login and routing (what the public Access script, `scripts/public-access.ts`, actually opens on the live account, and what the live site answers `pnpm probe`; both are tested against the stand-ins above, and the probe, which CI runs after every deploy, is the check on the live site), browser accessibility (the design system checks it with impeccable), and external links.

Under happy-dom, `tests/stepping` can't reach these, so `pnpm look` and the catalog are the check on them:

- a D2 Stepper's stepping: happy-dom reads only the first of its boards. It shares its element with the code and figure Steppers, which are tested.
- what the page's styles do to a Stage or a Stepper: happy-dom applies none of the page's stylesheets, which sit in cascade layers. So which of a rewritten cell's two texts shows on screen (the step's, with the content as written kept beside it for print), and how the marks and swatches look, aren't tested.
- a colouring's cross-fade from one swatch to the next: the tests open the page with reduced motion, since happy-dom rejects every animation the fade cancels, and nothing handles the rejection.
- the size and place of a drawn part's hit area: happy-dom lays nothing out, so a part's box is empty. Choosing by clicking the part is tested.
