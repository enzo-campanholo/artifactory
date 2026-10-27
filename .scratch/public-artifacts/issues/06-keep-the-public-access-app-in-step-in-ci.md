# 06: Keep the public Access app in step in CI

Status: claimed

**What to build:** on `main`, CI keeps a second Access app, with one Bypass/Everyone policy, exactly in step with the build's public paths: `pnpm public-access close` before the migrations and the deploy keeps only what's open now and still public, and `pnpm public-access open` after the deploy sets exactly the new manifest. Every failure leaves the site locked, every run replaces the whole list so a rerun repairs drift, and the app is deleted when nothing is public. From here the owner can ask an agent to make an artifact public or private.

Specified in [Public artifacts](../spec.md): "The public Access script", "CI" and "Docs and the `artifact` skill".

- The script calls Cloudflare's Access API with `fetch`, no SDK. Inputs: the manifest, the custom domain from `wrangler.jsonc`'s route (filled in from the `ARTIFACTORY_DOMAIN` variable, so run it after CI's fill-in step), `ACCESS_AUD`, `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_ACCESS_API_TOKEN` (the deploy steps keep `CLOUDFLARE_API_TOKEN`). It finds the public app by a fixed name, refuses any path under `/api/`, and prints what it removed and added.
- `open` first finds the protected app by its AUD and fails if it's missing or its Cookie Path Attribute is on.
- Branch runs do none of this. The existing `deploy` concurrency group keeps runs from interleaving.
- The `artifact` skill, in the same commit: Authority (public or private only when the owner asks, naming it), the Make public and Make private workflows and their replies, Rename (former slugs stay open while public, two destinations each), and Watch CI (a red Close means nothing was deployed; a red Open means the new version is live but some public pages may still be locked; rerun once, then tell the owner).
- `README.md`: "How it works" stops saying Access keeps the whole site private; "Deploying your own" adds the Access steps, the token and the owner's checks. `CODING_STANDARDS.md`'s "Not tested automatically" names the script under Access routing.
- Don't run `open` or `close` against the live account from an agent session: the first live run is the owner's ([08](08-share-the-first-public-artifact.md)).

- [ ] `close` and `open` behave as the spec's "The public Access script" says, including create, replace and delete, shown with a dry run against recorded API responses or a local stand-in.
- [ ] `.github/workflows/ci.yml` on `main` runs close, migrations, deploy and open in that order, with the right secrets per step; branch runs are unchanged.
- [ ] The `artifact` skill, `README.md` and `CODING_STANDARDS.md` are updated in the same commit; `pnpm check` passes.

## Comments

### 2026-10-26: where this work happens (approved)

Since the repo split (commit `3b63b1b`, see `CLAUDE.md`'s "Two repos"), the upstream repo `enzo-campanholo/artifactory` holds the platform and has no `artifacts/`, and its CI only checks: `ARTIFACTORY_DOMAIN` is unset there. The private copy `enzo-campanholo/artifactory-private` holds the artifacts, the deploy variables and the secrets, `CLOUDFLARE_ACCESS_API_TOKEN` included, and its CI deploys. "On `main`" in this ticket and the spec means the private copy's main run: CI gates every step that touches Cloudflare by `github.ref == 'refs/heads/main' && vars.ARTIFACTORY_DOMAIN != ''`, as the deploy steps already are.

**Approved** (owner, T3 orchestrator thread, 2026-10-26: "let's get through them", and the landing choice "Branch, you push"): agents build tickets 06 and 07 on branch `public-access` in a checkout of the upstream repo, reviewed and committed there. The owner merges and pushes upstream `main`, then runs Sync upstream in the private copy. That sync's deploy is the first live run of the Access steps, so it stays the owner's.

Here: nothing upstream is public, so show `close` and `open` against fixtures (recorded API responses or a local stand-in) with their own manifests.

### 2026-10-26: handoff

Owner: the implementation sub-agent the coordinator's T3 thread started; no delegated agents.
Where: `/home/isolino/.t3/projects/artifactory-oss`, branch `public-access`, behaviour in `e2c3c37` (this comment is the commit after it). Not pushed.
Done: `scripts/public-access.ts` (`pnpm public-access close|open`), the Close and Open steps in `.github/workflows/ci.yml`, the `artifact` skill, `README.md` and `CODING_STANDARDS.md`, all in `e2c3c37`. Shown by `tests/check/public-access.test.ts` (10 tests, seam 1) against a local stand-in for Cloudflare's Access API (`tests/check/access-api-stand-in.ts`), with fixture manifests: create, close keeping only what stays public, replace repairing hand edits, delete when empty (app and Bypass), open with nothing public, close with no app, missing protected app, Cookie Path Attribute on, a refused `/api/` path in both modes, the placeholder domain, and the exact Removed/Added lines. Four mutations of the script (close adding, no `/api/` refusal, no Cookie Path check, Bypass left behind) each turned exactly one test red. The full plain `pnpm check` runs on the final HEAD after this comment; its result is in the sub-agent's final message to the coordinator.
Partial: none. Findings: none yet; the coordinator's code review is next, so the ticket stays `claimed` and its boxes unticked.
Decisions: [where this work happens (approved)](#2026-10-26-where-this-work-happens-approved). Made here, which the spec didn't settle:
- The Bypass is a reusable policy named like the app ("artifactory public artifacts", include Everyone), linked to the app by ID at precedence 1, because that is the form Cloudflare's API reference documents for an app's `policies`. Inline policy bodies aren't documented there. `open` creates it when missing; deleting the app deletes it too. Every PUT sends `policies` explicitly, since the reference doesn't say what an omitted field does.
- Tests at seam 1 with an Access API stand-in, which `CODING_STANDARDS.md` now lists as a test double. The spec's "Not tested automatically" stays true for what the live account opens, and that's what the standards now say.
- `CLOUDFLARE_API_BASE_URL` (the variable wrangler reads for the same thing) points the script at the stand-in. Unset in CI.
- `wrangler.jsonc` is read through TypeScript's JSONC reader in `scripts/wrangler-config.ts`, which also holds the placeholders `scripts/deploy-config.ts` fills in. The script refuses a `wrangler.jsonc` still holding them.
- `/api` itself is refused as well as anything under `/api/`. Two apps with the fixed name fail the run. The app is created with `app_launcher_visible: false`.
- Unconfirmed until the owner's first live run (08): the list endpoints' `name`/`exact`/`aud` filters (the script filters again itself), and that deleting the reusable policy right after its app is accepted.
- Flag for the owner: ADR 0005's last sentence ("until then, nothing is open") goes stale once this lands; the spec says no ADR change, so it's untouched.
Running: none after the check. Next: the coordinator's code review of `5cccc90..HEAD`.

### 2026-10-26: review of e2c3c37 and the owner's decisions

Two-axis review (Standards and Spec) of `5cccc90...4bc3963`. Nothing is missing, and nothing opens more than the manifest.

**Approved** (owner, T3 orchestrator thread, 2026-10-26):

- Keep the fixture tests, the Access API stand-in and the new allowed test double. The spec's "Not tested automatically" and "No new seam" lines change to match: only what opens on the live account stays untested.
- Update ADR 0005's last sentence ("until then, nothing is open") in this branch. The decision itself stays.
- Say "an artifact going private/public", not "a page going…", in CI, the skill and the spec's story 14 (`GLOSSARY.md` lists "page" under _Avoid_ for an artifact). "A public artifact's page" stays.

**Accepted findings, due in the fix round:**

1. `open` and `close` check that the Bypass policy is a bypass with an Everyone include, and repair it when it isn't. `open` fails when the protected app links it. A policy linked elsewhere makes its DELETE fail, and the message says so.
2. `close` removes every destination that isn't wanted before it fails on any refusal, so a red Close still leaves the site locked. A refusal it can't act on safely (no manifest, placeholder domain) removes everything from the public app, deleting it, then fails.
3. The `/api` refusal covers any destination whose path could match `/api` or `/api/…`, wildcards included.
4. Comments that only repeat the code go (`ci.yml` "If this fails, nothing is migrated or deployed"; the domain/AUD sentence in `scripts/wrangler-config.ts`; the close/open summary in `scripts/public-access.ts`). The spec link and the fail-locked reason stay.
5. The skill's "the owner names it, otherwise list and wait" rule lives in one bullet. Rename and Frontmatter's `public` bullet stop repeating Frontmatter's destination cost and Make public's step 1.
6. `printChanges` runs once; the error-message expression and `per_page=1000` each live in one place. `setDestinations` gets a name that covers deleting the app. The local `open` stops shadowing the mode. The tests say "protected app" as the code does. `deploy-config.ts`'s `text` becomes `value`.
7. Ticket 06's handoff `Decisions:` links this comment. The API behaviour left unconfirmed until 08 becomes an Unresolved item: the owner decides at the first live run, and it blocks only closing 08.

**Not taken:** the stand-in's own `AccessApp`/`AccessPolicy` types stay, as an independent source. `readDeployedSite(root)` stays, since 07 uses it next.
