# Private copy workflow

Source: [Agent workflow in a private copy](../artifact-generation-gaps/issues/09-agent-workflow-in-a-private-copy.md), on the [Artifact generation gaps](../artifact-generation-gaps/map.md) map. Every decision below was made with the owner on 2026-11-08, and the ticket's `## Answer` records them.

## Problem

Agents writing artifacts in a private copy couldn't reliably publish and verify:

- In a private copy, `gh` resolved to the upstream repo, because the copy has an `upstream` remote. Agents watched upstream's CI runs, read upstream's variables, took an upstream SHA for `--last-passed`, or concluded the copy's CI wasn't running.
- A delegated implementer ended its turn while its background `pnpm check` was still running, which killed the check. The delegator found out only later, then resumed the child and reran the gate.
- With no CI access, an agent can't confirm a deploy: Cloudflare Access sends every private path to sign-in, even a slug that doesn't exist.
- The skill reads the site's address from the `ARTIFACTORY_DOMAIN` repository variable, and its Reply step treats "found nothing" as "not deployed". A read that fails also finds nothing, so an agent reported a template URL.

The GitHub token's 403 on Actions and variables is the owner's setting, and the owner reports it fixed. This spec covers what agents do either way.

## Behaviour

### `gh` reads the private copy

- **The `artifact` skill** sets `gh`'s default repository before its first `gh` command whenever the checkout has an `upstream` remote: `git remote get-url upstream >/dev/null 2>&1 && gh repo set-default origin`. Running it again is harmless. It's written to the clone's git config, which its worktrees share, and it also covers fresh clones (cloud sessions) that never ran the README setup.
- **The README's "Deploying your own"** step 1 adds `gh repo set-default origin` after `git push -u origin main`, so the owner's own `gh` reads the copy too.
- `gh` commands stay without `-R`. One forgotten `-R` would bring back exactly this bug.
- CI is unchanged: its `last-passed` step already sets `GH_REPO` to the workflow's own repository.

### A delegator verifies the child's check

- `docs/agents/delegation.md` gains this rule, next to "The child reports completion in its final message": a delegator accepts a child's passing check only when `scripts/heavy --status --json`, run in the child's worktree, shows `check.applicability: current` for the child's HEAD. On anything else (`stale`, `unknown`, `none`, or a check still running), resume the child to finish the gate, rather than rerunning it yourself or accepting the claim.
- Briefs don't repeat the turn-ending rule as a separate line. They already carry `CLAUDE.md`'s `scripts/heavy` rules, which include it.

### Confirming a deploy

- CI's Probe step stays the only confirmation that a push is live. The skill's **Watch CI** steps are unchanged.
- When the agent can't read CI (`gh run list` or `gh run watch` fails), the reply says "pushed, deploy unverified" and quotes the `gh` error. The agent doesn't try to confirm the deploy by fetching the site.
- No new public evidence is built: no commit stamp on a public page and no path left always open. `data-build-id` stays a random id.

### The site's address

- `ARTIFACTORY_DOMAIN` stays the only source. The copy can't add files outside `artifacts/`, and `wrangler.jsonc` gets the domain only inside CI.
- The skill's **Reply** step treats the two cases differently:
  - **The variable is empty** (`gh variable get` succeeds with nothing, or says the variable isn't found): the site isn't deployed, so give the local URL, `http://localhost:4321/<slug>/`, as today.
  - **`gh` fails** (an auth, permission or network error): say the domain couldn't be read, quote the error, and give the path `/<slug>/`. Never give a template URL such as `https://<domain>/<slug>/`.
- The skill's opening line, which names `gh variable get ARTIFACTORY_DOMAIN`, points to the Reply step for this split.

## Naming

"Private copy" and "upstream repo" are already the docs' terms (`CLAUDE.md` › Two repos). `GLOSSARY.md` gains no entry: this is workflow, not domain.

## Documentation

All upstream, since the copy matches upstream outside `artifacts/`:

- `.claude/skills/artifact/SKILL.md`: the default-repository line before the **Check** section's `gh run list`, and **Reply**'s two cases. **Watch CI** gains the "pushed, deploy unverified" fallback.
- `README.md` › Deploying your own, step 1.
- `docs/agents/delegation.md` › Briefs (or a short "Accepting a child's result" paragraph that links Local evidence).

## Out of scope

- The token's permissions. That's the owner's account setting, already ruled out of scope on the map.
- Any public version or deploy marker on the site.
- Reading the domain from anywhere besides the repository variable.

## Comments

### 2026-11-08: owner decisions at ticketing

Owner, /to-tickets review in the Artifact generation gaps session, 2026-11-08, every recommendation accepted. Each bullet amends this spec or fills a gap in it; the tickets in `issues/` carry the detail.

- **A delegator verifies the child's check** (02), amending "only when … `check.applicability: current`": the delegator also accepts a successful `--last-passed` run of the child's HEAD with the source unchanged since. The implementer first confirms that `scripts/heavy --status --json` shows enough (mode, outcome, HEAD, source unchanged) to tell such a run apart, and stops and reports if it doesn't, rather than inventing a proxy.
