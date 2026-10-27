# artifactory

Agents publish study artifacts without asking. Every change outside `artifacts/` needs the owner's confirmation first.

## Two repos

The upstream repo is public. It holds the platform and one sample artifact, `artifacts/rsa-from-scratch/`, and its CI only checks. A checkout with an `upstream` remote is a private copy: it holds the owner's artifacts beside the sample, its CI deploys the site, and it matches upstream everywhere else.

- **The private copy** takes work on the owner's artifacts, making one public or private included, and anything run against the deployed site.
- **A checkout of the upstream repo** takes every other change: the platform, the sample artifact and the `.scratch/` tickets. The copy receives it from the Sync upstream workflow. When no upstream checkout is open, ask the owner for its path.
- Anything committed upstream is public: name only public artifacts in it.

## Agent docs

- **Platform:** before writing or reviewing platform or design-system code, read `CODING_STANDARDS.md`; before design-system work, `design-system/CLAUDE.md` too.
- **Tickets:** before filing, triaging, claiming or closing one in `.scratch/`, read `docs/agents/issue-tracker.md`.
- **Domain:** before naming a domain concept or contradicting an ADR, read `CODING_STANDARDS.md` › Domain language.
- **Delegation:** before delegating or resuming interrupted work, read `docs/agents/delegation.md`.

## Local checks

On NixOS, `node`, `pnpm` and `npx` exist only inside `nix develop`, so run every one of them through `scripts/heavy`, from the worktree root: `scripts/heavy pnpm check`, Prettier, ESLint, `tsc`, single test files (`scripts/heavy pnpm exec vitest run tests/store/device-copy.test.ts`) and scripts (`scripts/heavy node /absolute/path/to/screenshot-script.mjs`) included. Elsewhere, run them directly.

- `scripts/heavy`, `pnpm build`, `pnpm check` and `pnpm look` wait in one queue every worktree shares. A queued command prints `Waiting to run …` with the running command's PID and checkout: leave it waiting.
- Inside a queued command, run the unwrapped inner executable: `pnpm build`, `pnpm check` and `pnpm look` take the queue themselves, and the queue isn't re-entrant, so `scripts/heavy` around one of them inside another queued command is refused.
- End a turn only once every command you started has finished: the session ends with the turn and takes the command with it.
- Exit 137 means a process was killed. Each `scripts/heavy` command runs in a 3 GB scope of its own, first in line for the out-of-memory killer, so systemd-oomd kills the command rather than the agent: inspect memory and running jobs before retrying.
