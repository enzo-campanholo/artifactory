import { defineBuild, type CellChange, type Mark, type Step } from "../src/stage-build.ts";

const vertices = ["A", "B", "C", "D", "E"];
const edges: [string, string, number][] = [
  ["A", "B", 4],
  ["A", "D", 2],
  ["B", "D", 3],
  ["B", "C", 6],
  ["B", "E", 5],
  ["C", "E", 1],
  ["D", "E", 7],
];

function listed(names: string[]): string {
  return names.length < 2
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1) ?? ""}`;
}

export default defineBuild({
  steps(start) {
    const key = new Map(vertices.map((vertex) => [vertex, Infinity]));
    const parent = new Map<string, string>();
    const tree = new Set<string>();
    let weight = 0;
    const steps: Step[] = [];
    key.set(start, 0);

    while (tree.size < vertices.length) {
      const outside = vertices.filter((vertex) => !tree.has(vertex));
      const next = outside.reduce((best, vertex) =>
        (key.get(vertex) ?? Infinity) < (key.get(best) ?? Infinity) ? vertex : best,
      );
      tree.add(next);
      weight += key.get(next) ?? 0;
      const changed: string[] = [];
      for (const [a, b, edgeWeight] of edges) {
        const other = a === next ? b : b === next ? a : undefined;
        if (other === undefined || tree.has(other)) continue;
        if (edgeWeight >= (key.get(other) ?? Infinity)) continue;
        key.set(other, edgeWeight);
        parent.set(other, next);
        changed.push(other);
      }

      const parts: Record<string, Mark> = {};
      for (const [a, b] of edges) {
        const name = `${a}-${b}`;
        const inTree = (child: string, of: string) => tree.has(child) && parent.get(child) === of;
        if (inTree(a, b) || inTree(b, a)) parts[name] = "strong";
        else if (tree.has(a) && tree.has(b)) parts[name] = "muted";
        else if (parent.get(a) === b || parent.get(b) === a) parts[name] = "dashed";
      }
      for (const vertex of tree) parts[vertex] = "strong";
      parts[next] = "reversed";

      const rows: Record<string, Mark> = { [next]: "reversed" };
      const cells: CellChange[] = [];
      for (const vertex of vertices) {
        const vertexKey = key.get(vertex) ?? Infinity;
        if (tree.has(vertex) && vertex !== next) rows[vertex] = "muted";
        const provisional = !tree.has(vertex) && vertexKey !== Infinity;
        cells.push(
          {
            row: vertex,
            column: "Key",
            text: vertexKey === Infinity ? "∞" : String(vertexKey),
            mark: changed.includes(vertex) ? "strong" : provisional ? "dashed" : undefined,
          },
          {
            row: vertex,
            column: "Parent",
            text: parent.get(vertex) ?? "—",
            mark: provisional ? "dashed" : undefined,
          },
        );
      }

      const via = parent.get(next);
      const entered =
        via === undefined
          ? `Start at ${next}, with key 0.`
          : `${next} joins the tree by the edge from ${via}, of weight ${String(key.get(next))}.`;
      const keys = changed.length === 0 ? "" : ` The keys of ${listed(changed)} go down.`;
      const total =
        tree.size === vertices.length
          ? ` Every vertex is in the tree, of total weight ${String(weight)}.`
          : "";
      steps.push({ say: `${entered}${keys}${total}`, parts, rows, cells });
    }
    return steps;
  },
});
