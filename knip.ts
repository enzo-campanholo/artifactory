import type { KnipConfig } from "knip";

// Knip doesn't read plain CSS. Turning a stylesheet's `@import` and `url()` references into
// imports counts the packages they load as used. A `data:` URL is inline content, not a module.
function cssImports(text: string): string {
  return [...text.matchAll(/(?:@import\s+|url\()\s*["'](?!data:)([^"']+)["']/g)]
    .map(([, specifier]) => `import "${specifier ?? ""}";`)
    .join("\n");
}

export default {
  compilers: { css: cssImports, mdx: true },
  workspaces: {
    ".": {
      // `pnpm check` and `pnpm look` start these through scripts/heavy-command.ts, which knip
      // doesn't see past, and a Stage loads its build by name.
      entry: [
        "tests/**/*.test.ts",
        "artifacts/*/index.mdx",
        "artifacts/*/*.build.ts",
        "scripts/check/main.ts",
        "scripts/look.ts",
        "scripts/verify-browser.ts",
      ],
      project: ["**/*.{ts,astro,mdx,css}"],
      typescript: { config: ["tsconfig.json", "worker/tsconfig.json"] },
      // The root Vitest config lists only projects, so knip would fall back to Vitest's default test
      // patterns, which count any *.spec.ts as a test.
      vitest: { entry: ["tests/**/*.test.ts"] },
      // `cloudflare:test` and `cloudflare:workers` are Workers runtime modules, `build-id` and
      // `question-manifest` are build output aliased in wrangler.jsonc, and scripts/dev-worker.ts runs
      // wrangler as a command knip doesn't see.
      ignoreDependencies: [
        "@astrojs/check",
        "build-id",
        "cloudflare",
        "question-manifest",
        "wrangler",
      ],
      // scripts/heavy-command.ts starts its command through the machine's own systemd, not a package.
      ignoreBinaries: ["systemd-run"],
    },
    "design-system": {
      // The catalog integration injects these pages as routes, and a Stage loads its build by name,
      // neither of which knip follows.
      entry: ["catalog/pages/*.astro", "catalog/*.build.ts"],
      project: ["{src,catalog}/**/*.{ts,astro,css,mdx}"],
    },
  },
} satisfies KnipConfig;
