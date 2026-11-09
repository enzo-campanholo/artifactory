# 01: The artifact skill reads the private copy and reports what it couldn't read

Status: resolved
Blocked by: None (can start immediately)

Spec: [Private copy workflow](../spec.md) › `gh` reads the private copy, Confirming a deploy, The site's address. Its decisions are in [Agent workflow in a private copy](../../artifact-generation-gaps/issues/09-agent-workflow-in-a-private-copy.md) › Answer. They bound this ticket, so don't reopen them.

**What to build:** an agent that follows the `artifact` skill in a private copy watches the copy's CI, reads the copy's `ARTIFACTORY_DOMAIN` and takes the copy's last green SHA, with no `-R` on any `gh` command. When it can't read CI or the variable, its reply says so and quotes the `gh` error. It never says a push is live without CI showing it, and never gives a made-up URL. The owner's own `gh` reads the copy too, from the README setup.

The work is docs-only and goes in a checkout of the upstream repo, since the copy matches upstream outside `artifacts/`. It touches the `artifact` skill's main file and the README's "Deploying your own". Read `/writing-for-agents` before editing: say what the agent does, and keep each rule in one place.

- [x] In a checkout with an `upstream` remote, the skill sets `gh`'s default repository to `origin` before the agent's first `gh` command, using the guarded, safe-to-rerun line from the spec. In a checkout with no `upstream` remote (the upstream repo), the line does nothing.
- [x] The line comes before the first `gh` command on every path through the skill, and not only before the Check section's `gh run list` (which runs only for artifact work on `main`). That includes Delete, whose steps run `pnpm check` directly and reach `gh` first at Watch CI, and a request to fix a red CI run, which starts at `gh run view`. Put it in one place that every one of these paths passes through, and write it there once.
- [x] Every `gh` command in the skill and its sibling files stays without `-R`.
- [x] Before writing the line, confirm that `gh repo set-default` accepts the form the spec uses (a remote name). If it accepts only `OWNER/REPO` or a URL, use the `origin` remote's URL instead. That keeps the decision (set a default, no `-R`) and changes only the argument. Say which form you used in the closing comment.
- [x] **Watch CI** keeps its current steps. When `gh run list` or `gh run watch` fails, the reply says "pushed, deploy unverified" and quotes the `gh` error, and the agent doesn't fetch the site to confirm the deploy.
- [x] **Reply** separates the two cases, as the spec gives them. If the variable is empty, or `gh` says it wasn't found, the site isn't deployed: give the local URL, as now. If `gh` fails with an auth, permission or network error, say the domain couldn't be read, quote the error and give the path `/<slug>/`. Write the template-URL ban as a guardrail beside that positive instruction.
- [x] The skill's opening line, which names `gh variable get ARTIFACTORY_DOMAIN`, sends the reader to Reply for the split and doesn't repeat it.
- [x] The README's "Deploying your own" step 1 runs `gh repo set-default origin` (in the form confirmed above) after `git push -u origin main`.
- [x] The existing headings stay as they are (the lifecycle file links `#finishing` and `#publish-a-draft`), CI's workflow is unchanged, and the README and skill name no private artifact.
- [x] Walk each case through the edited skill and confirm it reaches the reply the spec describes: a checkout with and without an `upstream` remote, a CI read that fails, an empty variable, and a variable read that fails. Record the walk-through in the closing comment. Markdown is outside Prettier's scope, so `pnpm check` doesn't check these edits.

## Comments

### 2026-11-08: implementation, awaiting review

Implementer for this ticket, delegated from the Artifact generation gaps session. Where: `/home/isolino/.t3/worktrees/artifactory-oss/t3-98b56c14`, branch `t3/artifact-skill-reads-private-copy`, based on `gaps-implementation`. Status stays `claimed` for the delegator's review.

**Result.** `.claude/skills/artifact/SKILL.md` gains a `## Before the first gh command` section, between Before writing and Workflows, holding the spec's guarded line once. Every path's first `gh` command comes after it: Check's `gh run list`, Delete's Watch CI, a red-run fix starting at `gh run view`, and Reply. Watch CI keeps its four steps and gains the "pushed, deploy unverified" fallback (quote the error, leave the site unfetched). Reply now separates the three outcomes of the domain read: a domain, empty or 404 (local URL), and any other failure (say so, quote, `/<slug>/`, with the template-URL guardrail). The opening line points to Reply and no longer names the command. README › Deploying your own step 1 runs `gh repo set-default origin` after `git push -u origin main`. No heading changed, CI is untouched, no private artifact is named, and no `gh` command in the skill or its siblings has `-R` (`grep -rnE "gh [a-z]+.*(-R |--repo)" .claude/skills/artifact/` finds nothing).

**gh form.** `gh repo set-default --help` (gh 2.103.3) lists `gh repo set-default origin` ("Set a repository using a git remote name") as an example, so the spec's remote-name form is used unchanged.

