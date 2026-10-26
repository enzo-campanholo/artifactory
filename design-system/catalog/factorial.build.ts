import { defineBuild, type Step } from "../src/stage-build.ts";

export default defineBuild<{ n: number }>({
  steps(input) {
    let { n } = input;
    let f = 1;
    let row = "start";
    const body = [[row, String(n), String(f)]];
    const steps: Step[] = [];
    const step = (line: number, say: string, wrote?: "n" | "f") => {
      steps.push({
        say,
        lines: { [line]: "reversed" },
        body: body.map((cells) => [...cells]),
        cells: wrote === undefined ? [] : [{ row, column: wrote, mark: "strong" }],
      });
    };
    step(2, `f starts at 1, and n is ${String(n)}.`, "f");
    while (n > 1) {
      step(3, `n is ${String(n)}, more than 1, so the loop runs.`);
      const was = f;
      f = f * n;
      row = String(body.length);
      const cells = [row, String(n), String(f)];
      body.push(cells);
      step(4, `f becomes ${String(f)}, ${String(was)} times ${String(n)}.`, "f");
      n = n - 1;
      cells[1] = String(n);
      step(5, `n becomes ${String(n)}.`, "n");
    }
    step(3, `n is ${String(n)}, not more than 1, so the loop ends.`);
    steps.push({
      say: `factorial returns f, ${String(f)}.`,
      lines: { 6: "reversed" },
      body,
      rows: { [row]: "reversed" },
    });
    return steps;
  },
});
