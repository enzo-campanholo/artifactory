import { paintWithTokens } from "./d2-tokens.ts";

// D2 lays text without a size, such as a code label's, out at a standalone SVG's 16 px, which an
// inline board would otherwise inherit from the page. D2 also joins shape outlines round, and
// DESIGN.md's corners are square.
const standardStyle = "<style>.d2-svg{font-size:16px}.d2-svg .shape{stroke-linejoin:miter}</style>";

export function drawInStandard(svg: string): string {
  return withoutMotion(paintWithTokens(svg)).replace(
    /<svg class="[^"]*\bd2-svg\b[^"]*"[^>]*>/,
    (root) => `${root}${standardStyle}`,
  );
}

// An animated connection keeps its dashes and stops moving.
function withoutMotion(svg: string): string {
  return svg.replace(/animation:[^;"]*;?/g, "");
}

export function smallestLabelSize(svg: string): number {
  const sizes = [...svg.matchAll(/font-size(?:="|:\s*)(\d+(?:\.\d+)?)/g)].map(([, size]) =>
    Number(size),
  );
  return Math.min(...sizes);
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const d2Root = /<svg class="[^"]*\bd2-svg\b[^"]*"[^>]*>/;

function boxOf(board: string): Box {
  const [x = 0, y = 0, width = 0, height = 0] = (
    /\bviewBox="([^"]*)"/.exec(d2Root.exec(board)?.[0] ?? "")?.[1] ?? ""
  )
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  return { x, y, width, height };
}

// D2 sizes each board to its own content, from an origin that isn't 0, so a part would move and
// shrink between steps. Every board gets the union of their boxes, as the inner `d2-svg`'s viewBox
// and as the root's size, and keeps its own box for print.
export function inOneFrame(boards: readonly string[]): {
  frame: Box;
  boards: { svg: string; box: Box }[];
} {
  const boxes = boards.map(boxOf);
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  const frame = {
    x,
    y,
    width: Math.max(...boxes.map((box) => box.x + box.width)) - x,
    height: Math.max(...boxes.map((box) => box.y + box.height)) - y,
  };
  const size = `width="${String(frame.width)}" height="${String(frame.height)}"`;
  const sized = (tag: string, viewBox: number[]) =>
    tag
      .replace(/\swidth="[^"]*"/, "")
      .replace(/\sheight="[^"]*"/, "")
      .replace(/\bviewBox="[^"]*"/, `${size} viewBox="${viewBox.join(" ")}"`);
  return {
    frame,
    boards: boards.map((board, index) => ({
      svg: board
        .replace(/<svg\b[^>]*>/, (root) => sized(root, [0, 0, frame.width, frame.height]))
        .replace(d2Root, (root) => sized(root, [x, y, frame.width, frame.height])),
      box: boxes[index] ?? frame,
    })),
  };
}
