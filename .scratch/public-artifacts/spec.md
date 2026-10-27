# Public artifacts

Status: resolved

[ADR 0005](../../docs/adr/0005-cloudflare-workers-d1-access.md) records the Bypass and the open `/_astro/` files, and `GLOSSARY.md` (**Public artifact**, **Visitor**, **Throwaway state**) the vocabulary. Tickets 01–05 have landed: the frontmatter mark, `noindex`, the visitor's page, the Library mark and the Access token, stored as the GitHub secret `CLOUDFLARE_ACCESS_API_TOKEN`. Tickets 06, 07 and 08 landed too: the sample artifact `rsa-from-scratch` went public on 2026-10-27 and the probe passed from outside. 09 settled the `*` wildcard's reach and left the policy deletion unexercised, by the owner's choice. The tickets were deleted once resolved; they're in git history.

## Problem Statement

The owner wants to share some study artifacts with people they send the link to. Today Cloudflare Access covers the whole hostname, so someone who opens the link meets the owner's sign-in page. Opening a page by hand in the Cloudflare dashboard would drift from git, and a Bypass on the existing Access app would open the whole site, the Library and the state API included. Many artifacts are built from course material, so sharing has to be a choice for each artifact, and nothing a visitor does may reach the owner's artifact state.

## Solution

The owner asks an agent to make an artifact public, and the agent marks it in the frontmatter through the `artifact` skill. On the next deploy, CI opens that artifact's page, its former slugs and the assets it needs to anyone, through a second Access app whose Bypass list it keeps in step with the build. It closes whatever went private before the deploy and opens what went public after it, so a failed step always leaves the site locked. A probe after the deploy checks from outside that exactly the intended paths are open. Removing the mark makes the artifact private again on the next deploy.

A public artifact keeps its one URL. The owner, signed in, sees the page exactly as today. A visitor sees the same page on throwaway state: every question works, the score and "To revisit" work, and the answers are gone on reload. The visitor's page has no back link, none of the saving or sign-in notices, and one quiet line saying their answers stay on this page. A visitor's page never calls the state API, and Access would refuse it if it did. Every response from the site carries `noindex`, so public artifacts stay out of search. The Library marks public artifacts, and `pnpm check` refuses a draft marked public and more public paths than one Access app holds.

## User Stories

