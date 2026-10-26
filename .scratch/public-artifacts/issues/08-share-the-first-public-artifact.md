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