**Deviation for review: `gh variable` ignores the default repository.** I tested this in a scratch repo with `upstream` = `enzo-campanholo/artifactory` and `origin` = `cli/cli`, after `gh repo set-default origin`, using `GH_DEBUG=api`. `gh run list` and `gh run view` asked `cli/cli`, but `gh variable get` and `gh variable list` still asked `enzo-campanholo/artifactory`. (gh's `variable` and `secret` commands resolve the base repo by remote-name priority, with `upstream` first, and skip the default. `--help` says so for secrets.) With the spec's `gh variable get ARTIFACTORY_DOMAIN`, a private copy would read upstream's variable, get "not found", and Reply would report the site as not deployed. So Reply reads the variable with `gh api 'repos/{owner}/{repo}/actions/variables/ARTIFACTORY_DOMAIN' --jq .value`, whose placeholders follow the default (it asked `cli/cli` in the same test). This keeps the decision: one source, a set default, no `-R`. Only the command changes, as the form-check item allows for the argument. The skill gives the reason in one sentence so a later edit doesn't switch back. The README's note adds that the owner's own `gh variable` and `gh secret` need `-R`. That note is for a human, and the no-`-R` rule covers the skill. If the delegator or owner prefers another route, it's a two-line change in Reply.

**Walk-through** (the line ran in scratch repos, and gh's outputs come from live calls):

- *Checkout with an `upstream` remote:* the line exits 0 and writes `remote.origin.gh-resolved base`. Rerunning it is harmless. `gh run list` / `gh run view` and the `gh api` read go to `origin`, and Check's `--last-passed` takes origin's green SHA. Reply gives `https://<printed domain>/<slug>/`.
- *Checkout with no `upstream` remote:* `git remote get-url upstream` exits 2, so `set-default` doesn't run and no default is written. gh resolves to the only remote, `origin` (`gh run list` asked `enzo-campanholo/artifactory`). The skill says the non-zero exit is expected.
- *CI read fails:* the new Watch CI paragraph applies: stop watching, and the reply says "pushed, deploy unverified" and quotes `gh`'s error, with no site fetch. Reply's "anything you couldn't do" line carries it into the message. Check's `gh run list` already falls back to the full gate (`|| last_passed=`).
- *Empty variable:* `gh api … --jq .value` prints nothing and exits 0. An unset variable fails with `gh: Not Found (HTTP 404)` (seen against the upstream repo, which has no `ARTIFACTORY_DOMAIN`). Both lead to the local URL `http://localhost:4321/<slug>/`.
- *Variable read fails:* a permission error prints `gh: Resource not accessible by personal access token (HTTP 403)` (seen against `cli/cli`). A network error prints `Get "https://api.github.com/…": … connection refused` (seen through a dead proxy). Both fall in "fails any other way": say the domain couldn't be read, quote the error, give `/<slug>/`, and build no template URL.

Known edge, left as the spec decided: GitHub also answers 404 for a private repo the token can't see, so that case reads as "not deployed". Watch CI would already have failed in that checkout, so the reply would also say "pushed, deploy unverified".

**Commits:** `588df78` (claim), `2e80067` (skill and README), plus this comment.

**Validation:** Markdown is outside Prettier's scope, so `pnpm check` doesn't cover these edits. The full `scripts/heavy pnpm check` result is recorded below.

**Left undone:** nothing in scope. `docs/agents/delegation.md` is ticket 02's file and wasn't touched.

### 2026-11-08: delegator's check of the gate

Delegator, Artifact generation gaps implementation session. The implementer ended its turn with its full check still running. That check (run `c6bdac69`, HEAD `29fe25b`) failed one test only: `tests/check/reporting.test.ts` › "attaches full success to actual tracked and nonignored working content without staging it" (`expected 'stale' to be 'current'`). The failure comes from the environment, not this change: the test fails the same way in the implementer's linked worktree with its HEAD at the unchanged base `6b935f9`, and passes on `6b935f9` in the main checkout. Fast-forwarded onto `gaps-implementation`. The full check runs again on the integration branch in the main checkout.

### 2026-11-09: resolved

Delegator, Artifact generation gaps implementation session. Fast-forwarded as `2e80067`. The `gh api` read of `ARTIFACTORY_DOMAIN`, recorded above, stands: the review's Spec axis found it the only way to read the copy's variable without `-R`. The README's extra note (pass `-R` to the owner's own `gh variable` and `gh secret`) is beyond the ticket. It was kept and reported to the owner.

- **Review:** a two-axis code review (Standards and Spec) of `gaps-implementation` since `6b935f9`. Its findings were fixed in `c018047`: they are listed on [look captures 05](../../look-captures/issues/05-hide-fixed-and-sticky-layers-during-every-shot.md#comments).
- **Check:** the full `pnpm check` passed on `ac82155`, the integration tip with the review fixes (`check.applicability: current`). All 9 opt-in Look tests passed on `c018047`.
- **Left undone:** nothing.
