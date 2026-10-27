# 08: Share the first public artifact

Status: ready-for-human
Blocked by: [07: Probe from outside what is open](07-probe-from-outside-what-is-open.md)

**What to build:** the first real public share, end to end. The owner names a published artifact; an agent makes it public through the `artifact` skill's Make public workflow; the owner pushes `main` and watches the deploy; then the owner opens the link in a private window and on a signed-in phone and runs `pnpm probe`. This settles what the research left unconfirmed.

Specified in [Public artifacts](../spec.md): "Checked by hand before the first artifact goes public" and "Unconfirmed in the research".

- Before the push, on `pnpm dev:worker`: the artifact shows the owner's page and saves; with the owner mark removed, the visitor's page, no `/api/` request, answers gone on reload. Judge the first paint on a built page.
- Agents never push or deploy here; the owner does. A `/wizard` script may guide the owner through the push, the run and the checks.

- [x] The hand check on `pnpm dev:worker` passes (agent, recorded here).
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

### 2026-10-26: the first share is a new sample artifact (approved)

Owner, T3 orchestrator thread, 2026-10-26: the first public artifact is a new one built for the purpose, which also becomes the upstream repo's sample artifact. It covers public-key cryptography (RSA by hand) and uses the platform's capabilities to the full: math, stepped code, D2 diagrams, figures, every question type and a custom build. It's in English, from original material rather than course material. It lives in upstream's `artifacts/` with `public: true`, so every private copy receives it by sync and shares it; its edits are made upstream, like any change outside a copy's own artifacts. Built on branch `sample-artifact`, not pushed, like 06 and 07.

**Unresolved:** a link to it in the upstream `README.md` would publish the owner's domain there. The owner decides after the first live run; it blocks only that README line.

### 2026-10-26: from ticket 07's fix round

