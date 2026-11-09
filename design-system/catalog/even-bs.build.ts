import { defineBuild, type CellChange, type Step } from "../src/stage-build.ts";

export default defineBuild<{ w: string }>({
  steps(input) {
    const symbols = Array.from(input.w);
    let state = "q0";
    const values = (read: number, accepts = "—"): CellChange[] => [
      { row: "read", column: "Value", text: read === 0 ? "ε" : symbols.slice(0, read).join("") },
      { row: "state", column: "Value", text: state },
      { row: "accepts", column: "Value", text: accepts },
    ];
    const steps: Step[] = [{ say: "Starts in q0, with nothing read.", cells: values(0) }];
    symbols.forEach((symbol, index) => {
      const from = state;
      if (symbol === "b") state = state === "q0" ? "q1" : "q0";
      steps.push({
        say: `Reads ${symbol}: from ${from} to ${state}.`,
        rows: { state: "strong" },
        cells: values(index + 1),
      });
    });
    const accepts = state === "q0";
    steps.push({
      say:
        symbols.length === 0
          ? "The empty word ends in q0: accepted."
          : `The word ends in ${state}: ${accepts ? "accepted" : "rejected"}.`,
      rows: { accepts: "reversed" },
      cells: values(symbols.length, accepts ? "yes" : "no"),
    });
    return steps;
  },
});
