import type { Failure } from "../../../src/check-failure.ts";
import { runTool } from "../run-tool.ts";
import { matchLines } from "../match-lines.ts";
import { unexplainedExit, type Step } from "../step.ts";

const diagnostic =
  /^(?<file>\S.*)\((?<line>\d+),(?<column>\d+)\): error (?<code>TS\d+): (?<message>.*)$/;

const restrictedBuildProject = {
  project: "tsconfig.builds.json",
  buildInfo: "node_modules/.cache/tsc/builds.tsbuildinfo",
  skillSection: "Custom builds",
} as const;

// The Worker runs on Workers runtime types, which clash with the DOM and Node types the rest of the
// repo uses, so it is its own TypeScript program. Custom builds are another, with no DOM or Node
// types, so a build that reaches past the Stage fails at the global it names.
const projects = [
  {
    project: "tsconfig.json",
    buildInfo: "node_modules/.cache/tsc/platform.tsbuildinfo",
    skillSection: "Platform changes",
  },
  {
    project: "worker/tsconfig.json",
    buildInfo: "node_modules/.cache/tsc/worker.tsbuildinfo",
    skillSection: "Platform changes",
  },
  restrictedBuildProject,
] as const;

export const tsc: Step = {
  name: "tsc",
  run: (root) => checkProjects(root, projects),
};

export const restrictedBuildTypes: Step = {
  name: "restricted build tsc",
  run: (root) => checkProjects(root, [restrictedBuildProject]),
};

async function checkProjects(
  root: string,
  selectedProjects: readonly (typeof projects)[number][],
): Promise<Failure[]> {
  const failures: Failure[] = [];
  for (const { project, buildInfo, skillSection } of selectedProjects) {
    const tscRun = await runTool(root, "tsc", [
      "--noEmit",
      "--pretty",
      "false",
      "--incremental",
      "--tsBuildInfoFile",
      buildInfo,
      "-p",
      project,
    ]);
    const projectFailures = matchLines(tscRun.output, diagnostic, [
      "file",
      "line",
      "column",
      "code",
      "message",
    ]).map(({ file, line, column, code, message }) => ({
      file,
      line: Number(line),
      column: Number(column),
      ruleId: code,
      message,
      skillSection,
    }));
    failures.push(
      ...(projectFailures.length > 0 ? projectFailures : unexplainedExit("tsc", project, tscRun)),
    );
  }
  return failures;
}
