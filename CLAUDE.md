# artifactory

Agents publish study artifacts without asking. Every change outside `artifacts/` needs the owner's confirmation first.

Before writing or reviewing platform or design system code, read `CODING_STANDARDS.md`; before changing the design system, read `design-system/CLAUDE.md` too.

## Two repos

The upstream repo is public. It holds the platform and one sample artifact, `artifacts/rsa-from-scratch/`, and its CI only checks. A checkout with an `upstream` remote is a private copy: it holds the owner's artifacts beside the sample, its CI deploys the site, and it matches upstream everywhere else.

- **The private copy** takes work on the owner's artifacts, making one public or private included, and anything run against the deployed site.
- **A checkout of the upstream repo** takes every other change: the platform, the sample artifact and the `.scratch/` tickets. The copy receives it from the Sync upstream workflow. When no upstream checkout is open, ask the owner for its path.
- Upstream's only artifact is the sample, so platform work there is shown against fixtures and the sample, and against the owner's artifacts only in the copy.
- Anything committed upstream is public: name only public artifacts in it.

## Where things live

- `src/`: the platform: the artifacts collection, the pages (Library, drafts page, artifact route) and the build integrations for math, code, D2 and the checks on built pages.
- `worker/`: the Worker serving the site and the state API. `pnpm dev:worker` runs it locally behind an Access stand-in with the real HTTP transport. `pnpm dev` and `pnpm build` use throwaway state unless `PUBLIC_STATE_TRANSPORT=http` is set.

## Agent docs

- **Issues:** before filing, claiming or closing a ticket in `.scratch/<feature>/`, read `docs/agents/issue-tracker.md`.
- **Delegation:** before delegating or resuming interrupted work, read `docs/agents/delegation.md`.
- **Domain:** before naming a domain concept or contradicting an ADR, read `docs/agents/domain.md`.

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
- End a turn only once every command you started has finished: the session ends with the turn and takes the command with it.
- Exit 137 means a process was killed: inspect memory and running jobs before retrying.
