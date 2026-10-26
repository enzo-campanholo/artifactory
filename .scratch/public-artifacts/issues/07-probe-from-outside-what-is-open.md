# 07: Probe from outside what is open

Status: ready-for-agent
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
