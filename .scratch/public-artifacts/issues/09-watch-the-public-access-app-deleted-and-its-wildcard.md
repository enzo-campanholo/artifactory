# 09: Watch the public Access app deleted, and its wildcard's reach

Status: resolved

**What to settle:** two Access API behaviours from [ticket 06](06-keep-the-public-access-app-in-step-in-ci.md)'s Unresolved list that the live runs in [08](08-share-the-first-public-artifact.md) didn't exercise. The others are settled: the list filters and each app's `policies` behave as `scripts/public-access.ts` needs ([08's rename run](08-share-the-first-public-artifact.md#2026-10-27-the-301s-after-renaming-the-sample)).

- **Deleting the reusable policy right after its app.** `close` does this only when no artifact is public. Exercising it live means making `rsa-from-scratch` private for one deploy, which closes the shared link until it's made public again, so the owner chooses when. A red Close public paths step says it failed; the skill's Watch CI says what that leaves open.
- **The reach of a destination's `*`.** The script assumes `<domain>/_astro/*` opens only paths under `/_astro/`. The probe checks the intended closed paths, but not paths a wider match would open. Settle it from Cloudflare's documentation or by probing paths such as `/_astro` and `/_astroX/` from outside.

Neither blocks sharing: a failure in either shows as a red CI step or an `OFF` probe line, not silently.

- [x] The policy deletion seen in a live Close public paths step, or the owner's decision to leave it unexercised.
- [x] The `*` reach settled, and the probe extended if it opens more than `/_astro/`.

## Comments

### 2026-10-27: closed

- **The policy deletion: left unexercised.** Owner, T3 thread, 2026-10-27: close this ticket rather than make the sample private for a deploy. A failure would show as a red Close public paths step the first time no artifact is public.
- **The `*` reach: settled from outside**, with `curl --path-as-is`, no cookies and no redirects followed, against the live site. Access matches `<domain>/_astro/*` only under `/_astro/`: `/_astro`, `/_astroX/`, `/_astro-x/y` and `/x/_astro/y` each answer 302 to the Access login. It matches regardless of case (`/_ASTRO/y` passes Access and gets the Worker's 404) and before decoding: `/_astro/..%2f<path>` passes Access, but the answer is an empty 307 to `/<path>`, which Access then guards. This was tried for `drafts/`, `catalog/`, `api/library` and a private artifact, with `%2e%2e%2f` too. `..%2f..%2f` answers 400, and `..%5c` the site's 404 page. No private page, draft or state API answer is reachable, so the probe isn't extended.

Done: no code changed, so no check or review. The public artifacts spec has no open tickets.
