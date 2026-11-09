import { defineBuild, type CellChange, type Mark, type Step } from "../src/stage-build.ts";

const edges: [string, string][] = [
  ["A", "B"],
  ["A", "D"],
  ["B", "D"],
  ["B", "C"],
  ["B", "E"],
  ["C", "E"],
  ["D", "E"],
];

const neighbours = (vertex: string) =>
  edges.flatMap(([a, b]) => (a === vertex ? [b] : b === vertex ? [a] : [])).sort();

const edge = (a: string, b: string) =>
  edges.some(([x, y]) => x === a && y === b) ? `${a}-${b}` : `${b}-${a}`;

function listed(names: string[]): string {
  return names.length < 2
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1) ?? ""}`;
}

export default defineBuild<{ start: string; search: string }>({
  steps({ start, search }) {
    const breadth = search === "breadth-first";
    const order: string[] = [];
    const parent = new Map<string, string>();
    const waiting: [string, string | undefined][] = [[start, undefined]];
    const steps: Step[] = [];
    while (waiting.length > 0) {
      const [vertex, from] = (breadth ? waiting.shift() : waiting.pop()) ?? [start, undefined];
      if (order.includes(vertex)) continue;
      order.push(vertex);
      if (from !== undefined) parent.set(vertex, from);
      const next = neighbours(vertex).filter((other) => !order.includes(other));
      // A stack takes the last pushed first, so depth-first pushes in reverse to visit A before B.
      for (const other of breadth ? next : next.toReversed()) waiting.push([other, vertex]);
      // Listed in the order they'd be taken: a stack's top first.
      const taken = breadth ? waiting : waiting.toReversed();
      const queued = [...new Set(taken.map(([other]) => other))].filter(
        (other) => !order.includes(other),
      );
      const parts: Record<string, Mark> = {};
      for (const visited of order) parts[visited] = "strong";
      for (const [child, via] of parent) parts[edge(child, via)] = "strong";
      for (const other of queued) parts[other] = "dashed";
      parts[vertex] = "reversed";
      const cells: CellChange[] = order.flatMap((visited, index) => [
        {
          row: visited,
          column: "Order",
          text: String(index + 1),
          mark: visited === vertex ? undefined : "strong",
        },
        { row: visited, column: "Parent", text: parent.get(visited) ?? "—" },
      ]);
      const reached =
        from === undefined ? `Starts at ${vertex}.` : `Visits ${vertex}, from ${from}.`;
      const waits =
        queued.length === 0
          ? "Nothing is left waiting."
          : `${listed(queued)} ${queued.length === 1 ? "waits" : "wait"}, ${breadth ? "in a queue" : "on a stack"}.`;
      steps.push({ say: `${reached} ${waits}`, parts, rows: { [vertex]: "reversed" }, cells });
    }
    return steps;
  },
});
