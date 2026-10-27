# 07: Probe from outside what is open

Status: resolved
Blocked by: [06: Keep the public Access app in step in CI](06-keep-the-public-access-app-in-step-in-ci.md)

**What to build:** `pnpm probe`, run by CI after `open` and by the owner by hand, checks from outside, with no cookies and following no redirects, that exactly the intended paths are open: each public artifact's page answers 200, its unslashed path the assets layer's 307 to it, each former slug a 301 to it, and `/favicon.svg` and the first public page's `/_astro/` files 200; `/`, `/drafts/`, `/api/library`, `/catalog/` and one private artifact answer 302 to the Access login or 401; every assets-layer response carries `noindex`. It prints one line per path and exits non-zero on any mismatch.

Specified in [Public artifacts](../spec.md): "The probe". It reads the checkout's frontmatter through `src/public-paths.ts` and the custom domain from `wrangler.jsonc`, so it runs without a build.

- A redirect is checked by its status and its destination: a 302 to the Access login on an open path is a failure. The 307 is Cloudflare's documented `auto-trailing-slash` status; if the first deploy shows otherwise, change the expected status, still checking the destination.
- A path that's off is retried for up to a minute before failing.
- With nothing public, `/favicon.svg` must be closed too.
- The `artifact` skill's Watch CI gains the Probe step (red means the new version is live but something is open or closed that shouldn't be; rerun once, then tell the owner), in the same commit. `CODING_STANDARDS.md`'s "Not tested automatically" names the probe as the check on every deploy.

- [x] `pnpm probe` checks every path the spec lists, by status and destination, and prints expected and actual per line.
- [x] CI runs it on `main` after `open`.
- [x] Shown against a local stand-in (e.g. `pnpm dev:worker`) for its pass and fail output; the live run is [08](08-share-the-first-public-artifact.md).
- [x] The `artifact` skill and `CODING_STANDARDS.md` are updated in the same commit; `pnpm check` passes.

## Comments

2026-10-23, from the review of tickets 01 and 02: `publicPaths()` in `src/public-paths.ts` returns a flat sorted list, and the probe needs more than that. It has to know which paths are former slugs and the slug each one redirects to, so it can expect a 301 to that slug's page there and a 200 on the page itself. Add that as a richer export of `src/public-paths.ts`, built from `heldSlugs` (which already carries `former` and the artifact) with the same public filter `publicPaths()` uses. Don't filter on `public` again in the probe: one filter means the probe can never disagree with the check and the manifest. That filter reads `Entry.public`, which is false for a draft.

### 2026-10-26: where this work happens (approved)

