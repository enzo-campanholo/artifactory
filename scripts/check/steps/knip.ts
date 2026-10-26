import { runTool } from "../run-tool.ts";
import { platformFailure, unexplainedExit, type Step } from "../step.ts";

interface KnipFinding {
  name: string;
  line?: number;
  col?: number;
}

type KnipIssue = { file: string } & Record<string, KnipFinding[] | string>;

const problemByType: Record<string, string> = {
  unlisted: "is used but not listed in package.json",
  binaries: "is used but not listed in package.json",
  unresolved: "can't be resolved",
  duplicates: "is exported more than once",
};

export const knip: Step = {
  name: "knip",
  async run(root) {
    const knipRun = await runTool(root, "knip", ["--reporter", "json", "--no-progress"]);
    if (!knipRun.stdout.startsWith("{")) return unexplainedExit("knip", "knip.ts", knipRun);
    const { issues } = JSON.parse(knipRun.stdout) as { issues: KnipIssue[] };
    return issues.flatMap(({ file, ...findingsByType }) =>
      Object.entries(findingsByType).flatMap(([type, findings]) =>
        typeof findings === "string"
          ? []
          : findings.map(({ name, line, col }) =>
              platformFailure(
                file,
                `knip/${type}`,
                `\`${name}\` ${problemByType[type] ?? "is unused"}`,
                line,
                col,
              ),
            ),
      ),
    );
  },
};
