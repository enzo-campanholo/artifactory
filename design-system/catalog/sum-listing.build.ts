import { defineBuild, type CellChange, type Step } from "../src/stage-build.ts";

export default defineBuild<{ a: number; b: number }>({
  steps({ a, b }) {
    const values = (stack: number[], printed?: number): CellChange[] => [
      {
        row: "stack",
        column: "Value",
        text: stack.length === 0 ? "—" : stack.join(" "),
        mark: "strong",
      },
      {
        row: "printed",
        column: "Value",
        text: printed === undefined ? "—" : String(printed),
        mark: printed === undefined ? undefined : "strong",
      },
    ];
    const sum = a + b;
    const steps: Step[] = [
      {
        say: `push a puts ${String(a)} on the stack.`,
        lines: { 0: "reversed" },
        cells: values([a]),
      },
      {
        say: `push b puts ${String(b)} on top of it.`,
        lines: { 1: "reversed" },
        cells: values([a, b]),
      },
      {
        say: `add takes ${String(a)} and ${String(b)} off and pushes their sum, ${String(sum)}.`,
        lines: { 2: "reversed" },
        cells: values([sum]),
      },
      {
        say: `print takes ${String(sum)} off the stack and prints it.`,
        lines: { 3: "reversed" },
        cells: values([], sum),
      },
    ];
    return steps;
  },
});
