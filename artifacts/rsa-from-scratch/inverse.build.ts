import { defineBuild, type CellChange, type Step } from "@artifactory/design-system/stage-build";

// Negative numbers with a true minus sign, as the table is written.
const show = (k: number) => String(k).replace("-", "−");

export default defineBuild<{ e: number; phi: number }>({
  steps({ e, phi }) {
    let [r0, r1, t0, t1] = [phi, e, 0, 1];
    let pass = "start";
    const body = [[pass, "", "", "", "", ""]];
    const start = body[0] ?? [];
    const steps: Step[] = [];
    const step = (line: number, say: string, wrote: string[] = []) => {
      const cells: CellChange[] = wrote.map((column) => ({ row: pass, column, mark: "strong" }));
      steps.push({ say, lines: { [line]: "reversed" }, body: body.map((cells) => [...cells]), cells });
    };

    step(1, `inverse gets e = ${show(e)} and phi = ${show(phi)}.`);
    [start[2], start[3]] = [show(r0), show(r1)];
    step(2, `r0 starts at phi, ${show(phi)}, and r1 at e, ${show(e)}.`, ["r0", "r1"]);
    [start[4], start[5]] = [show(t0), show(t1)];
    step(3, "t0 starts at 0 and t1 at 1: phi is 0 times e and e is 1 times e, modulo phi.", ["t0", "t1"]);
    while (r1 !== 0) {
      step(4, `r1 is ${show(r1)}, not zero: the loop runs.`);
      const k = Math.floor(r0 / r1);
      pass = String(body.length);
      const cells = [pass, show(k), show(r0), show(r1), show(t0), show(t1)];
      body.push(cells);
      step(5, `k is ${show(r0)} divided by ${show(r1)}, rounded down: ${show(k)}.`, ["k"]);
      [r0, r1] = [r1, r0 - k * r1];
      [cells[2], cells[3]] = [show(r0), show(r1)];
      step(6, `r0 becomes ${show(r0)}, and r1 the remainder, ${show(r1)}.`, ["r0", "r1"]);
      const was = t0;
      [t0, t1] = [t1, t0 - k * t1];
      [cells[4], cells[5]] = [show(t0), show(t1)];
      step(7, `t0 becomes ${show(t0)}, and t1 becomes ${show(was)} minus ${show(k)} times ${show(t0)}, which is ${show(t1)}.`, ["t0", "t1"]);
    }
    step(4, "r1 is zero: the loop ends, and r0 is the greatest common divisor.");
    if (r0 !== 1) {
      step(8, `r0 is ${show(r0)}, not 1: e and phi share the factor ${show(r0)}.`, ["r0"]);
      step(9, `So ${show(e)} has no inverse modulo ${show(phi)}.`);
      return steps;
    }
    step(8, `r0 is 1: e and phi share no factor, so the inverse exists.`, ["r0"]);
    const d = ((t0 % phi) + phi) % phi;
    step(10, `t0 is ${show(t0)}, which leaves ${show(d)} modulo ${show(phi)}: the inverse is ${show(d)}, since ${show(e)} times ${show(d)} leaves 1.`, ["t0"]);
    return steps;
  },
});
