import type { Failure } from "../../src/check-failure.ts";
import type { ToolRun } from "./run-tool.ts";

export interface Step {
  name: string;
  // Whether the step's result can depend on this file. A step that says so isn't run again while
  // every file it reads is as it was when the step last passed.
  reads?: (file: string) => boolean;
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
