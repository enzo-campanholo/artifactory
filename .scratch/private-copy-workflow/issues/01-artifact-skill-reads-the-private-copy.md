# 01: The artifact skill reads the private copy and reports what it couldn't read

Status: ready-for-agent
Blocked by: None (can start immediately)

Spec: [Private copy workflow](../spec.md) › `gh` reads the private copy, Confirming a deploy, The site's address. Its decisions are in [Agent workflow in a private copy](../../artifact-generation-gaps/issues/09-agent-workflow-in-a-private-copy.md) › Answer. They bound this ticket, so don't reopen them.

**What to build:** an agent that follows the `artifact` skill in a private copy watches the copy's CI, reads the copy's `ARTIFACTORY_DOMAIN` and takes the copy's last green SHA, with no `-R` on any `gh` command. When it can't read CI or the variable, its reply says so and quotes the `gh` error. It never says a push is live without CI showing it, and never gives a made-up URL. The owner's own `gh` reads the copy too, from the README setup.

The work is docs-only and goes in a checkout of the upstream repo, since the copy matches upstream outside `artifacts/`. It touches the `artifact` skill's main file and the README's "Deploying your own". Read `/writing-for-agents` before editing: say what the agent does, and keep each rule in one place.

- [ ] In a checkout with an `upstream` remote, the skill sets `gh`'s default repository to `origin` before the agent's first `gh` command, using the guarded, safe-to-rerun line from the spec. In a checkout with no `upstream` remote (the upstream repo), the line does nothing.
- [ ] The line comes before the first `gh` command on every path through the skill, and not only before the Check section's `gh run list` (which runs only for artifact work on `main`). That includes Delete, whose steps run `pnpm check` directly and reach `gh` first at Watch CI, and a request to fix a red CI run, which starts at `gh run view`. Put it in one place that every one of these paths passes through, and write it there once.
- [ ] Every `gh` command in the skill and its sibling files stays without `-R`.
- [ ] Before writing the line, confirm that `gh repo set-default` accepts the form the spec uses (a remote name). If it accepts only `OWNER/REPO` or a URL, use the `origin` remote's URL instead. That keeps the decision (set a default, no `-R`) and changes only the argument. Say which form you used in the closing comment.
- [ ] **Watch CI** keeps its current steps. When `gh run list` or `gh run watch` fails, the reply says "pushed, deploy unverified" and quotes the `gh` error, and the agent doesn't fetch the site to confirm the deploy.
- [ ] **Reply** separates the two cases, as the spec gives them. If the variable is empty, or `gh` says it wasn't found, the site isn't deployed: give the local URL, as now. If `gh` fails with an auth, permission or network error, say the domain couldn't be read, quote the error and give the path `/<slug>/`. Write the template-URL ban as a guardrail beside that positive instruction.
- [ ] The skill's opening line, which names `gh variable get ARTIFACTORY_DOMAIN`, sends the reader to Reply for the split and doesn't repeat it.
- [ ] The README's "Deploying your own" step 1 runs `gh repo set-default origin` (in the form confirmed above) after `git push -u origin main`.
- [ ] The existing headings stay as they are (the lifecycle file links `#finishing` and `#publish-a-draft`), CI's workflow is unchanged, and the README and skill name no private artifact.
- [ ] Walk each case through the edited skill and confirm it reaches the reply the spec describes: a checkout with and without an `upstream` remote, a CI read that fails, an empty variable, and a variable read that fails. Record the walk-through in the closing comment. Markdown is outside Prettier's scope, so `pnpm check` doesn't check these edits.
