import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { runTool } from "../run-tool.ts";
import { platformFailure, unexplainedExit, type Step } from "../step.ts";

interface VitestReport {
  testResults: {
    name: string;
    status: string;
    message: string;
    assertionResults: {
      fullName: string;
      status: string;
      failureMessages: string[];
      location?: { line: number; column: number };
    }[];
  }[];
}

export const vitest: Step = {
  name: "Vitest",
  async run(root) {
    const reportFile = join(tmpdir(), `artifactory-vitest-${String(process.pid)}.json`);
    // The default reporter too, because the JSON report drops the error of a hook inside a
    // `describe`: its file fails with an empty message and its tests are skipped.
    const vitestRun = await runTool(root, "vitest", [
      "run",
      "--reporter=json",
      `--outputFile.json=${reportFile}`,
      "--reporter=default",
      "--includeTaskLocation",
    ]);
    const report = await readFile(reportFile, "utf8").catch(() => undefined);
    await rm(reportFile, { force: true });
    if (report === undefined) return unexplainedExit("vitest", "vitest.config.ts", vitestRun);
    const { testResults } = JSON.parse(report) as VitestReport;
    let printed = false;
    const failures = testResults.flatMap(({ name, status, message, assertionResults }) => {
      const file = relative(root, name);
      const failedTests = assertionResults.filter((test) => test.status === "failed");
      if (status === "failed" && failedTests.length === 0) {
        if (!printed) console.log(vitestRun.output);
        printed = true;
        return [
          platformFailure(
            file,
            "vitest",
            firstLine(message) ||
              "failed outside its tests, in a hook or on import; Vitest's report is printed above",
          ),
        ];
      }
      return failedTests.map((test) =>
        platformFailure(
          file,
          "vitest",
          `${test.fullName}: ${firstLine(test.failureMessages[0] ?? "failed")}`,
          test.location?.line,
          test.location?.column,
        ),
      );
    });
    return failures.length > 0
      ? failures
      : unexplainedExit("vitest", "vitest.config.ts", vitestRun);
  },
};

function firstLine(text: string): string {
  return text.trim().split("\n")[0] ?? "";
}
