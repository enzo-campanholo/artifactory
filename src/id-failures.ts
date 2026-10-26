import { kebabCase, type ArtifactSource } from "./artifacts.ts";
import type { Position } from "./check-failure.ts";
import { locate } from "./source-locator.ts";

interface CheckedId<Item> {
  item: Item;
  position: Position;
  problem: string | undefined;
}

// Each item in page order, where the source writes its ID, with what's wrong with the ID if
// anything: a second use names the first one's line.
export function checkedIds<Item extends { id: string }>(
  source: ArtifactSource,
  holder: "question" | "statement",
  items: Item[],
): CheckedId<Item>[] {
  const at = (id: string, occurrence: number) =>
    locate(source, { kind: `${holder}-id`, id, occurrence });
  const seen = new Map<string, number>();
  return items.map((item) => {
    const { id } = item;
    const occurrence = seen.get(id) ?? 0;
    seen.set(id, occurrence + 1);
    const { position } = at(id, occurrence);
    if (occurrence > 0) {
      const first = at(id, 0);
      const firstUse = first.matched ? ` at line ${String(first.position.line)}` : "";
      const problem = `the ${holder} ID \`${id}\` is already used${firstUse}; give each ${holder} in an artifact its own ID`;
      return { item, position, problem };
    }
    const problem = kebabCase.test(id)
      ? undefined
      : `the ${holder} ID \`${id}\` isn't lowercase kebab-case`;
    return { item, position, problem };
  });
}
