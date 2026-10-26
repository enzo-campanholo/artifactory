import { existsSync } from "node:fs";
import { join } from "node:path";
import { getAstroLanguagePlugin } from "@astrojs/language-server/dist/core/index.js";
import { createMdxLanguagePlugin } from "@mdx-js/language-service";
import { createTypeScriptChecker } from "@volar/kit";
import remarkMath from "remark-math";
import typescript from "typescript";
import { create as createTypeScriptServices } from "volar-service-typescript";
import type { Failure } from "../../../src/check-failure.ts";
import { artifactsFolderItems } from "../../../src/artifacts.ts";
import type { Step } from "../step.ts";

// LSP's DiagnosticSeverity: 1 is an error, 2 a warning, 3 and 4 information and hints.
const warningSeverity = 2;

// `astro check` skips MDX, so this type-checks artifact entries the way the MDX editor extension
// does. remark-math keeps the braces in `$…$` from reading as JavaScript expressions.
export const artifactTypes: Step = {
  name: "artifact types",
  async run(root) {
    const entries = (await artifactsFolderItems(root))
      .filter((item) => item.isDirectory())
      .map(({ name }) => `artifacts/${name}/index.mdx`)
      .filter((entry) => existsSync(join(root, entry)));
    if (entries.length === 0) return [];
    const checker = createTypeScriptChecker(
      [getAstroLanguagePlugin(), createMdxLanguagePlugin([remarkMath], undefined, true, "astro")],
      createTypeScriptServices(typescript),
      join(root, "tsconfig.json"),
    );
    const failures: Failure[] = [];
    for (const entry of entries) {
      const diagnostics = await checker.check(join(root, entry));
      for (const { severity, range, code, message } of diagnostics) {
        if (severity !== undefined && severity > warningSeverity) continue;
        failures.push({
          file: entry,
          line: range.start.line + 1,
          column: range.start.character + 1,
          ruleId: `TS${String(code)}`,
          message: mostSpecificLine(typeof message === "string" ? message : message.value),
          skillSection: "Components",
        });
      }
    }
    return failures;
  },
};

// TypeScript explains an error from the outside in, so its last line names the actual problem,
// such as the missing prop.
function mostSpecificLine(message: string): string {
  return message.trim().split("\n").at(-1)?.trim() ?? message;
}
