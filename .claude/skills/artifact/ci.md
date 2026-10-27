# Check and CI details

## Skipping Vitest

`--last-passed` skips only Vitest, and only when every changed or untracked file is under `artifacts/`, `.scratch/` or `docs/`, or nothing changed. A platform file or an untracked root file runs the tests; an unavailable comparison SHA runs them too. The log gives the reason. Ordinary `pnpm check` always runs Vitest.

## Deploy steps

What each red step after the check means on `main`:

- **Close public paths** red: nothing was deployed, and an artifact going private may still be open.
- **Open public paths** red: the new version is live, but an artifact going public may still be behind the sign-in.
- **Probe** red: the new version is live, but a path is open or closed that shouldn't be, such as an artifact going public still behind the sign-in or one going private still open.

Rerun once with `gh run rerun <id>` and watch it. If the step is red again, tell the owner what its log says. For Close or Open, give its last lines (`gh run view <id> --log-failed | tail -n 20`): a missing token, a Cookie Path Attribute that's on, or another Access app using the public artifacts' policy is theirs to fix in GitHub's or Cloudflare's settings. For the Probe, give its `OFF` lines (`gh run view <id> --log-failed | grep ' OFF '`): each names a path, what it should answer and what it answered.
