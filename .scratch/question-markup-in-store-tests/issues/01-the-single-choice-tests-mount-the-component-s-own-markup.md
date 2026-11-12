# 01: The single-choice tests mount the component's own markup

Status: claimed
Blocked by: None (can start immediately)

Spec: [Question markup in store tests](../spec.md). Tests and their Vitest setup only.

**What to build:** one helper that renders a question component with Astro's Container API and mounts the result under happy-dom, and `tests/store/single-choice.test.ts` using it in place of `mountSingleChoice`'s hand copy. The spec's [What the spike found](../spec.md#what-the-spike-found) has the lines that worked. Astro 7 is newer than your training: check the `astro-docs` MCP server before using the Container API.

The helper is the only place that touches the experimental API. Prefer a small `.mdx` fixture to a slot written as an HTML string, since the string is hand-copied markup again.

**The guard, first:** rendering needs a Vitest project that extends `getViteConfig()`, which runs every integration in `astro.config.ts` as `astro dev`. The `builtOutput` integration then deletes `.build/failures.json` whenever Vitest starts. Show that this can't disturb a `pnpm check` in progress or another command sharing the checkout: by what runs when, or by keeping that integration out of the project's config without changing production code. If neither holds, stop: write what you found in a dated comment, set this ticket to `needs-info`, and leave the choice to the owner.

- [x] The closing comment says why the integrations running as `dev` can't disturb a check, with the evidence.
- [x] One helper renders a question component as the build does and mounts it, and nothing else imports `astro/container`.
- [x] `tests/store/single-choice.test.ts` mounts through the helper, its hand copy is gone, and every case in it still asserts what it did.
- [x] A case that passed only because of the copy's drift is fixed in the test, or, if it shows a real fault in the element, reported in a dated comment and left failing for the owner to decide.
- [x] Every other `tests/store`, `tests/scoring` and `tests/check` case passes unchanged, and Vitest stays on two workers.
- [x] The closing comment records what the change adds to the store tests' run, in seconds, and the peak memory of a full `pnpm check`'s Vitest step against the 4 GB a heavy command gets.
- [x] `CODING_STANDARDS.md` › Tests, seam 3's line, and `docs/agents/test-seams.md` › `tests/store` say the questions' markup is the components' own.

## Comments

### 2026-11-11: implementation

Implementation sub-agent, branch `impl/question-markup-in-store-tests-01`. Commits: `12f8926` (claim), `98ff258` (helper, fixture, test, Vitest project), `10d6eda` (`CODING_STANDARDS.md` › Tests and `docs/agents/test-seams.md` › `tests/store`).

**The guard holds, by keeping `builtOutput` out of the project's config.** `vitest.config.ts` gains a `store` project built with `getViteConfig()`, given the production config from `astro.config.ts` inline with `configFile: false` and every integration except `built-output`. No production code changed. Evidence:

- With `.build/failures.json` written as a sentinel, `vitest run --project store` (16 files, 216 tests) left it in place, mtime unchanged, and created no `.astro/`.
- The same run with `getViteConfig()` given no inline config, so the production config read from `astro.config.ts`, deleted the sentinel. The filter does the work.
- The other integrations touch no file as `dev`: `catalog` only injects routes, `stageBuilds` returns unless `command === "build"`, and `richContent` writes to `.build/failures.json` only when content fails to render, which a valid fixture never does.
- By order too: in a `pnpm check`, the build step reads `.build/failures.json` as soon as `astro build` exits, and Vitest starts last, after `astro check` (whose own setup hook already clears the file). The heavy queue keeps any other build, check or look in the checkout from running beside it.

**What was built.**

- `tests/store/rendered-question.ts` is the only importer of `astro/container`. It renders an `.mdx` fixture with the MDX container renderer, through the site's Markdown pipeline, strips the page's scripts and mounts the result through a `<template>`. A file that renders runs in node, because Vitest transforms a DOM-environment file for the client, where Astro won't render. So the helper sets up Vitest's own happy-dom environment on import (`builtinEnvironments["happy-dom"]`, with the same page, URL and teardown the other store files get), and a test file imports it before any element.
- Importing a rendered script's own `src` (`SingleChoice.astro?astro&type=script…`) doesn't define the element under the SSR transform, so the test file imports the element module itself, as before.
- `tests/store/capital.mdx` is the fixture: the same question, options and explanation the hand copy had. `single-choice.test.ts` mounts it, with the hand copy gone and every assertion unchanged. The Check button is now found as `.question-check`, since the real markup's first button is that one anyway.
- Every one of the 10 cases passed on the real markup at once. No case had passed only because of the copy's drift. Removing the fixture's explanation fails all 10 (`not mounted`), so they read the rendered markup.

**Cost.**

- Store tests' run (`vitest run tests/store`, three runs each, wall clock): 11.07 s mean before, 11.94 s after, about **+0.9 s**. Vitest's own Duration rose 10.23 s → 10.54 s, its transform 0.35 s → 1.05 s.
- The store tests' own peak (the heavy scope's `memory.peak`): 398 MiB → 587 MiB.
- A full `pnpm check` at `10d6eda` passed, with Vitest taking 414 s. Sampling every heavy scope's `memory.current` every 0.25 s through the Vitest step gave these peaks:
  - the scope holding Vitest and its two workers: **1.30 GiB** of its 4 GB;
  - the largest fixture check's own scope: 2.42 GiB;
  - every scope in the heavy slice summed at one instant: 3.63 GiB.
- Vitest stays on two workers (`maxWorkers: 2` unchanged).

**Shared parts reached:** none. Tests and their Vitest setup only.

**Left for ticket 02:** `numeric-question.test.ts` and `matching.test.ts` still mount hand copies, which the new seam 3 line now rules out. Ticket 02 moves them onto the helper, with a fixture per kind. The `store` project already includes all of `tests/store`, so 02 needs no config change.
