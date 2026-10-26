import type { Failure } from "../../src/check-failure.ts";
import type { ToolRun } from "./run-tool.ts";

export interface Step {
  name: string;
  run(root: string): Promise<Failure[]>;
}

export function platformFailure(
  file: string,
  ruleId: string,
  message: string,
  line = 1,
  column = 1,
): Failure {
  return { file, line, column, ruleId, message, skillSection: "Platform changes" };
}

export function unexplainedExit(tool: string, configFile: string, run: ToolRun): Failure[] {
  if (run.exitCode === 0) return [];
  console.log(run.output);
  return [
    platformFailure(
      configFile,
      tool,
      `exited with code ${String(run.exitCode)} without a failure the check could read; its output is printed above`,
    ),
  ];
}
