import mepa from "../src/machines/mepa.ts";
import { trace } from "../src/stage-build.ts";

export default trace(mepa, {
  reads: ["a", "b", "h"],
  labels: { L1: "o início do programa principal" },
  roles: {
    1: ["base a", "base b", "altura h"],
    4: "lido",
    6: "lido",
    8: "lido",
    10: "cópia de a",
    11: "cópia de b",
    12: "a mais b",
    13: "cópia de h",
    14: "vezes h",
    15: "o divisor",
    16: "a área",
  },
  after: { 18: "As variáveis a, b e h estão liberadas." },
});
