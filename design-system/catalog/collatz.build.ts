import { defineBuild, type CellChange, type Step } from "../src/stage-build.ts";

export default defineBuild<{ n: number }>({
  steps(input) {
    let { n } = input;
    let count: number | undefined;
    const values = (changed: ("n" | "steps")[]): CellChange[] => [
      {
        row: "n",
        column: "Value",
        text: String(n),
        mark: changed.includes("n") ? "strong" : undefined,
      },
      {
        row: "steps",
        column: "Value",
        text: count === undefined ? "—" : String(count),
        mark: changed.includes("steps") ? "strong" : undefined,
      },
    ];
    const steps: Step[] = [
      { say: `collatz gets n at ${String(n)}.`, lines: { 1: "reversed" }, cells: values(["n"]) },
    ];
    count = 0;
    steps.push({ say: "steps starts at 0.", lines: { 2: "reversed" }, cells: values(["steps"]) });
    while (n !== 1) {
      steps.push({
        say: `n is ${String(n)}, not 1, so the loop runs.`,
        lines: { 3: "reversed" },
        cells: values([]),
      });
      const even = n % 2 === 0;
      steps.push({
        say: `The remainder of ${String(n)} by 2 is ${even ? "0, so n is even" : "1, so n is odd"}.`,
        lines: { 3: "dashed", 4: "reversed" },
        cells: values([]),
      });
      const was = n;
      n = even ? n / 2 : 3 * n + 1;
      steps.push({
        say: even
          ? `n halves, from ${String(was)} to ${String(n)}.`
          : `n becomes three times ${String(was)} plus 1, ${String(n)}.`,
        lines: even
          ? { 3: "dashed", 4: "strong", 5: "reversed", 6: "muted", 7: "muted" }
          : { 3: "dashed", 4: "strong", 5: "muted", 7: "reversed" },
        cells: values(["n"]),
      });
      count += 1;
      steps.push({
        say: `steps goes up to ${String(count)}.`,
        lines: { 3: "dashed", 8: "reversed" },
        cells: values(["steps"]),
      });
    }
    steps.push({ say: "n is 1, so the loop ends.", lines: { 3: "reversed" }, cells: values([]) });
    steps.push({
      say: `collatz returns ${String(count)} steps.`,
      lines: { 9: "reversed" },
      rows: { steps: "reversed" },
      cells: values([]),
    });
    return steps;
  },
});
