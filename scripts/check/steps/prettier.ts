import { runTool } from "../run-tool.ts";
import { platformFailure, unexplainedExit, type Step } from "../step.ts";

export const prettier: Step = {
  name: "Prettier",
  async run(root) {
    const prettierRun = await runTool(root, "prettier", ["--list-different", "."]);
    if (prettierRun.exitCode > 1) {
      return unexplainedExit("prettier", "prettier.config.ts", prettierRun);
    }
    return prettierRun.stdout
      .split("\n")
      .filter((file) => file !== "")
      .map((file) => platformFailure(file, "prettier", "is not formatted; run `pnpm format`"));
  },
};
