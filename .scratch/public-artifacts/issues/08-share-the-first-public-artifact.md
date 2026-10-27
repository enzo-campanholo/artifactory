# 08: Share the first public artifact

Status: ready-for-human
Blocked by: [07: Probe from outside what is open](07-probe-from-outside-what-is-open.md)

**What to build:** the first real public share, end to end. The owner names a published artifact; an agent makes it public through the `artifact` skill's Make public workflow; the owner pushes `main` and watches the deploy; then the owner opens the link in a private window and on a signed-in phone and runs `pnpm probe`. This settles what the research left unconfirmed.

Specified in [Public artifacts](../spec.md): "Checked by hand before the first artifact goes public" and "Unconfirmed in the research".

- Before the push, on `pnpm dev:worker`: the artifact shows the owner's page and saves; with the owner mark removed, the visitor's page, no `/api/` request, answers gone on reload. Judge the first paint on a built page.
- Agents never push or deploy here; the owner does. A `/wizard` script may guide the owner through the push, the run and the checks.

- [ ] The hand check on `pnpm dev:worker` passes (agent, recorded here).
- [ ] After the owner's deploy: the private window shows the visitor's page, the phone the owner's and saves, and `pnpm probe` passes (owner).
- [ ] Recorded here: whether `_headers` reaches the 301s, and the trailing-slash redirect's status; the probe and spec are corrected if either differs.

## Comments

### 2026-10-26: where this work happens (approved)

Since the repo split (commit `3b63b1b`, see `CLAUDE.md`'s "Two repos"), the upstream repo `enzo-campanholo/artifactory` holds the platform and has no `artifacts/`, and its CI only checks: `ARTIFACTORY_DOMAIN` is unset there. The private copy `enzo-campanholo/artifactory-private` holds the artifacts, the deploy variables and the secrets, `CLOUDFLARE_ACCESS_API_TOKEN` included, and its CI deploys. "On `main`" in this ticket and the spec means the private copy's main run: CI gates every step that touches Cloudflare by `github.ref == 'refs/heads/main' && vars.ARTIFACTORY_DOMAIN != ''`, as the deploy steps already are.

**Approved** (owner, T3 orchestrator thread, 2026-10-26: "let's get through them", and the landing choice "Branch, you push"): agents build tickets 06 and 07 on branch `public-access` in a checkout of the upstream repo, reviewed and committed there. The owner merges and pushes upstream `main`, then runs Sync upstream in the private copy. That sync's deploy is the first live run of the Access steps, so it stays the owner's.

Here: everything in this ticket runs in the private copy (Make public, the hand check on `pnpm dev:worker`, the push and `pnpm probe`), and its record goes on this ticket in the upstream checkout. Once the artifact is public, naming it here is fine.

### 2026-10-26: from ticket 06

The first live run of `pnpm public-access` settles what the Access API stand-in couldn't: whether the list endpoints honour `name`, `exact` and `aud`, whether an app in the list carries its `policies`, and whether the reusable Bypass deletes right after its app. Read the Close and Open steps' logs on that run, and record here what differed. Ticket 06's [fix-round handoff](06-keep-the-public-access-app-in-step-in-ci.md#2026-10-26-handoff-fix-round) holds the full list.

### 2026-10-26: from ticket 07

- **The probe by hand.** In the private copy's checkout, after the deploy's Probe step: `ARTIFACTORY_DOMAIN=$(gh variable get ARTIFACTORY_DOMAIN) pnpm probe`. It prints one line per path, `ok` or `OFF`, with what it expected and what it got, retries what's off for a minute, and exits 1 on any `OFF`. `wrangler.jsonc` holds its placeholders in a checkout, so the domain comes from the variable; in CI it comes from the filled-in `wrangler.jsonc`.
- **What the first live run settles,** read off the Probe step's log or the hand run:
  - the trailing-slash redirect's status: the probe expects 307 on `/<slug>`. If it gets another, change the status in `scripts/probe.ts`, the literals in `tests/check/probe.test.ts` and the spec's "The probe", still checking the destination.
  - whether `_headers` reaches the 301s of former slugs and the 307: the probe asks `noindex` of both. If either lacks it, the probe asks it of the 200s only, as the spec's "Unconfirmed in the research" says.
  - the form of Access's login redirect: the probe takes any 302 whose `Location` path starts `/cdn-cgi/access/login` as the login. An `OFF` line saying "got 302 to https://…" on a closed path means the login's form differs.
  - whether Access answers 302 or 401 on `/api/library`: either passes.
- **Local evidence, not proof:** run once against `wrangler dev` (no Access in front) from a fixture repo, the local assets layer answered `/<slug>` with 307 to `/<slug>/` and each former slug with 301, every answer carrying `noindex`. The live edge may differ.
