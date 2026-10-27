# Browser verification

How to see a platform or design-system change in a browser: the catalog, the components each shared part reaches, and `scripts/verify-browser.ts`. `CODING_STANDARDS.md` says when each is due.

## Catalog

Its pages are in `design-system/catalog/`, and `pnpm dev` at the repo root serves it at `/catalog/`. Every page renders inside the artifact page's frame (`design-system/src/ArtifactFrame.astro`), as an artifact does. Each question state has its own page, `/catalog/<state>/`, one per key of `catalogStates` in `catalog/states.ts`; `/catalog/short/` and `/catalog/many-questions/` show the frame's ranges; and `?lang=pt-BR` shows the Portuguese labels.

## Shared parts

Among the shared parts `CODING_STANDARDS.md` lists:

- `SvgImage.astro` sizes both `Figure` and `Diagram`.
- `page.css` draws the end of the page, rule, heading and revisit rows, for both the artifact page and the Library.
- `math.css` sets math for rich content and the Library's revisit rows.
- `figure.css` frames `Figure`, `Diagram` and `Stage`.
- `StepControls.astro` and `page.css`'s `step-` row draw the `Stepper`'s and the `Stage`'s counter and arrows.
- `statement-blocks.css` spaces both `Statement` and `Proof`.
- `d2-board.ts` draws both `Diagram` and diagram `Stepper` boards.

## A real browser

Put a server and the browser script that uses it in one `scripts/heavy` command.

To review a change in a real browser, build first, then run `node scripts/verify-browser.ts <artifact-slug> [--dist <built-directory>]`. It serves the built output and never builds, so the build must include `/catalog/eye/` and an artifact of your own, made with `pnpm new`, that has questions and a table that overflows at 393 px. It writes `.look/<slug>/browser/results.json` and a contact sheet. Exit 0 means every required assertion passed, 2 a bad argument or missing build, and 1 a failed, unavailable or unsupported case. Its output hashes identify the files it inspected, not the commit that built them, and its captures still need a person to judge them.

The automated browser acceptance, the last item [`tests/check`](test-seams.md#1-testscheck) owns, runs only with `ARTIFACTORY_BROWSER_ACCEPTANCE=1`: `ARTIFACTORY_BROWSER_ACCEPTANCE=1 pnpm exec vitest run tests/check/browser-verification.test.ts`. Real screen readers and physical devices stay outside it.
