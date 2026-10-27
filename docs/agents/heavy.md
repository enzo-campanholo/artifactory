# Heavy commands

The `scripts/heavy` rules past the ones in `CLAUDE.md`'s Local checks.

`scripts/heavy` runs the command in its own 3 GB scope, first in line for the out-of-memory killer, so systemd-oomd kills the command rather than the agent.

- **A server and the browser script that uses it go in one command.**
- **Inside a heavy job, use the unwrapped inner executable:** `pnpm build`, `pnpm check` and `pnpm look` take the queue themselves, and the queue isn't re-entrant, so `scripts/heavy` around one of them inside another queued command is refused.
- **Keep Vitest on the single worker `vitest.config.ts` sets.**