1. As the owner, I want to make an artifact public by asking an agent, so that sharing it never needs a visit to the Cloudflare dashboard.
2. As the owner, I want to make a public artifact private again by asking an agent, so that I can stop sharing it as easily as I started.
3. As the owner, I want each artifact to stay private until I ask for it to be public, so that source material I can't share never leaks by default.
4. As the owner, I want a public artifact to keep its one URL, so that the link I send is the same link I study from.
5. As the owner, I want the page to look exactly as it does today when I open a public artifact signed in, so that sharing changes nothing for me.
6. As the owner, I want my answers on a public artifact saved to my artifact state as on any other artifact, so that sharing it doesn't cost me my progress.
7. As the owner, I want a public artifact marked "Public" in the Library, so that I can see at a glance what I've shared.
8. As the owner, I want the drafts page, the Library, the catalog and every other artifact to stay behind my sign-in, so that only what I chose is open.
9. As the owner, I want the state API to stay behind my sign-in, so that no visitor can read or write my answers.
10. As the owner, I want a public artifact's former slugs to redirect for visitors too, so that a link I sent before a rename still works.
11. As the owner, I want a former slug to go back behind the sign-in when its artifact goes private, so that no old link stays open.
12. As the owner, I want anyone who had the link to meet the sign-in page once the artifact is private, so that making it private really closes it.
13. As the owner, I want an artifact going private to close before the new build is deployed, so that it's never open for a moment longer than I asked.
14. As the owner, I want an artifact going public to open only after the new build is deployed, so that a visitor never gets a page built without the visitor's form.
15. As the owner, I want any failure in the deploy to leave pages locked rather than open, so that a broken run never shares more than I chose.
16. As the owner, I want rerunning CI to repair any difference between the Access app and the frontmatter, so that drift never needs a dashboard fix.
17. As the owner, I want the Access app for public artifacts deleted when nothing is public, so that the shared assets go back behind my sign-in too.
18. As the owner, I want CI to check from outside, after every deploy, that only the intended paths are open, so that I learn of a mistake from a red run, not from a classmate.
19. As the owner, I want to run the same probe from my own machine, so that I can confirm what's open whenever I like.
20. As the owner, I want public artifacts kept out of search engines, so that sharing a link doesn't publish the artifact to the world.
21. As the owner, I want Access changes made with their own narrowly scoped token, so that the deploy token can't touch Access and the Access token can't deploy.
22. As the owner, I want a guided script to walk me through creating that token, so that the one dashboard step is quick and hard to get wrong.
23. As the owner, I want the deploy to stop before opening anything if my sign-in cookie is scoped by path, so that my answers on a public page never silently stop saving.
24. As the owner, I want `pnpm check` to fail once public artifacts need more paths than one Access app holds, so that a deploy never fails halfway on Access's limit.
25. As the owner whose session has expired, I want a public artifact on a device where I've studied to show the sign-in notice, as a private artifact does, so that I never answer into throwaway state without knowing it.
26. As the owner whose session has expired on a public artifact, I want the sign-in notice to take me somewhere I can actually sign in, so that I'm not stuck reloading a page Access no longer guards.
27. As the owner on a device where I've never signed in, I want the visitor's page on a public artifact, and to sign in by opening the Library, so that a public link works on any device.
28. As the owner, I want my device to remember that I've studied on it even after I'm signed out, so that an expired session is never mistaken for a visitor.
29. As the owner, I want making an artifact public or private to raise no "artifact updated" notice, so that sharing doesn't look like a content change.
30. As a visitor, I want to open a public artifact from the link I was sent without signing in, so that I can read it straight away.
31. As a visitor, I want the page to paint in its final form from the first frame, so that I never see the owner's back link flash before it goes.
32. As a visitor, I want every question to work fully (checking, revealing a model answer, self-marking), so that I can practise with the artifact.
33. As a visitor, I want the score, "To revisit", starting over and the attempts panel to work for this page, so that I can study with it as the owner does.
34. As a visitor, I want one quiet line telling me my answers stay on this page and are gone when I leave, so that I'm not surprised when a reload empties them.
35. As a visitor, I want no notices about saving, signing in, answers given on another device or an updated artifact, so that the page doesn't talk about things that don't apply to me.
36. As a visitor, I want no back link, so that I'm not sent to a sign-in page I can't pass.
37. As a visitor, I want the eye and the size to stay in the running head, so that I can pick the theme and see how long the artifact is.
38. As a visitor, I want the page's labels and my line in the artifact's main language, so that a Portuguese artifact reads in Portuguese throughout.
39. As a visitor, I want my answers never to reach the owner's state, so that I can't disturb the owner's study by practising.
40. As a visitor on a computer the owner once studied on, I accept the sign-in notice instead of the visitor's page, since telling the two apart there isn't possible.
41. As an agent, I want a `public` frontmatter field, so that making an artifact public is one line in the entry.
42. As an agent, I want `pnpm check` to fail on a draft marked public, at the `public` line, with the artifact skill section to read, so that I never ship a state the platform can't serve.
43. As an agent, I want `pnpm check` to fail at every public artifact when the public paths don't fit in one Access app, so that I tell the owner before the deploy breaks.
44. As an agent, I want the artifact skill to say when to make an artifact public or private, what to reply, and what a red Access or probe step in CI means, so that I can share an artifact from the skill alone.
45. As a platform agent, I want one module that turns the artifacts' frontmatter into the public paths, used by the check, the build and the probe, so that the three can never disagree.
46. As a platform agent, I want the Worker unchanged, so that keeping visitors off D1 stays Access's job and the Worker carries no visitor logic.
47. As a platform agent, I want the owner mark behind the same kept transports as the device copy, so that throwaway state can never set it.
48. As a platform agent, I want the catalog to show the visitor's form of the artifact frame, so that I can judge it with impeccable before it ships.

## Implementation Decisions

