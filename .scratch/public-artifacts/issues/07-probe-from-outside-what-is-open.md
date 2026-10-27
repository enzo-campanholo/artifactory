# 07: Probe from outside what is open

Status: claimed
Blocked by: [06: Keep the public Access app in step in CI](06-keep-the-public-access-app-in-step-in-ci.md)

**What to build:** `pnpm probe`, run by CI after `open` and by the owner by hand, checks from outside, with no cookies and following no redirects, that exactly the intended paths are open: each public artifact's page answers 200, its unslashed path the assets layer's 307 to it, each former slug a 301 to it, and `/favicon.svg` and the first public page's `/_astro/` files 200; `/`, `/drafts/`, `/api/library`, `/catalog/` and one private artifact answer 302 to the Access login or 401; every assets-layer response carries `noindex`. It prints one line per path and exits non-zero on any mismatch.

Specified in [Public artifacts](../spec.md): "The probe". It reads the checkout's frontmatter through `src/public-paths.ts` and the custom domain from `wrangler.jsonc`, so it runs without a build.

- A redirect is checked by its status and its destination: a 302 to the Access login on an open path is a failure. The 307 is Cloudflare's documented `auto-trailing-slash` status; if the first deploy shows otherwise, change the expected status, still checking the destination.
- A path that's off is retried for up to a minute before failing.
- With nothing public, `/favicon.svg` must be closed too.
- The `artifact` skill's Watch CI gains the Probe step (red means the new version is live but something is open or closed that shouldn't be; rerun once, then tell the owner), in the same commit. `CODING_STANDARDS.md`'s "Not tested automatically" names the probe as the check on every deploy.

- [ ] `pnpm probe` checks every path the spec lists, by status and destination, and prints expected and actual per line.
- [ ] CI runs it on `main` after `open`.
- [ ] Shown against a local stand-in (e.g. `pnpm dev:worker`) for its pass and fail output; the live run is [08](08-share-the-first-public-artifact.md).
- [ ] The `artifact` skill and `CODING_STANDARDS.md` are updated in the same commit; `pnpm check` passes.

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
