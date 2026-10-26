# artifactory

Agents publish study artifacts without asking. Every change outside `artifacts/` needs the owner's confirmation first.

A checkout with an `upstream` remote is a private copy: it holds the owner's artifacts and matches upstream everywhere else. Make every change outside `artifacts/` in a checkout of the upstream repo instead; the copy receives it from the Sync upstream workflow.

Astro 7 is newer than your training: check the `astro-docs` MCP server before using any Astro API.

A change to the artifact workflow or to what `pnpm check` reports updates the `artifact` skill in the same commit.

Read `CODING_STANDARDS.md` before writing or reviewing platform or design system code, and `design-system/CLAUDE.md` before changing the design system.

## Where things live

- `src/`: the platform: the artifacts collection, the pages (Library, drafts page, artifact route) and the build integrations for math, code, D2 and the checks on built pages.
- `scripts/check/`: the gate behind `pnpm check`.
- `worker/`: the Worker serving the site and the state API. `pnpm dev:worker` runs it locally behind an Access stand-in with the real HTTP transport. `pnpm dev` and `pnpm build` use throwaway state unless `PUBLIC_STATE_TRANSPORT=http` is set.
- `sources/`: git-ignored source material.

## Agent docs

- **Issues:** local markdown under `.scratch/<feature>/`, with `Status:` lines from `docs/agents/triage-labels.md`. Read `docs/agents/issue-tracker.md` before filing, claiming or closing one.
- **Delegation:** read `docs/agents/delegation.md` before delegating or resuming interrupted work.
- **Domain:** `GLOSSARY.md` and `docs/adr/`. Read `docs/agents/domain.md` before naming a domain concept or contradicting a decision.

## Local checks

On NixOS, `node`, `pnpm` and `npx` exist only inside `nix develop`, so run every one of them through `scripts/heavy`, from the worktree root, Prettier, ESLint, `tsc` and single test files included. Elsewhere, run them directly.

```sh
scripts/heavy pnpm check
scripts/heavy pnpm exec vitest run tests/store/device-copy.test.ts
scripts/heavy node /absolute/path/to/screenshot-script.mjs
```

`scripts/heavy` runs the command in its own 3 GB scope, first in line for the out-of-memory killer, so systemd-oomd kills the command rather than the agent. It also puts the command in the one queue every worktree shares, which `pnpm build`, `pnpm check` and `pnpm look` take themselves.

- A queued command prints `Waiting to run …` with the running command's PID and checkout. Leave it waiting.
- A server and the browser script that uses it go in one command.
- Never end a turn while a command you started is running: the session ends with the turn and takes the command with it.
- Keep Vitest on the single worker `vitest.config.ts` sets.
- Exit 137 means a process was killed: inspect memory and running jobs before retrying.
