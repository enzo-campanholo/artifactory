import { defineBuild, type CellChange, type Step } from "../src/stage-build.ts";

export default defineBuild<{ a: number; b: number }>({
  steps(input) {
    let { a, b } = input;
    const values = (wrote: ("a" | "b")[]): CellChange[] =>
      (["a", "b"] as const).map((row) => ({
        row,
        column: "Value",
        text: String(row === "a" ? a : b),
        mark: wrote.includes(row) ? "strong" : undefined,
      }));
    const steps: Step[] = [
      {
        say: `gcd starts with a at ${String(a)} and b at ${String(b)}.`,
        cells: values(["a", "b"]),
      },
    ];
    while (b !== 0) {
      [a, b] = [b, a % b];
      steps.push({
        say: `a takes b's value, ${String(a)}, and b takes the remainder, ${String(b)}.`,
        cells: values(["a", "b"]),
      });
    }
    steps.push({
      say: `b is 0, so the gcd is ${String(a)}.`,
      rows: { a: "reversed" },
      cells: values([]),
    });
    return steps;
  },
});
