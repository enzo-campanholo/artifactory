import { componentError } from "./component-errors.ts";
import { numberList } from "./number-lists.ts";

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

function listed(list: string, first: number, last: number, context: string): number[] {
  const parsed = numberList(list, first, last);
  if ("refused" in parsed)
    throw componentError("Stepper", `${context} "${list}" ${parsed.refused}`);
  return parsed.numbers;
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
        const steps = listed(double ?? single ?? "", 1, count, "data-step");
        return attribute + inStepsText(steps) + (steps.includes(count) ? " data-in-last-step" : "");
      },
    ),
    count,
  };
}

const codeBlock = /<pre\b/g;
const markedBlock = /<pre\b[^>]*\sdata-marks\b/;
const codeLine = /<span class="line(?: [^"]*)?" data-line="(\d+)"/g;

// The block marks lines as `rich-content.css` greys them, with its lines outside the step `data-off`.
export function steppedCode(
  html: string,
  lines: string[],
): { html: string; linesOfStep: number[][] } {
  if (html.match(codeBlock)?.length !== 1)
    throw componentError("Stepper", "put exactly one fenced code block inside `<Stepper lines>`");
  if (markedBlock.test(html))
    throw componentError(
      "Stepper",
      "its code block marks lines with `{…}`, but a one-block Stepper marks them itself, step by step, with `lines`: take `{…}` off the fence",
    );
  const shown = [...html.matchAll(codeLine)].map(([, line]) => Number(line));
  const linesOfStep = lines.map((list) => listed(list, shown[0] ?? 1, shown.at(-1) ?? 0, "lines"));
  return {
    html: html.replace(codeBlock, "<pre data-marks").replace(codeLine, (lineTag, line: string) => {
      const steps = linesOfStep.flatMap((stepLines, index) =>
        stepLines.includes(Number(line)) ? [index + 1] : [],
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
