import { defineBuild, type Mark, type Step } from "../src/stage-build.ts";

const names = ["R", "G", "Y"];
const edges = ["E-A", "E-B", "A-B", "A-D", "B-C", "C-D"];
const vertices = ["A", "B", "C", "D", "E"];

function neighbours(vertex: string): string[] {
  return edges.flatMap((edge) => {
    const [a = "", b = ""] = edge.split("-");
    return a === vertex ? [b] : b === vertex ? [a] : [];
  });
}

function edgeBetween(a: string, b: string): string {
  return edges.find((edge) => edge === `${a}-${b}` || edge === `${b}-${a}`) ?? "";
}

const marked = (parts: string[], mark: Mark): Record<string, Mark> =>
  Object.fromEntries(parts.map((part) => [part, mark]));

export default defineBuild({
  steps(start) {
    const colours: Record<string, number> = {};
    const nameOf = (colour: number) => names[colour - 1] ?? "";
    const steps: Step[] = [];
    for (const vertex of [start, ...vertices.filter((vertex) => vertex !== start)]) {
      const coloured = neighbours(vertex).filter((other) => colours[other] !== undefined);
      const others = Object.keys(colours).filter((other) => !coloured.includes(other));
      const around = { ...marked(others, "muted"), ...marked(coloured, "strong") };
      let colour = 1;
      for (;;) {
        const clash = coloured.find((other) => colours[other] === colour);
        if (clash === undefined) break;
        steps.push({
          say: `${vertex} tries ${nameOf(colour)}, but its neighbour ${clash} has ${nameOf(colour)}.`,
          colours: { ...colours, [vertex]: colour },
          parts: {
            ...around,
            [clash]: "reversed",
            [edgeBetween(vertex, clash)]: "strong",
            [vertex]: "dashed",
          },
        });
        colour += 1;
      }
      colours[vertex] = colour;
      steps.push({
        say:
          coloured.length === 0
            ? `${vertex} takes ${nameOf(colour)}: no neighbour has a colour yet.`
            : `${vertex} takes ${nameOf(colour)}, which none of its coloured neighbours has.`,
        colours: { ...colours },
        parts: { ...around, [vertex]: "reversed" },
      });
    }
    steps.push({
      say: "Every vertex has a colour, and no edge joins two vertices of one colour.",
      colours: { ...colours },
      parts: marked(vertices, "strong"),
    });
    return steps;
  },
});
