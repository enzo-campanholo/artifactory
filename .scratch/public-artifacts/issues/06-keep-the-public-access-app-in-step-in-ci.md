# 06: Keep the public Access app in step in CI

Status: ready-for-agent

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
