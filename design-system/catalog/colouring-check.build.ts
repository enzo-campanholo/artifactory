import { defineBuild, type Mark, type Step } from "../src/stage-build.ts";

const colour = new Map([
  ["A", "G"],
  ["B", "Y"],
  ["C", "G"],
  ["D", "Y"],
  ["E", "R"],
]);
const edges = ["E-A", "E-B", "A-B", "A-D", "B-C", "C-D"];
const vertices = [...colour.keys()];

function listed(names: string[]): string {
  return names.length < 2
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1) ?? ""}`;
}

export default defineBuild({
  steps(start) {
    const order = [start, ...vertices.filter((vertex) => vertex !== start)];
    const steps: Step[] = order.map((vertex, index) => {
      const checked = order.slice(0, index);
      const parts: Record<string, Mark> = { [vertex]: "reversed" };
      const ahead: string[] = [];
      for (const edge of edges) {
        const [a = "", b = ""] = edge.split("-");
        const other = a === vertex ? b : b === vertex ? a : undefined;
        if (other === undefined || checked.includes(other)) continue;
        ahead.push(other);
        parts[edge] = "strong";
      }
      for (const other of vertices.filter((other) => other !== vertex)) {
        parts[other] = checked.includes(other)
          ? "muted"
          : ahead.includes(other)
            ? "strong"
            : "dashed";
      }
      const has = (name: string) => `${name} has ${colour.get(name) ?? ""}`;
      return {
        say:
          ahead.length === 0
            ? `${has(vertex)}, and its neighbours are all checked.`
            : `${has(vertex)}, and its unchecked neighbours differ: ${listed(ahead.map(has))}.`,
        parts,
      };
    });
    steps.push({
      say: "No edge joins two vertices of one colour: the colouring is proper.",
      parts: Object.fromEntries(vertices.map((vertex): [string, Mark] => [vertex, "strong"])),
    });
    return steps;
  },
});
