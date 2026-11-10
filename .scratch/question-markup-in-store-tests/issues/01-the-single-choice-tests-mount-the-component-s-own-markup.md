# 01: The single-choice tests mount the component's own markup

Status: ready-for-agent
Blocked by: None (can start immediately)

Spec: [Question markup in store tests](../spec.md). Tests and their Vitest setup only.

**What to build:** one helper that renders a question component with Astro's Container API and mounts the result under happy-dom, and `tests/store/single-choice.test.ts` using it in place of `mountSingleChoice`'s hand copy. The spec's [What the spike found](../spec.md#what-the-spike-found) has the lines that worked. Astro 7 is newer than your training: check the `astro-docs` MCP server before using the Container API.

The helper is the only place that touches the experimental API. Prefer a small `.mdx` fixture to a slot written as an HTML string, since the string is hand-copied markup again.

**The guard, first:** rendering needs a Vitest project that extends `getViteConfig()`, which runs every integration in `astro.config.ts` as `astro dev`. The `builtOutput` integration then deletes `.build/failures.json` whenever Vitest starts. Show that this can't disturb a `pnpm check` in progress or another command sharing the checkout: by what runs when, or by keeping that integration out of the project's config without changing production code. If neither holds, stop: write what you found in a dated comment, set this ticket to `needs-info`, and leave the choice to the owner.

- [ ] The closing comment says why the integrations running as `dev` can't disturb a check, with the evidence.
- [ ] One helper renders a question component as the build does and mounts it, and nothing else imports `astro/container`.
- [ ] `tests/store/single-choice.test.ts` mounts through the helper, its hand copy is gone, and every case in it still asserts what it did.
- [ ] A case that passed only because of the copy's drift is fixed in the test, or, if it shows a real fault in the element, reported in a dated comment and left failing for the owner to decide.
- [ ] Every other `tests/store`, `tests/scoring` and `tests/check` case passes unchanged, and Vitest stays on two workers.
- [ ] The closing comment records what the change adds to the store tests' run, in seconds, and the peak memory of a full `pnpm check`'s Vitest step against the 4 GB a heavy command gets.
- [ ] `CODING_STANDARDS.md` › Tests, seam 3's line, and `docs/agents/test-seams.md` › `tests/store` say the questions' markup is the components' own.

## Comments
