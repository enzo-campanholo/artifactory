import mepa from "../src/machines/mepa.ts";
import { trace } from "../src/stage-build.ts";

export default trace(mepa, {
  reads: ["a", "b", "h"],
  labels: { L1: "o início do programa principal", L2: "o início de área" },
  subroutines: { L2: { params: ["bases", "altura"], returns: true } },
  roles: {
    1: ["base a", "base b", "altura h"],
    4: "cópia de bases",
    5: "cópia de altura",
    6: "bases vezes altura",
    7: "o divisor",
    8: "a área",
    12: "lido",
    14: "lido",
    16: "lido",
    18: ["valor de retorno"],
    19: "cópia de a",
    20: "cópia de b",
    21: "parâmetro bases",
    22: "parâmetro altura",
  },
  after: { 25: "As variáveis a, b e h estão liberadas." },
});