### The mark in the frontmatter

- **`public`** joins the artifacts collection's frontmatter schema: `true` or `false`, defaulting to `false`, as `draft` does. It's the single source of truth for what's open.
- **A draft can't be public.** The schema refuses `draft: true` with `public: true` at the `public` line, as rule `frontmatter` with the "Frontmatter" skill section. Proposed message: "`public` can't be true on a draft: publish it first, or remove `public`".
- **Content hash.** The flag isn't part of the rendered content, so making an artifact public or private leaves its content hash alone and raises no "artifact updated" notice.
- `public` is a reserved word in strict-mode JavaScript, so code reads it as `data.public` or renames it on destructuring. The frontmatter keeps the plain name agents will write.

### The public paths

- **One module** in the platform turns the repo's artifacts into the public paths, sorted:
  - for each public artifact: `/<slug>` and `/<slug>/`, and the same pair for each former slug, since `src/redirects.ts` writes both;
  - while any artifact is public: `/_astro/*` and `/favicon.svg`;
  - nothing at all when nothing is public.
- **Three callers**, so they can never disagree:
  - the artifact checks, for the capacity rule;
  - the build, which writes the public paths manifest;
  - the probe, which reads the checkout's frontmatter, so the owner can run it without building.
- **Capacity.** One Access app holds 50 destinations. When the public paths number more, `pnpm check` fails as rule `public` at every public artifact's `public` line, with the "Frontmatter" skill section, as `artifact-id` fails at every sharer. Proposed message: "public artifacts need N Access destinations, and one Access app holds 50; ask the owner which to make private". A second app is left until it's needed.
- **The public paths manifest.** The build writes the list as JSON beside the question manifest, in the Worker's build output (`dist-worker/`), in `astro:build:done` and only when the build is clean, as the redirects and the question manifest are. It's what the public Access script opens, so the Access app always matches the build CI just deployed. The Worker doesn't read it.

### The public page

- **The public marker.** The artifact route passes `public` to the artifact layout, which passes it to the artifact frame. A public artifact's page carries `data-public` on `<html>`, beside `data-artifact-id`. A private artifact's page is unchanged.
- **Both forms in the HTML.** A public page holds the back link and the visitor's line. CSS keyed on `data-viewer` shows one of them. With no `data-viewer` (a private page, or no script), the page shows the owner's form.
- **The viewer, before the first paint.** On a public page only, a second classic inline script in `<head>`, right after the theme's and written by the same `ThemeHead`, sets `data-viewer="owner"` when the owner mark is stored and `"visitor"` otherwise. It's a script of its own so that private pages stay byte-for-byte as they were and the theme's script is untouched. If storage throws, it sets `"visitor"`. It gets the mark's key from the owner mark module's exported constant through `define:vars`, as it gets the theme's key. Nothing is hidden while it runs. It does nothing else.
- **The page's module** reads `data-viewer`:
  - `visitor`: the store starts on throwaway state, an in-memory transport seeded with no attempts and the page's content hash. It never reads or writes the device copy and never calls `/api/*`.
  - `owner`, or a private page: as today. That's the kept HTTP transport when `PUBLIC_STATE_TRANSPORT=http`, and throwaway state otherwise.
- **No `pnpm check` rule for the page.** No artifact can make a public page lose its visitor's form, so a check rule would guard only the platform, and its failure line would have no fixture without a broken copy of the artifact frame. A seam 1 test of the built output holds it instead (Testing Decisions): the public page carries the public marker, the back link, the visitor's line and the viewer in its head script.

### The owner mark

- **What it is.** One `localStorage` key, `artifactory-owner`, present once this device has had any successful answer from the state API. Its value doesn't matter. It's never artifact state and never reaches the Worker.
- **The owner mark module** (design system, browser) exports the key and setting it. It has no reader, since only the viewer's head script reads the mark, and that inline script gets the key through `define:vars` rather than importing a module. Writing fails silently when storage throws, as the theme's does.
- **Who sets it.** The kept transports, which already keep the device copy and the Library's kept statuses, set it on the outcomes `loaded`, `saved` and `already answered` for an artifact, and `loaded` for the Library. A `failed` or `signed out` outcome doesn't set it. Throwaway state never goes through the kept transports, so it never sets it.
- **Nothing clears it.** A "signed out" outcome clears the device copy and the Library's kept statuses but not the mark, because telling an expired session from a visitor is what the mark is for. The device copy's sign-out clears the keys under its own prefix (`artifactory:` on its branch), so the mark's key sits outside that prefix, as `artifactory-theme` does.
- **Accepted cost:** a visitor on a computer the owner once studied on gets the owner's page, and with no session there, the sign-in notice.

