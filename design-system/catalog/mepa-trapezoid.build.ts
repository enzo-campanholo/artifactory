import mepa from "../src/machines/mepa.ts";
import { trace } from "../src/stage-build.ts";

export default trace(mepa, {
  reads: ["a", "b", "h"],
  labels: { L1: "the start of the main program", L2: "the start of area" },
  subroutines: { L2: { params: ["bases", "height"], returns: true } },
  roles: {
    1: ["base a", "base b", "height h"],
    4: "copy of bases",
    5: "copy of height",
    6: "bases times height",
    7: "the divisor",
    8: "the area",
    12: "read",
    14: "read",
    16: "read",
    18: ["return value"],
    19: "copy of a",
    20: "copy of b",
    21: "parameter bases",
    22: "parameter height",
  },
  after: { 25: "The variables a, b and h are freed." },
});
