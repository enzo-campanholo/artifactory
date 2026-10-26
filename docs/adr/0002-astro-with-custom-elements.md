# Astro static site with custom elements for interactivity

artifactory is built with Astro 7 using static output. The Library and every artifact are prerendered pages. Math, code and diagrams render during the build, so a syntax error fails the build instead of reaching the owner while they study. Interactive parts such as quizzes, question boxes and visualizations are custom elements in plain TypeScript. Each one adds behaviour to markup that Astro has already rendered. There are no React, Svelte or Preact islands.

We chose Astro over two alternatives:

- **SvelteKit 3**, which runs JavaScript for a whole page when the page has one quiz, and had just renamed many APIs.
- **Eleventy**, whose templates give agents no type checks and whose governance is in flux.

We chose custom elements over framework islands for three reasons:

- Agents have one way to build interactivity.
- There's no runtime or `client:*` directive for an agent to forget.
- They survive a later change of framework.

## Consequences

- Astro ships major versions often (three in 18 months), so versions are pinned exactly and upgraded on purpose.
- The design system is its own pnpm workspace package, so impeccable finds `design-system/PRODUCT.md` (`impeccable live --target design-system`). Its catalog pages live in the package but are built into the platform site at `/catalog/` through the package's `catalog()` integration, not as a separate Astro site, because diagrams and math render through the platform's config. Impeccable live attaches to the catalog through the root dev server.
- Cloudflare has owned Astro since 2026-01. This counted neither for nor against it.
