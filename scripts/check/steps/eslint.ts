import { relative } from "node:path";
import { runTool } from "../run-tool.ts";
import { platformFailure, unexplainedExit, type Step } from "../step.ts";

interface EslintResult {
  filePath: string;
  messages: { ruleId: string | null; message: string; line?: number; column?: number }[];
}

export const eslint: Step = {
  name: "ESLint",
  async run(root) {
    const lint = await runTool(root, "eslint", ["--format", "json", "."]);
    if (!lint.stdout.startsWith("[")) return unexplainedExit("eslint", "eslint.config.ts", lint);
    const results = JSON.parse(lint.stdout) as EslintResult[];
    return results.flatMap(({ filePath, messages }) =>
      messages.map((message) =>
        platformFailure(
          relative(root, filePath),
          message.ruleId ?? "eslint",
          message.message,
          message.line,
          message.column,
        ),
      ),
    );
  },
};
