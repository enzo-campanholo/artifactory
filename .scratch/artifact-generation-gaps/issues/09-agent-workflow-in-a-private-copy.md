# 09: Agent workflow in a private copy

Type: grilling

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
