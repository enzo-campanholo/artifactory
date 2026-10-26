import { componentError } from "./component-errors.ts";

// Every stepped part of a stepper names the steps it belongs to in `data-in-steps`, and starts on
// step 1. The custom element only compares those lists with the current step.

export function inSteps(steps: number[]): Record<string, string> {
  return { "data-in-steps": steps.join(" "), ...(steps.includes(1) ? {} : { "data-off": "" }) };
}

function inStepsText(steps: number[]): string {
  return Object.entries(inSteps(steps))
    .map(([name, value]) => ` ${name}="${value}"`)
    .join("");
}

function parseNumberList(list: string, last: number, context: string): number[] {
  return list.split(",").flatMap((item) => {
    const range = /^\s*(\d+)\s*(?:(-)\s*(\d*)\s*)?$/.exec(item);
    const from = Number(range?.[1]);
    const to = range?.[2] === undefined ? from : range[3] === "" ? last : Number(range[3]);
    if (range === null || from < 1 || to < from || to > last) {
      throw componentError(
        "Stepper",
        `${context} "${list}" must list numbers from 1 to ${String(last)}, such as "2", "2-4", "2-" or "1-2, 5"`,
      );
    }
    return Array.from({ length: to - from + 1 }, (_, index) => from + index);
  });
}

const dataStep = /\bdata-step=(?:"([^"]*)"|'([^']*)')/g;

// A printed figure shows its last step, so the parts in it are marked for the print stylesheet.
export function steppedFigure(svg: string): { svg: string; count: number } {
  const lists = [...svg.matchAll(dataStep)].map(([, double, single]) => double ?? single ?? "");
  const count = Math.max(0, ...lists.flatMap((list) => [...list.matchAll(/\d+/g)].map(Number)));
  return {
    svg: svg.replace(
      dataStep,
      (attribute, double: string | undefined, single: string | undefined) => {
        const steps = parseNumberList(double ?? single ?? "", count, "data-step");
        return attribute + inStepsText(steps) + (steps.includes(count) ? " data-in-last-step" : "");
      },
    ),
    count,
  };
}

const codeBlock = /<pre\b/g;
const codeLine = /<span class="line(?: [^"]*)?"/g;

export function steppedCode(
  html: string,
  lines: string[],
): { html: string; linesOfStep: number[][] } {
  if (html.match(codeBlock)?.length !== 1)
    throw componentError("Stepper", "put exactly one fenced code block inside `<Stepper lines>`");
  const lineCount = html.match(codeLine)?.length ?? 0;
  const linesOfStep = lines.map((list) => parseNumberList(list, lineCount, "lines"));
  let line = 0;
  return {
    html: html.replace(codeLine, (lineTag) => {
      line += 1;
      const steps = linesOfStep.flatMap((stepLines, index) =>
        stepLines.includes(line) ? [index + 1] : [],
      );
      return lineTag + inStepsText(steps);
    }),
    linesOfStep,
  };
}

export function lineRuns(lines: readonly number[]): { from: number; to: number }[] {
  const runs: { from: number; to: number }[] = [];
  for (const line of [...new Set(lines)].sort((a, b) => a - b)) {
    const last = runs.at(-1);
    if (last?.to === line - 1) last.to = line;
    else runs.push({ from: line, to: line });
  }
  return runs;
}

export function printedLines(
  lines: readonly number[],
  words: { line: string; lines: string },
): string {
  const runs = lineRuns(lines).map(({ from, to }) =>
    from === to ? String(from) : `${String(from)}–${String(to)}`,
  );
  return `${lines.length === 1 ? words.line : words.lines} ${runs.join(", ")}`;
}
