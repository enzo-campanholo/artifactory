import mepa from "../src/machines/mepa.ts";
import { trace } from "../src/stage-build.ts";

export default trace(mepa, {
  reads: ["a", "b", "h"],
  labels: { L1: "the start of the main program" },
  roles: {
    1: ["base a", "base b", "height h"],
    4: "read",
    6: "read",
    8: "read",
    10: "copy of a",
    11: "copy of b",
    12: "a plus b",
    13: "copy of h",
    14: "times h",
    15: "the divisor",
    16: "the area",
  },
  after: { 18: "The variables a, b and h are freed." },
});
