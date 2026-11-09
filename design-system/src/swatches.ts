// The six swatches a Figure or Stage drawing fills an area with (ADR 0009), in swatch order. Each
// hatches a tile 6 units square, rotated into place, so every line hatching is spaced 6 apart.
const spacing = 6;
const half = spacing / 2;
const ground = `<rect width="${String(spacing)}" height="${String(spacing)}" class="fill-surface" />`;
const lines = (path: string) => `<path d="${path}" class="stroke-text" stroke-width="1.5" />`;
const across = `M0 ${String(half)}H${String(spacing)}`;
const down = `M${String(half)} 0V${String(spacing)}`;

const swatches = [
  { draws: "diagonal lines `/`", turn: -45, tile: lines(across) },
  { draws: "diagonal lines `\\`", turn: 45, tile: lines(across) },
  { draws: "cross-hatch, both diagonals", turn: 45, tile: lines(`${across}${down}`) },
  { draws: "horizontal lines", turn: 0, tile: lines(across) },
  { draws: "vertical lines", turn: 0, tile: lines(down) },
  {
    draws: "dots",
    turn: 45,
    tile: `<circle cx="${String(half)}" cy="${String(half)}" r="1.4" class="fill-text" />`,
  },
];

// html-validate counts IDs inside inline SVG, so each drawing on a page names its patterns apart,
// and a pattern's content takes its colours from where it's defined, so each drawing holds its own.
let drawings = 0;

export function swatchPatterns(): { defs: string; style: string } {
  drawings += 1;
  const id = (swatch: number) => `swatch-${String(drawings)}-${String(swatch)}`;
  const patterns = swatches.map(
    ({ turn, tile }, index) =>
      `<pattern id="${id(index + 1)}" width="${String(spacing)}" height="${String(spacing)}" patternUnits="userSpaceOnUse"${turn === 0 ? "" : ` patternTransform="rotate(${String(turn)})"`}>${ground}${tile}</pattern>`,
  );
  return {
    defs: `<defs>${patterns.join("")}</defs>`,
    style: swatches
      .map((_, index) => `--swatch-${String(index + 1)}: url(#${id(index + 1)})`)
      .join("; "),
  };
}
