# 09: Agent workflow in a private copy

Type: grilling
Status: resolved

## Question

What should the `artifact` skill and the agent docs change so that agents working in a private copy publish and verify reliably?

## What the agents reported

- **`gh` resolves to the upstream repo in a private copy** and in its worktrees, because the copy has an `upstream` remote. Agents had to pass `-R <owner>/<private repo>` to watch CI and read `ARTIFACTORY_DOMAIN`. One agent passed an upstream run's SHA to `pnpm check --last-passed`, and others concluded that the copy's CI wasn't running because they were reading upstream's runs.
- **A background check died when an implementer ended its turn early.** `CLAUDE.md` already says to end a turn only once every command has finished. The delegating agent had to resume the implementer and rerun the full gate.
- **A deploy can't be checked from outside.** Cloudflare Access redirects every private path to sign-in, even a slug that doesn't exist. When an agent can't read CI either, it has no way to confirm that a push went live, and agents reported "deploy unverified" again and again.
- **The site's address lives only in a repo variable.** An agent that couldn't read the variable reported a template URL.

## To decide

- Whether to set the default repo in a private copy (`gh repo set-default`, in setup or in the skill), or to make the skill always pass `-R`.
- Whether the briefs for delegated implementers should repeat the turn-ending rule, or the delegation doc should say how a delegator checks it.
- How an agent confirms a deploy without CI access. For example, the CI probe could leave evidence the agent can read, or the skill could have the agent report it as "pushed, deploy unverified".
- Where the site's domain should be readable from, if anywhere besides the variable.

## Answer

Decided with the owner on 2026-11-08 (grilling session, one round, every recommendation accepted). The changes are specified in [Private copy workflow](../../private-copy-workflow/spec.md).

- **Default repo:** in a checkout with an `upstream` remote, the `artifact` skill runs `gh repo set-default origin` (safe to rerun) before its first `gh` command, and the README setup runs it once too. Rejected: `-R` on every command, since one forgotten flag brings the bug back.
- **Early turn end:** briefs don't repeat the rule, which they already carry with `CLAUDE.md`'s `scripts/heavy` rules. Instead, a delegator accepts a child's passing check only when `scripts/heavy --status --json` shows `current` for the child's HEAD, and otherwise resumes the child.
- **Deploy confirmation:** CI's Probe step stays the only confirmation. When CI can't be read, the reply says "pushed, deploy unverified" and quotes the `gh` error. Rejected: a commit stamp on a public page or an always-open version path. That's platform work and a new public path to cover a token setting, which the owner reports fixed.
- **Domain:** `ARTIFACTORY_DOMAIN` stays the only source. The Reply step tells an empty variable (not deployed: local URL) from a failed read (say so, quote the error, give `/<slug>/`, never a template URL).
- No glossary entry: workflow, not domain. No ADR: easy to reverse.
