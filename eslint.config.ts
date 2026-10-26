import js from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import astro from "eslint-plugin-astro";
import sonarjs from "eslint-plugin-sonarjs";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["dist/", ".astro/", ".claude/", "artifacts/", "sources/"] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  astro.configs.recommended,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    linterOptions: { reportUnusedDisableDirectives: "error", reportUnusedInlineConfigs: "error" },
    plugins: { sonarjs },
    rules: {
      "sonarjs/no-commented-code": "error",
      "no-warning-comments": ["error", { terms: ["todo", "fixme"], location: "anywhere" }],
      "no-console": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/design-system/src/**"],
              message: "Import from @artifactory/design-system's exports.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.astro"],
    languageOptions: { parserOptions: { projectService: false, project: true } },
    // astro-eslint-parser types template elements as errors, so mapping data to elements would
    // read as an unsafe return.
    rules: { "@typescript-eslint/no-unsafe-return": "off" },
  },
  {
    files: ["design-system/catalog/*.build.ts"],
    languageOptions: {
      parserOptions: { projectService: false, project: "./tsconfig.builds.json" },
    },
  },
  {
    files: ["scripts/**"],
    rules: { "no-console": "off" },
  },
  {
    files: ["tests/**"],
    plugins: { vitest },
    rules: {
      "vitest/expect-expect": "error",
      "vitest/no-restricted-vi-methods": [
        "error",
        { mock: "Use fixtures, not mocks.", doMock: "Use fixtures, not mocks." },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[property.name=/^to(Match|ThrowErrorMatching)(Inline|File)?Snapshot$/]",
          message: "Assert on values from an independent source, not snapshots.",
        },
      ],
    },
  },
);
