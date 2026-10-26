# Artifacts are MDX entries in a content collection, with dollar-sign math

Each artifact is a folder at `artifacts/<slug>/` whose entry is `index.mdx`, loaded by an Astro content collection. Its frontmatter is checked against a schema, and a bad field fails the build. Prose is cheap for agents to write in MDX, and design system components sit inline through explicit imports. Math is written as `$…$` and `$$…$$`, using Sätteri's math syntax and a plugin that renders through Temml at build time. Agents write LaTeX this way natively, and braces inside math can't be mistaken for MDX expressions.

We rejected two alternatives:

- **`.astro` pages** cost more tokens for prose. They can't be collection entries, so their metadata would be an exported constant we'd have to validate ourselves.
- **A `<M tex="…"/>` math component** is unambiguous but verbose for formula-heavy study material.

## Consequences

- A literal dollar sign must be written `\$`. Otherwise pt-BR money (`R$ 50 e R$ 30`) turns into math. No check can catch this, so the rule lives in the agent instructions.
- Moving away from MDX later means rewriting every artifact.
- The schema checks one entry at a time. Checks across artifacts, such as duplicate artifact IDs, need their own build step.