### The visitor's page

- **The same page, on throwaway state.** Every question kind works fully. The score, the stopping point, "To revisit", Next question and Start over work. The attempts panel lists the attempts made on this page. Throwaway state can't fail, sign out, find answers from elsewhere or see an updated artifact, so none of those notices or question statuses can appear. The visitor's page needs no code to hide them. The "Started over" notice with Undo stays, since it's about the page, not about saving.
- **The running head.** No back link: it leads only to the sign-in. The back link's slot stays empty, so the eye and the size keep their places (proposed). The eye works as everywhere: its theme choice is kept on the visitor's device, which isn't artifact state.
- **The visitor's line.** One quiet line, in the artifact's main language through `Bilingual`, saying the answers stay on this page and are gone when the visitor leaves. Proposed wording: "Suas respostas ficam só nesta página e somem quando você sai." / "Your answers stay on this page and are gone when you leave." Proposed placement: in the masthead, under the date line. It shows only on artifacts with questions, and it doesn't print. Its wording, look and place go through impeccable and the voice in `DESIGN.md`.
- **No sign-in link** anywhere on the visitor's page.

### The owner's page on a public artifact

- **Signed in:** exactly as today, with no public marker shown. Answers save to D1, because the page's `fetch('/api/…')` carries the `CF_Authorization` cookie through the protected app, which adds the token the Worker checks.
- **A 401:** the sign-in notice, as on a private artifact. It never turns quietly into the visitor's page.
- **Signing in from a public page.** The notice's action today reloads the page, which Access no longer guards, so a reload never reaches the sign-in. On a public page, the action becomes a link to the Library to sign in (decided by the owner), worded "Entrar pela Biblioteca" / "Sign in from the Library" until impeccable says otherwise. The Library is behind Access, so opening it signs the owner in, and its load sets the owner mark. The wording goes through impeccable.

### The Library

- Each row of a public artifact says "Public" in its meta line, after the date. The Library's chrome is English, so the word is English on every row, a pt-BR artifact's included. Its look goes through impeccable. The drafts page never shows it, since drafts can't be public.
- The Library layout's row type gains `public`, with a doc comment. The layout is skipped by the component reference, so `COMPONENTS.md` doesn't change.

### Keeping out of search

- A static `_headers` file sends `X-Robots-Tag: noindex` on `/*`. That covers public pages, former slugs, `/_astro/*` and everything else the assets layer serves, with nothing to keep in step.
- No `robots.txt` is added, and nothing may disallow crawling, or crawlers never see the `noindex`.
- Bot Fight Mode stays off for the site's zone, since it can't be scoped by path and may challenge the owner's `/api/*` calls. The deployment notes say to check it.
- Workers Caching stays off in `wrangler.jsonc`, or every static asset request, visitors' included, becomes a billable Worker request.

### The public Access script

- **One repo script** with two modes, `close` and `open`, run in CI as `pnpm public-access close` and `pnpm public-access open`. It calls Cloudflare's Access API with `fetch`, with no SDK.
- **Its inputs:**
  - the public paths manifest the build wrote;
  - the custom domain from `wrangler.jsonc`'s route, to turn paths into destinations;
  - `ACCESS_AUD` from `wrangler.jsonc`, to find the protected app;
  - `CLOUDFLARE_ACCOUNT_ID`;
  - its own secret, `CLOUDFLARE_ACCESS_API_TOKEN`, scoped to "Access: Apps and Policies: Edit" on the account and kept apart from the deploy token.
