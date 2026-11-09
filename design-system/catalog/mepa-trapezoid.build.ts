import mepa from "../src/machines/mepa.ts";
import { trace } from "../src/stage-build.ts";

export default trace(mepa, {
  reads: ["a", "b", "h"],
  roles: {
    1: ["base a", "base b", "height h"],
    2: "read",
    4: "read",
    6: "read",
    8: "copy of a",
    9: "copy of b",
    10: "a plus b",
    11: "copy of h",
    12: "times h",
    13: "the divisor",
    14: "the area",
  },
  after: { 16: "The variables a, b and h are freed." },
});
