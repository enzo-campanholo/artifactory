import { defineBuild, type CellChange, type Step } from "../src/stage-build.ts";

export default defineBuild<{ a: number; b: number }>({
  steps({ a, b }, { code: [listing = []] }) {
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
    const [pushA, pushB, add, print] = listing;
    if (pushA === undefined || pushB === undefined || add === undefined || print === undefined) {
      return [{ say: "The listing needs four instructions." }];
    }
    const sum = a + b;
    const steps: Step[] = [
      {
        say: `${pushA.text} puts ${String(a)} on the stack.`,
        lines: { [pushA.line]: "reversed" },
        cells: values([a]),
      },
      {
        say: `${pushB.text} puts ${String(b)} on top of it.`,
        lines: { [pushB.line]: "reversed" },
        cells: values([a, b]),
      },
      {
        say: `${add.text} takes ${String(a)} and ${String(b)} off and pushes their sum, ${String(sum)}.`,
        lines: { [add.line]: "reversed" },
        cells: values([sum]),
      },
      {
        say: `${print.text} takes ${String(sum)} off the stack and prints it.`,
        lines: { [print.line]: "reversed" },
        cells: values([], sum),
      },
    ];
    return steps;
  },
});
