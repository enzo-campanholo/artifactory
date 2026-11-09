import { defineBuild, type CellChange, type Step } from "../src/stage-build.ts";

export default defineBuild<{ a: number; b: number }>({
  steps({ a, b }) {
    let stack: number[] = [];
    let printed: number | undefined;
    const values = (changed: ("stack" | "printed")[]): CellChange[] => [
      {
        row: "stack",
        column: "Value",
        text: stack.length === 0 ? "—" : stack.join(" "),
        mark: changed.includes("stack") ? "strong" : undefined,
      },
      {
        row: "printed",
        column: "Value",
        text: printed === undefined ? "—" : String(printed),
        mark: changed.includes("printed") ? "strong" : undefined,
      },
    ];
    const steps: Step[] = [];
    stack = [a];
    steps.push({
      say: `push a puts ${String(a)} on the stack.`,
      lines: { 0: "reversed" },
      cells: values(["stack"]),
    });
    stack = [a, b];
    steps.push({
      say: `push b puts ${String(b)} on top of it.`,
      lines: { 1: "reversed" },
      cells: values(["stack"]),
    });
    stack = [a + b];
    steps.push({
      say: `add takes ${String(a)} and ${String(b)} off and pushes their sum, ${String(a + b)}.`,
      lines: { 2: "reversed" },
      cells: values(["stack"]),
    });
    printed = stack.pop();
    steps.push({
      say: `print takes ${String(printed)} off the stack and prints it.`,
      lines: { 3: "reversed" },
      cells: values(["stack", "printed"]),
    });
    return steps;
  },
});