- **The public app.** A self-hosted Access app found by a fixed name, proposed as "artifactory public artifacts". It has one Bypass policy whose include is Everyone. The script creates the app with its policy when it's missing and the list isn't empty, replaces its whole destination list otherwise, and deletes it when the list is empty. Both modes make the policy a bypass for everyone again when it has been edited, and a policy another Access app uses isn't deleted: the run fails and says so.
- **`close`**, before the deploy: the app keeps only the destinations that are open now *and* in the new manifest. Whatever goes private closes first. When the new manifest is empty, the app is deleted. When the app doesn't exist, there's nothing to close.
- **`open`**, after the deploy: before changing anything, it finds the protected app by its AUD and fails if the app is missing, its Cookie Path Attribute is on, or it uses the Bypass policy. Then it sets the public app to exactly the new manifest.
- **What it refuses.** It refuses any path that could reach `/api` or anything under `/api/`, wildcards included. `api` is a reserved slug, so this can only catch a platform bug, but it's the one path that must never open.
- **Failing locked.** `open` refuses before changing anything. `close` first takes away everything that isn't wanted, refused paths included, then fails; when it can't tell what's wanted (no manifest, or `wrangler.jsonc` still holding its placeholders), it deletes the public app, then fails.
- **Repair.** Every run replaces the whole list, so rerunning CI repairs any drift, hand edits included.
- It prints the destinations it removed and added.

### CI

On `main`, after the check passes, in this order:

1. **Close public paths** (`pnpm public-access close`). If it fails, nothing is deployed and nothing is migrated.
2. **Apply the D1 migrations**, as today.
3. **`wrangler deploy`**, as today. If it fails, pages going public stay behind the sign-in, since they were never opened.
4. **Open public paths** (`pnpm public-access open`). If it fails, a page built as public stays behind the sign-in until the next run.
5. **Probe** (`pnpm probe`). If anything is off, the run goes red.