Since the repo split (commit `3b63b1b`, see `CLAUDE.md`'s "Two repos"), the upstream repo `enzo-campanholo/artifactory` holds the platform and has no `artifacts/`, and its CI only checks: `ARTIFACTORY_DOMAIN` is unset there. The private copy `enzo-campanholo/artifactory-private` holds the artifacts, the deploy variables and the secrets, `CLOUDFLARE_ACCESS_API_TOKEN` included, and its CI deploys. "On `main`" in this ticket and the spec means the private copy's main run: CI gates every step that touches Cloudflare by `github.ref == 'refs/heads/main' && vars.ARTIFACTORY_DOMAIN != ''`, as the deploy steps already are.

**Approved** (owner, T3 orchestrator thread, 2026-10-26: "let's get through them", and the landing choice "Branch, you push"): agents build tickets 06 and 07 on branch `public-access` in a checkout of the upstream repo, reviewed and committed there. The owner merges and pushes upstream `main`, then runs Sync upstream in the private copy. That sync's deploy is the first live run of the Access steps, so it stays the owner's.

Here: the probe reads artifacts from the checkout, and upstream has none. Show its pass and fail output against fixture artifacts and a local stand-in.

### 2026-10-26: from ticket 06

- Read the custom domain with `readDeployedSite(root)` from `scripts/wrangler-config.ts`: it returns `{ domain, accessAud }` from `wrangler.jsonc` and throws when CI hasn't filled in the placeholders, so the probe and `pnpm public-access` read the domain the same way. Run by hand in a checkout, `wrangler.jsonc` holds the placeholders, so the probe needs the domain some other way there (for example `ARTIFACTORY_DOMAIN`, as `scripts/deploy-config.ts` takes it); decide that here.
- CI: put the Probe step after "Open public paths" in `.github/workflows/ci.yml`, with the same `if:` gate.
- The `artifact` skill's Watch CI step 4 lists the red Close and Open steps: add Probe there. `CODING_STANDARDS.md`'s "Not tested automatically" names `scripts/public-access.ts` under Access routing: add the probe as the check on every deploy.
- `tests/check/access-api-stand-in.ts` shows a local HTTP stand-in driven by a seam 1 test, if the probe is tested the same way.

### 2026-10-26: where the probe gets the domain (approved)

Owner, T3 orchestrator thread, 2026-10-26: the probe reads the custom domain from `wrangler.jsonc` when it's filled in, as in CI, and otherwise from an `ARTIFACTORY_DOMAIN` environment variable. With neither, it fails and names both, e.g. `ARTIFACTORY_DOMAIN=$(gh variable get ARTIFACTORY_DOMAIN) pnpm probe`. The probe never calls `gh` itself.

### 2026-10-26: handoff

Owner: the implementation sub-agent the coordinator's T3 thread started for ticket 07; no delegated agents.
Where: the upstream checkout, branch `public-access`, HEAD `b8a4ab9` (the probe), plus the commit carrying this comment. Not pushed.
Done: `scripts/probe.ts` (`pnpm probe`), `publicSlugs()` in `src/public-paths.ts` (the one public filter, which `publicPaths()` now calls too), `Entry.draft` in `src/artifacts.ts`, the Probe step after Open public paths in `.github/workflows/ci.yml` under the deploy steps' gate, the `artifact` skill's Watch CI, `CODING_STANDARDS.md` (seam 1's list, the allowed test doubles and "Not tested automatically"), the spec's "The probe" and Testing Decisions, and `README.md`'s step 7, all in `b8a4ab9`. Shown by `tests/check/probe.test.ts` (13 tests, seam 1) against `tests/check/site-stand-in.ts` with fixture artifacts (a public one with a former slug, a published private one, a draft): the full pass printed line by line; a former slug redirecting to another host, a 301 where the trailing-slash 307 belongs, a 302 to the Access login on an open path, an `/_astro/` file left closed, a page without `noindex`, a private artifact open and the Library open, each failing with exactly its one `OFF` line; nothing public, with the favicon expected closed; a path that opens on its second ask within the retry budget, and one still off when the budget runs out; the domain taken from a filled-in `wrangler.jsonc` over `ARTIFACTORY_DOMAIN`, and refused with neither or with a URL in place of a hostname. Mutating the `noindex` check, the destination check, the draft filter and the retry made 7 tests red. Pass and fail output against the stand-in and against `wrangler dev`'s assets layer, run once by hand from a fixture repo, are in the sub-agent's final message. Check: the full plain `pnpm check` runs on the final HEAD after this comment; its result is in that message.
Partial: none. Findings: none due.
Decisions:

- The domain: [where the probe gets the domain (approved)](#2026-10-26-where-the-probe-gets-the-domain-approved). `ARTIFACTORY_DOMAIN` must be a bare hostname.
- Where this work happens: [approved](#2026-10-26-where-this-work-happens-approved).
- Unresolved, for the owner: the deployed site's stand-in is a new allowed test double in `CODING_STANDARDS.md`, the way the [owner's ticket 06 decision](06-keep-the-public-access-app-in-step-in-ci.md#2026-10-26-review-of-e2c3c37-and-the-owners-decisions) allowed the Access API stand-in, and as the coordinator's brief asked. If the owner refuses it, the tests and the standards line go and the probe is left untested, as the spec first said. That blocks only closing 07.
- Not settled by the spec, decided here:
  - Access's login is recognized by its `Location` path, `/cdn-cgi/access/login`, on any host, since the probe doesn't know the team domain without a filled-in `wrangler.jsonc`.
  - A `Location` is resolved against `https://<domain><path>` before it's compared, so a relative and an absolute redirect to the same page both pass, and one to another host fails.
  - `noindex` is asked of every open path's answer, the 301s and the 307 included, as "The probe" says. 08 settles whether Cloudflare sends it on the 301s.
  - "One published private artifact" is the first artifact, by entry file, that is neither public nor a draft.
  - The `/_astro/` files are every `/_astro/…` the first public page's HTML names, and the first public page is the first public artifact's, by entry file.
  - A path that's off is asked again every 5 seconds until a minute has passed since the probe started. `ARTIFACTORY_PROBE_RETRY_MS` shortens that and `ARTIFACTORY_PROBE_ORIGIN` points the probe at a stand-in; the tests set both and CI sets neither.
  - A 401 on a closed path passes whoever sends it: on `wrangler dev`, `/api/library`'s came from the Worker.

Running: none. Next: the coordinator's review of `7ea260f..HEAD`.

### 2026-10-26: review of b8a4ab9 and the owner's decisions

Two-axis review (Standards and Spec) of `7ea260f...0419cae`. The probe's open set matches `publicPaths()` and what `scripts/public-access.ts` opens. The CI gate, the single public filter and the domain order follow the approved comments.

**Approved** (owner, T3 orchestrator thread, 2026-10-26): keep the site stand-in as an allowed test double in `CODING_STANDARDS.md`, with the probe's tests. Only the live run stays untested.

**Accepted findings, due in the fix round:**

1. `/api/library` passes only on a 302 to the Access login. A 401 there can come from the Worker itself (`worker/index.ts`), so it would hide an Access Bypass on the state API. The other closed paths keep "302 to the Access login or 401".
2. A first public page whose 200 names no `/_astro/` file is an `OFF` line, not a pass.
3. The probe prints the origin it actually asks, so a stray `ARTIFACTORY_PROBE_ORIGIN` can't pass as the live domain.
4. The handoff's three questions for the first live run (the trailing-slash status, `noindex` on the 301s and the 307, the form of Access's login redirect) become an Unresolved item: the owner decides at the first live run in 08, and it blocks only closing 08. Link 08's comment. `Decisions:` links this comment, and `Done:` gives the check's scope and applicability.
5. The CI Probe comment gives a reason or goes. In the skill, step 4 stops saying the later steps "set what's open" for the Probe, and the `OFF` lines are explained once.
6. Smells: one local for the draft value in `src/artifacts.ts`; `messageOf` shared with `scripts/public-access.ts`; one `isClosed(answer)` for both uses; `held` and `firstPage` renamed for what they hold; the `/_astro/` discovery out of the retry loop, with predicates taking the answer as an argument.

**Not taken:** checking `/_astro/` closed when nothing is public. With nothing public there's no page to name its files, and the ticket names only the favicon.

**Coordinator's edit:** `0419cae` replaced the local checkout path in the `Where:` lines of 06's and 07's handoffs with "the upstream checkout", since everything committed upstream is public. The handoffs are otherwise unchanged.

### 2026-10-26: handoff (fix round)

Owner: the implementation sub-agent the coordinator's T3 thread started for 07's fix round; no delegated agents.
Where: the upstream checkout, branch `public-access`, HEAD `e0d98e3` (the fixes), plus the commit carrying this comment. Not pushed.
Done: every accepted finding of [the review](#2026-10-26-review-of-b8a4ab9-and-the-owners-decisions), in `e0d98e3`, with the docs that describe them:

1. `/api/library` passes only on a 302 to the Access login; the other closed paths keep "302 to the Access login or 401". Test: "fails the Library API answering 401, which only the Worker sends past Access", red before the change; the passing fixture now answers the Library API with the login redirect and the catalog with a 401, so a 401 still passes where Access may send it.
2. The first public page expects "200 with noindex and /_astro/ files", and one naming none is `OFF`. Test: "fails a first public page that names no /_astro/ file, leaving no file to check", red before the change (it passed with exit 0).
3. The first line names the origin the probe asks: `Probing https://<domain> from outside, …`, or `Probing <domain> at <origin>, from outside, …` when `ARTIFACTORY_PROBE_ORIGIN` points elsewhere. Test: the passing run's first line, red before the change; the retry, nothing-public and `wrangler.jsonc` tests assert it too.
4. This comment, and [08's](08-share-the-first-public-artifact.md#2026-10-26-from-ticket-07s-fix-round).
5. The CI Probe step's comment is gone (the step's name and place say what it would). The skill's Watch CI step 4 says the steps after the check "deploy the site, set what's open, then probe from outside what is", the Probe bullet names an artifact going public still behind the sign-in or one going private still open, and the `OFF` lines are explained once, where the rerun paragraph says what to give the owner.
6. `readEntry` reads the draft value into one local; `messageOf` lives in `scripts/error-message.ts` for the probe and `pnpm public-access`; `isAccessLogin(answer)` serves both the closed check and the answer's description (one `isClosed` no longer fits, since after finding 1 what closes a path depends on the path); `held` is `openSlugs` and `firstPage` is `firstPublicPage`, the page's path; the `/_astro/` files are found from the first public page's answer once the first round of asking ends, then asked with the same deadline, and `answersAsExpected` and `astroFiles` take the answer as an argument.

The spec's "The probe" and `CODING_STANDARDS.md`'s seam 1 list follow. `tests/check/probe.test.ts` has 15 tests against the site stand-in, all passing. Check: the full plain `pnpm check` passed on `e0d98e3` with 0 failures, `current` there; the run on the HEAD carrying this comment is in the sub-agent's final message.
Partial: none. Findings: none due.
Decisions:

- The review, the site stand-in's approval and what wasn't taken: [review of b8a4ab9 and the owner's decisions](#2026-10-26-review-of-b8a4ab9-and-the-owners-decisions).
- The domain: [approved](#2026-10-26-where-the-probe-gets-the-domain-approved). Where this work happens: [approved](#2026-10-26-where-this-work-happens-approved).
- Unresolved, for the owner at 08's first live run, blocking only closing 08: the trailing-slash status, `noindex` on the 301s and the 307, and the form of Access's login redirect ([08's comment](08-share-the-first-public-artifact.md#2026-10-26-from-ticket-07s-fix-round)).
- Not settled by the spec: the [first handoff's](#2026-10-26-handoff) choices stand, except that a 401 on `/api/library` now fails and the first public page must name an `/_astro/` file.

Running: none. Next: the coordinator's review of `414dc4a..HEAD`.

### 2026-10-26: closed

**Result:** `pnpm probe` checks from outside, by status and destination, that exactly the public paths are open and the rest closed, one expected/actual line per path, and CI runs it on the private copy's `main` after Open. `/api/library` passes only on a 302 to the Access login. Commits on `public-access`: `b8a4ab9` (the probe), `e0d98e3` (the review fixes), with handoffs `a46ba5f` and `1e777f8`.

**Validation:** 15 tests at seam 1 in `tests/check/probe.test.ts` against the site stand-in, each review fix shown red first; pass and fail output against a stand-in and `wrangler dev` quoted in the first handoff; the full plain `pnpm check` passed on `1e777f8`, applicability `current`.

**Review:** two-axis review recorded above; every accepted finding and the approval are applied. Accepted deviation: one `isAccessLogin(answer)` instead of `isClosed(answer)`, since after finding 1 what counts as closed depends on the path.

**Left undone:** the live run, and the three questions it settles (Unresolved above), are [08](08-share-the-first-public-artifact.md)'s. Nothing is pushed: the owner merges and pushes upstream `main`, per the approved landing.
