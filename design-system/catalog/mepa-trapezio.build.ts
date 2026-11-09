import mepa from "../src/machines/mepa.ts";
import { trace } from "../src/stage-build.ts";

export default trace(mepa, {
  reads: ["a", "b", "h"],
  roles: {
    1: ["base a", "base b", "altura h"],
    2: "lido",
    4: "lido",
    6: "lido",
    8: "cópia de a",
    9: "cópia de b",
    10: "a mais b",
    11: "cópia de h",
    12: "vezes h",
    13: "o divisor",
    14: "a área",
  },
  after: { 16: "As variáveis a, b e h estão liberadas." },
});
