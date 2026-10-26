import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Worker } from "node:worker_threads";
import { Window } from "happy-dom";
import type { Typed } from "@artifactory/design-system/stage-build";
import {
  rowTexts,
  stageNodes,
  writtenContent,
  type Shown,
  type Written,
} from "@artifactory/design-system/step-applier";
import type { Failure } from "../../../src/check-failure.ts";
import { artifactsFolderItems } from "../../../src/artifacts.ts";
import { buildInputFailures } from "../build-input.ts";
import type { Job, Result, Thrown } from "../build-runner.ts";
import type { Step } from "../step.ts";

// A build answers in milliseconds, so one that takes this long for an option never returns.
const timeoutSeconds = 5;

interface StageOnPage {
  file: string;
  // The fields' names with `input`; nothing with `choose`.
  fields: string[] | undefined;
  inputs: (string | Typed)[];
  written: Written;
}

// Each Stage's build runs on every option or example against the content as the built page holds
// it, through the same step applier the page uses, so what passes here is what the page can show.
export const customBuildRuns: Step = {
  name: "custom build runs",
  async run(root) {
    const stages = await stagesOnPages(root);
    const failures = buildInputFailures(root, stages);
    for (const stage of stages) failures.push(...(await runStage(root, stage)));
    return failures;
  },
};

async function stagesOnPages(root: string): Promise<StageOnPage[]> {
  const slugs = (await artifactsFolderItems(root))
    .filter((item) => item.isDirectory())
    .map(({ name }) => name);
  const stages: StageOnPage[] = [];
  for (const slug of slugs) {
    const page = join(root, "dist", slug, "index.html");
    if (!existsSync(page)) continue;
    const html = await readFile(page, "utf8");
    if (!html.includes("<artifact-stage")) continue;
    const document = new new Window().DOMParser().parseFromString(html, "text/html");
    for (const element of document.querySelectorAll("artifact-stage")) {
      const file = (element.getAttribute("data-build") ?? "").replace(/^\//, "");
      if (!existsSync(join(root, file))) continue;
      const examples = element.querySelector(".stage-input")?.getAttribute("data-examples");
      stages.push({
        file,
        fields:
          examples == null
            ? undefined
            : [...element.querySelectorAll(".stage-field input")].map(
                (input) => input.getAttribute("name") ?? "",
              ),
        inputs:
          examples == null
            ? [...element.querySelectorAll(".stage-option input")].map(
                (input) => input.getAttribute("value") ?? "",
              )
            : (JSON.parse(examples) as Typed[]),
        written: writtenContent(stageNodes(element as unknown as Element)),
      });
    }
  }
  return stages;
}

function runStage(
  root: string,
  { file, fields, inputs, written }: StageOnPage,
): Promise<Failure[]> {
  const failures: Failure[] = [];
  const fail = (message: string, line = 1, column = 1) => {
    failures.push({
      file,
      line,
      column,
      ruleId: "stage-run",
      message,
      skillSection: "Custom builds",
    });
  };
  const job: Job = { file: join(root, file), inputs, written };
  const worker = new Worker(new URL("../build-runner.ts", import.meta.url), { workerData: job });
  const waiting = [...inputs];
  return new Promise((resolve) => {
    let timer: NodeJS.Timeout | undefined;
    const finish = () => {
      clearTimeout(timer);
      void worker.terminate();
      resolve(failures);
    };
    const wait = () => {
      clearTimeout(timer);
      if (waiting.length === 0) {
        finish();
        return;
      }
      timer = setTimeout(() => {
        fail(
          `with \`${named(waiting[0] ?? "", fields)}\`, \`steps\` didn't return within ${String(timeoutSeconds)} seconds`,
        );
        finish();
      }, timeoutSeconds * 1000);
    };
    worker.on("message", (result: Result) => {
      if (!result.loaded) {
        fail(`can't be loaded: ${result.error.message}`, ...placeIn(result.error, job.file));
        finish();
        return;
      }
      const first = waiting.length === inputs.length;
      waiting.shift();
      const { input, run } = result;
      const withOption = `with \`${named(input, fields)}\`,`;
      if (!("refused" in run)) {
        const last = run.steps.at(-1);
        if (first && fields !== undefined && last !== undefined) {
          for (const difference of writtenResultDifferences(written, last)) {
            fail(`${withOption} the first example, ${difference}`);
          }
        }
        wait();
        return;
      }
      if (run.refused === "problems") {
        for (const { step, problem } of run.problems) {
          fail(`${withOption} step ${String(step)} ${problem}`);
        }
      } else if (run.refused === "threw") {
        fail(
          `${withOption} \`steps\` throws: ${run.error.message}`,
          ...placeIn(run.error, job.file),
        );
      } else if (run.refused === "no-steps") {
        fail(`${withOption} \`steps\` returns no steps; give it at least one`);
      } else if (run.refused === "not-a-list") {
        fail(`${withOption} \`steps\` returns something that isn't a list of steps`);
      } else {
        fail(`${withOption} \`steps\` returns more than ${String(run.most)} steps`);
      }
      wait();
    });
    worker.on("error", (error) => {
      fail(`can't be run: ${error.message}`);
      finish();
    });
    wait();
  });
}

// An example reads as its numbers in the fields' order, as `pnpm look` prints it: `a = 48, b = 18`.
function named(input: string | Typed, fields: string[] | undefined): string {
  return typeof input === "string"
    ? input
    : (fields ?? []).map((name) => `${name} = ${String(input[name])}`).join(", ");
}

// With `input`, the content as written is the first example's result, so its tables are what that
// example's last step leaves in them, row for row, those `body` adds or drops included.
function writtenResultDifferences(written: Written, last: Shown): string[] {
  const fix = "write the tables as the first example leaves them";
  return written.tables.flatMap(({ columns, rows }, table) => {
    const lastRows = (last.tables[table] ?? []).map((cells) => cells.map(({ text }) => text));
    return Array.from({ length: Math.max(rows.length, lastRows.length) }, (_, row) => {
      const asWritten = rows[row];
      const lastRow = lastRows[row];
      if (asWritten === undefined) {
        const added = lastRow ?? [];
        return [
          `the last step leaves the row \`${added[0] ?? ""}\` (${rowTexts(added)}) after the table's last row as written; ${fix}`,
        ];
      }
      if (lastRow === undefined) {
        return [
          `the table as written has the row \`${asWritten[0] ?? ""}\` (${rowTexts(asWritten)}) after the last step's last row; ${fix}`,
        ];
      }
      return asWritten.flatMap((text, column) => {
        const lastText = lastRow[column] ?? "";
        if (lastText === text) return [];
        return [
          `the last step leaves \`${lastText}\` in the row \`${asWritten[0] ?? ""}\` and the column \`${columns[column] ?? ""}\`, and the table as written has \`${text}\`; ${fix}`,
        ];
      });
    }).flat();
  });
}

function placeIn({ stack }: Thrown, file: string): [number, number] | [] {
  const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const [, line, column] = new RegExp(String.raw`${escaped}:(\d+):(\d+)`).exec(stack) ?? [];
  return line === undefined || column === undefined ? [] : [Number(line), Number(column)];
}
