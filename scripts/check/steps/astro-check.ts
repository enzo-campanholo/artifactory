import { runTool } from "../run-tool.ts";
import { matchLines } from "../match-lines.ts";
import { platformFailure, unexplainedExit, type Step } from "../step.ts";

const diagnostic =
  /^(?<file>\S.*):(?<line>\d+):(?<column>\d+) - (?:error|warning) (?<source>\w+)\((?<code>\d+)\): (?<message>.*)$/;

export const astroCheck: Step = {
  name: "astro check",
  async run(root) {
    const check = await runTool(root, "astro", [
      "check",
      "--noSync",
      "--minimumSeverity",
      "warning",
      "--minimumFailingSeverity",
      "warning",
    ]);
    const failures = matchLines(check.output, diagnostic, [
      "file",
      "line",
      "column",
      "source",
      "code",
      "message",
    ]).map(({ file, line, column, source, code, message }) =>
      platformFailure(
        file,
        source === "ts" ? `TS${code}` : `${source}(${code})`,
        message,
        Number(line),
        Number(column),
      ),
    );
    return failures.length > 0 ? failures : unexplainedExit("astro-check", "tsconfig.json", check);
  },
};