- The Access steps get `CLOUDFLARE_ACCESS_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, and the deploy steps keep `CLOUDFLARE_API_TOKEN`.
- Branch runs do none of this.
- The existing `deploy` concurrency group already keeps two runs from interleaving their close and open.

### The probe

- **A `pnpm probe` command**, run by CI after opening and by the owner by hand. It reads the checkout's frontmatter through the public paths module and the custom domain from `wrangler.jsonc`, or from `ARTIFACTORY_DOMAIN` while `wrangler.jsonc` holds its placeholders, as in a checkout (decided on ticket 07). It sends unauthenticated requests with no cookies and follows no redirects.
- **Must be open:**
  - each public artifact's `/<slug>/` answers 200;
  - `/<slug>` answers the assets layer's trailing-slash redirect, 307 to `/<slug>/`;
  - each former slug, with and without its slash, answers 301 to `/<slug>/`;
  - `/favicon.svg` and every `/_astro/` file the first public page links to answer 200, and that page names at least one.
  - A redirect is checked by its status and its destination: it counts only if both are the expected ones, and its `Location` is the expected path on the site, never the Access login. A 302 to the Access login on an open path is a failure, not a redirect.
- **Must be closed:** `/`, `/drafts/`, `/catalog/` and one published private artifact, when there is one, answer 302 to the Access login or 401. When nothing is public, so does `/favicon.svg`. `/api/library` answers 302 to the Access login only: the Worker sends its own 401 to a request without an Access token, so a 401 there could mean Access let the request through (decided on ticket 07).
- **`noindex`:** every response from the assets layer carries `X-Robots-Tag: noindex`. Responses Access itself sends (its 302 and 401) can't carry it and aren't asked to.
- **Propagation:** a path that's off is retried for up to a minute before the probe fails, since Access and the deploy take a moment to propagate (proposed).
- It prints the origin it asks, then one line per path, with what it expected and what it got, and exits non-zero on any mismatch.

### Setup by the owner

- An Access API token with only "Access: Apps and Policies: Edit" on the account, stored as the GitHub secret `CLOUDFLARE_ACCESS_API_TOKEN`. From ticket 06 on, every deploy on `main` needs it, even with nothing public.
- The protected app's Cookie Path Attribute is off, and Bot Fight Mode is off for the zone.

### Docs and the `artifact` skill

- **The `artifact` skill**, changed in the same commits as the check and the workflow it describes:
  - **Authority:** make an artifact public or private only when the owner asks, naming it, as with drafts.
  - **Workflows:**
    - **Make public:** set `public: true`, then check, publish, watch CI and reply. If the artifact is a draft, publish it in the same change, following "Publish a draft", and say so in the reply (proposed).
    - **Make private:** remove `public`, then the same finishing steps.
    - The reply says that anyone with the link can open it once CI is green, that it isn't listed by search engines, and that the Library marks it "Public". On going private, it says that anyone with the link now meets the sign-in.
  - **Rename:** a public artifact's former slugs stay open while it's public, and each costs two Access destinations.
  - **Frontmatter:** the `public` field, the draft refusal, and the capacity failure. On a capacity failure, the agent lists the public artifacts to the owner and waits, and never chooses which to close.
  - **Watch CI:** the main run now has the Close, Open and Probe steps, and their failures aren't `pnpm check` failures, so there's no failures block.
    - A red Close step means nothing was deployed.
    - A red Open or Probe step means the new version is live but some public pages may still be behind the sign-in.
    - Rerun once with `gh run rerun <id>`, then tell the owner.
- **`CODING_STANDARDS.md`:** the seams' owned lists gain the items in Testing Decisions. "Not tested automatically" names what the public Access script opens on the live account, and the probe, under Access routing, with the probe as the check on every deploy.
- **`DESIGN.md`**, with `.impeccable/design.json` following:
  - Navigation: a visitor's running head has no back link.
  - The visitor's line, its voice and its place.
  - The Library row's "Public".
  - The signed-out notice's action on a public page.
- **`README.md`:** "How it works" stops saying Access keeps the whole site private. "Deploying your own" adds the Access steps, the token, the probe, and the Bot Fight Mode and Cookie Path Attribute checks.
- **No change** to `GLOSSARY.md`, `PRODUCT.md`, ADR 0005, `COMPONENTS.md`, the Worker or the migrations.

## Testing Decisions

A good test drives the platform as an outside caller does and asserts only what it sees:

- `pnpm check`'s exit code and exact failure lines;
- the deployable output in `dist/` and `dist-worker/`;
- the store's results and the stored keys.

It never asserts the public paths module, the head script's source or call order. Expected values are literals: the exact destination list, the exact failure lines.

**No new seam.** Every automated test sits at one of two existing seams:

- **Seam 1, `pnpm check` against fixture repos** (`tests/check`). Extend the existing fixtures rather than adding builds:
  - **The schema fixture** (`frontmatter.test.ts`): a draft marked public fails at its `public` line, and `public: "yes"` fails as "must be true or false".
  - **The artifact checks fixture** (`artifact-checks.test.ts`): one public artifact with 24 former slugs needs 52 destinations and fails as `public` at its `public` line. That costs one artifact, not 25.
  - **The built site** (`library-and-question-manifest.test.ts` or `valid-artifacts.test.ts`), with one public artifact that has a former slug and questions, beside private ones:
    - its page carries `data-public`, the back link, the visitor's line and the viewer in its head script, and a private page carries none of the visitor's form;
    - loading the built public page into a happy-dom window with and without the owner mark stored gives `data-viewer` `owner` and `visitor`, and a private page gets no `data-viewer`;
    - the Library row of the public artifact says "Public", and no other row does;
    - the public paths manifest is exactly `/_astro/*`, `/favicon.svg`, the slug pair and the former-slug pair;
    - `dist/_headers` sends `X-Robots-Tag: noindex` on `/*`.
  - **The empty Library fixture:** the manifest is empty.
  - **The public Access script** (`public-access.test.ts`), run against a local stand-in for Cloudflare's Access API, a test double `CODING_STANDARDS.md` allows, with fixture manifests: the account the stand-in holds afterwards and the script's exit code and printed lines.
  - **The probe** (`probe.test.ts`), run against a local stand-in for the deployed site, a test double `CODING_STANDARDS.md` allows, with fixture artifacts: the probe's exit code and its line for each path.
  - Prior art: "redirects every former slug straight to the current slug" in `valid-artifacts.test.ts`, "writes every artifact's questions … into the question manifest" in `library-and-question-manifest.test.ts`, and the theme choice's tests in `tests/store/theme-choice.test.ts`.
- **Seam 3, the store over happy-dom** (`tests/store`). The kept transports are driven around the in-memory transport, as the device copy's tests do:
  - a load, a save, an "already answered" save and a Library load each leave the owner mark;
  - a failed load leaves none, and neither does throwaway state on its own;
  - a sign-out keeps the mark (the device copy's and the Library's tests own what sign-out clears);
  - a load still works when storage throws, which the device copy's and the Library's tests already cover through the kept transports.
  - Prior art: `tests/store/library-statuses.test.ts` and the device copy's tests on `answers-as-last-shown`.

**Seam 2 (the Worker)** gets no new test: the Worker doesn't change, and its existing Access tests already cover a missing token. **Seam 4** is untouched.

**Not tested automatically:**

- **What the public Access script opens on the live account, and what the live site answers the probe.** They're Access routing and the CI workflow, which `CODING_STANDARDS.md` already leaves out. The probe is their check on every deploy.
- **The look of the visitor's form, the line and the Library mark.** Impeccable checks them in the catalog, in both languages, both themes, print, and at a narrow and a wide width.

**Checked by hand before the first artifact goes public:**

- On `pnpm dev:worker`, a public artifact shows the owner's page and saves, and with the owner mark removed it shows the visitor's page, makes no `/api/` request in the network panel, and loses its answers on reload. Judge the first paint on a built page, not under `astro dev`.
- After the first real deploy that opens an artifact, the owner opens it in a private window and on a signed-in phone, and runs `pnpm probe`.

## Out of Scope

- Keeping a visitor's answers after a reload, on their device or anywhere else.
- A second Access app for more than about 24 public artifacts.
- A separate public hostname or prefix (`/p/<slug>/`), and a second build that keeps private artifacts' `/_astro/` files closed.
- An identity check in the Worker (the research's option B).
- Making drafts, the Library, the drafts page or the catalog public.
- A visitor-facing sign-in link, or anything that lets a visitor reach another page.
- Listing in search engines, a sitemap, or share previews (Open Graph).
- Spilling capacity over automatically, or choosing which artifacts to close.

## Further Notes

- **Design system work** (the visitor's form, the line, the Library mark, the notice's action and the catalog page): run it in a local session with impeccable (`design-system/CLAUDE.md`). Read `PRODUCT.md` and `DESIGN.md` first. The artifact frame's running head is shared with the eye and the draft status, and `StateNotices` with every page.
- **The catalog** gets a page showing the artifact frame in the visitor's form, so impeccable and the owner can review it on throwaway state.
- **Local previews:** under `pnpm dev`, nothing sets the owner mark, so a public artifact shows the visitor's form. `pnpm dev:worker` sets it after the first load.
- **Astro 7:** check the `astro-docs` MCP server before using `define:vars`, `is:inline` or any other Astro API.
- **Unconfirmed in the research,** which the first deploy settles:
  - whether `/<slug>/*` would match `/<slug>/` (not needed, since nothing is served under a slug);
  - whether Cloudflare applies `_headers` to the 301s it serves from `_redirects`. If it doesn't, the probe asks `noindex` of the 200s only;
  - that the assets layer's trailing-slash redirect is a 307, as Cloudflare's `auto-trailing-slash` docs give it. If the first deploy shows another status, the probe's expected status changes to match, still with its destination checked.
- **Settled since the decisions:**
  - The Library mark reads "Public" on every row, as the rest of the Library's chrome does.
  - The probe checks every redirect by status and destination.
- **Decided by the owner on 2026-10-22:** after a 401 on a public page, the signed-out notice links to the Library to sign in ("Entrar pela Biblioteca" / "Sign in from the Library", wording through impeccable), since reloading a public page reaches no sign-in. A link to the Access login that returns to the page was left aside: its URL form is unconfirmed.