- **Unresolved, for the owner at this ticket's first live run:** the trailing-slash redirect's status, whether `noindex` reaches the 301s and the 307, and the form of Access's login redirect, each read off the probe's lines as [from ticket 07](#2026-10-26-from-ticket-07) says. The owner decides what the probe expects from each; that blocks only closing this ticket ([07's review](07-probe-from-outside-what-is-open.md#2026-10-26-review-of-b8a4ab9-and-the-owners-decisions)).
- **This replaces that comment's `/api/library` line.** The probe passes `/api/library` only on a 302 to the Access login: the Worker answers 401 itself to a request without an Access token, so a 401 there could mean Access let the request through. An `OFF` line saying "got 401" on `/api/library` is a failure until the owner has seen which of the two sent it.
- **The probe's first line names the origin it asks.** On the live run it reads `Probing https://<domain> from outside, …`; one naming a domain "at" another origin means `ARTIFACTORY_PROBE_ORIGIN` is set.

### 2026-10-27: the hand check on `pnpm dev:worker` passes

Run on branch `sample-artifact` at `bae7789`, with the sample artifact `rsa-by-hand` (ID `ep0zvgsx`), before any push. A Puppeteer script drove Chrome against `pnpm dev:worker` (the built site, with the Access stand-in in front and a fresh local D1), each viewer in its own browser context with no cookies or storage. It answered question 2 (`power-mod-13`, "Compute 5³ mod 13"). The stand-in signs every request it passes on, so the visitor's requests carried an Access token too. That doesn't change the check: the viewer comes only from the owner mark in `localStorage`, and a visitor's page makes no request the token could affect. The Worker's 401 to a request with no token is left to `pnpm probe` on the live site.

`/api/` requests, per phase:

| Phase | `/api/` requests |
| --- | --- |
| Owner's device before the mark: the artifact first | none; the visitor's form, as `GLOSSARY.md` says of a device the owner hasn't studied on |
| Owner opens the Library | `GET /api/library` 200; leaves the owner mark |
| Owner opens the artifact, answers 8 | `GET /api/state/ep0zvgsx` 200, `PUT …/attempts/<id>/answers/power-mod-13` 201 |
| Owner reloads | `GET /api/state/ep0zvgsx` 200 |
| Owner reloads with the device copy cleared, the mark kept | `GET /api/state/ep0zvgsx` 200 |
| Visitor opens the artifact, answers 7 | none |
| Visitor reloads | none |
| Owner's state read afterwards | `GET /api/state/ep0zvgsx` 200 |

1. **As the owner: passes.** `data-viewer="owner"`, the Library link shown, no visitor line. The answer saved (`data-status="saved"`, marked right). After a reload it was still there, and still there after a reload with the device copy cleared: the state API's response held `{ response: "8", mark: "right" }`, so the page drew it from the server.
2. **As a visitor: passes.** `data-viewer="visitor"`, the Library link hidden, the line "Your answers stay on this page and are gone when you leave." shown. The answer was checked on the page (marked wrong, the right answer shown), with no `/api/` request and nothing in `localStorage`: no owner mark, no device copy. After a reload the question was unanswered again, still with no `/api/` request. The owner's state afterwards held only the owner's answer.
3. **First paint, on the built page: passes.** Each viewer was loaded at 393×852 with the CPU slowed 6×, under a Chrome trace with screenshots, and an observer installed before the document recorded every change to `data-viewer` and what each animation frame showed. For both viewers, `data-viewer` was set once, to the final viewer, about 1.5 s before `first-paint` (visitor: set at 170 ms, painted at 1672 ms; owner: 144 ms and 1712 ms). Every frame that held the masthead showed only that viewer's form. The trace's first painted frame, taken at the moment of `first-paint`, already shows the final form: the visitor's with no Library link and with the visitor line, the owner's with "← Library" and without the line. In the built HTML, the head's viewer script comes before the first stylesheet. The first run's in-page observer didn't install (it watched `document.documentElement` before it existed), so step 3 was run again with the fix. Both runs' trace frames show the same thing.

Screenshots, kept under `/tmp` and not committed:

- `/tmp/handcheck-08/out/`: `1c-owner-head.png`, `1c-owner-answered.png`, `1e-owner-after-reload.png`, `2a-visitor-head.png`, `2a-visitor-answered.png`, `2b-visitor-after-reload.png`, and `results.json`, which has every request and assertion.
- `/tmp/handcheck-08/out-paint/`: `3a-first-paint-visitor-frame1.jpg` and `3b-first-paint-owner-frame1.jpg` (the first painted frames; `frame0` is the blank page before navigation), the later frames, `*-final.png`, the traces and `results.json`.

### 2026-10-27: no live link in the README (decided)

Owner, T3 thread, 2026-10-27, settling the Unresolved in [the sample artifact decision](#2026-10-26-the-first-share-is-a-new-sample-artifact-approved): upstream's `README.md` does not link the live sample, so the owner's domain stays out of the repo. The README will show screenshots of the sample instead, later. **Deferred:** those screenshots, not part of this ticket.

### 2026-10-27: the first live run

Upstream `main` fast-forwarded to `7d7f6dd`, Sync upstream ran, and the private copy's CI run 40504985287 went green at every step: `pnpm check: 0 failures`, Close public paths ("There's no public Access app, so nothing is open to close."), migrations, deploy, Open public paths ("Created the public Access app, opening 4 destinations": `/_astro/*`, `/favicon.svg`, `/rsa-by-hand`, `/rsa-by-hand/`), and Probe ("All 25 paths answered as expected."). The probe by hand from the upstream checkout passed too, on 24 paths: that checkout lacks the copy's own artifacts, so it skips `/algoritmo-de-euclides/`, which CI's run found closed.

What it settles, from [ticket 07's questions](#2026-10-26-from-ticket-07):

- **The trailing-slash redirect:** `/rsa-by-hand` answers 307 to `/rsa-by-hand/` with `noindex`, as the probe expects. No change.
- **`noindex` on the 307:** present. **On the 301s:** not exercised, since `rsa-by-hand` has no former slugs; only the local evidence says `_headers` reaches them. The probe keeps asking it of them.
- **Access's login redirect:** `/`, `/drafts/`, `/catalog/`, `/api/library` and a private artifact each answer 302 to `/cdn-cgi/access/login`, the form the probe takes. `/api/library` answers 302, not 401.
- **Ticket 06's API questions:** the run took only the "no app yet" path: the list found no public app, and `open` created it with its four destinations. Honouring the list filters with an app present, `policies` in the list, deleting the reusable policy after its app, and the reach of `*` beyond what the probe checks are still unexercised. A rerun exercises the first two; making the sample private exercises the deletion.

A headless Chrome with no cookies loaded `https://<domain>/rsa-by-hand/` (domain left out here, per [the README decision](#2026-10-27-no-live-link-in-the-readme-decided)): 200 with `X-Robots-Tag: noindex`, `data-viewer="visitor"`, the store started, no "couldn't start" notice, no `/api/` request and no page error.

The owner saw "This page couldn't start" on a preview served from `pnpm dev:worker` over plain HTTP at a Tailscale address. That isn't a secure context, so `crypto.randomUUID` (called by `startStore`, `design-system/src/state.ts`) is undefined and throws; the same page from `localhost` started. The live site is HTTPS, so it doesn't apply there. A preview for another machine needs HTTPS or a forwarded `localhost` port.

**Left for the owner:** the phone check in the second checklist item (owner's page, saves).
