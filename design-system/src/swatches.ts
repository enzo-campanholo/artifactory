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

// A colour's label is a `<text data-swatch="N">` naming colour N (ADR 0009). Without `colours`,
// the names are the swatches' numbers.
const numerals = swatches.map((_, index) => String(index + 1));

function attributeOf(tag: string, name: string): string | undefined {
  const [, doubleQuoted, singleQuoted] =
    new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(tag) ?? [];
  return doubleQuoted ?? singleQuoted;
}

// The plate is placed from the label's own x and y, so each must be one plain number.
function centreOf(tag: string): { x: number; y: number } | undefined {
  const [x, y] = ["x", "y"].map((name) => attributeOf(tag, name)?.trim() ?? "");
  const plain = /^-?(?:\d+\.?\d*|\.\d+)$/;
  return x !== undefined && y !== undefined && plain.test(x) && plain.test(y)
    ? { x: Number(x), y: Number(y) }
    : undefined;
}

interface Group {
  areas: number[];
  labels: number[];
}

interface Label {
  tag: string;
  text: string;
}

// Reads a drawing as the label rule of ADR 0009 does: each `fill-swatch-N` shape and each
// `<text data-swatch="N">` belongs to the `<g>` it sits in, and the drawing's top is one more.
export function swatchProblems(drawing: string, colours: readonly string[] | undefined): string[] {
  const names = colours ?? numerals;
  const named = Math.min(names.length, swatches.length);
  const problems = namesProblems(names);
  const label = (swatch: number) =>
    `<text data-swatch="${String(swatch)}">${names[swatch - 1] ?? ""}</text>`;

  const known = (swatch: number) => {
    if (swatch >= 1 && swatch <= named) return true;
    problems.push(
      colours === undefined || names.length > swatches.length
        ? `swatch ${String(swatch)} is past the six swatches: use swatches 1 to 6`
        : `swatch ${String(swatch)} is past the ${String(names.length)} colours \`colours\` names: add its name to \`colours\`, or use swatches 1 to ${String(names.length)}`,
    );
    return false;
  };

  const checkLabel = ({ tag, text }: Label, group: Group) => {
    const swatch = attributeOf(tag, "data-swatch") ?? "";
    if (!/^\d+$/.test(swatch)) {
      problems.push(
        `the label <text data-swatch="${swatch}"> names no swatch: write a number from 1 to ${String(named)}`,
      );
    } else if (known(Number(swatch))) {
      group.labels.push(Number(swatch));
      const name = names[Number(swatch) - 1] ?? "";
      if (text.trim() !== name) {
        problems.push(
          `a label reads "${text.trim()}", but data-swatch="${swatch}" is colour ${swatch}, "${name}": write ${label(Number(swatch))}`,
        );
      }
    }
    if (centreOf(tag) === undefined) {
      problems.push(
        `the label <text data-swatch="${swatch}"> has no x and y: give it both, at the centre of the part it names`,
      );
    }
  };

  const checkGroup = ({ areas, labels }: Group) => {
    for (const swatch of new Set(areas)) {
      if (labels.includes(swatch)) continue;
      const other = labels.find((labelled) => !areas.includes(labelled));
      problems.push(
        other === undefined
          ? `a <g> filled with fill-swatch-${String(swatch)} holds no label: put ${label(swatch)} in it, at the centre of its area`
          : `a <g> filled with fill-swatch-${String(swatch)} holds a label of colour ${String(other)}: label it ${label(swatch)}`,
      );
    }
  };

  const groups: Group[] = [{ areas: [], labels: [] }];
  let open: Label | undefined;
  const tokens = drawing
    .replace(/<!--[\s\S]*?-->/g, "")
    .matchAll(/<(\/?)([\w:-]+)\b[^>]*?(\/?)>|[^<]+/g);
  for (const [token, closing, name, selfClosing] of tokens) {
    const group = groups.at(-1) ?? { areas: [], labels: [] };
    if (name === undefined) {
      if (open !== undefined) open.text += token;
    } else if (closing === "/") {
      if (name === "g" && groups.length > 1) checkGroup(groups.pop() ?? group);
      if (name === "text" && open !== undefined) checkLabel(open, group);
      if (name === "text") open = undefined;
    } else {
      for (const [, swatch] of (attributeOf(token, "class") ?? "").matchAll(
        /\bfill-swatch-(\d+)\b/g,
      )) {
        if (known(Number(swatch))) group.areas.push(Number(swatch));
      }
      if (name === "text" && attributeOf(token, "data-swatch") !== undefined) {
        open = { tag: token, text: "" };
        if (selfClosing === "/") {
          checkLabel(open, group);
          open = undefined;
        }
      }
      if (name === "g" && selfClosing !== "/") groups.push({ areas: [], labels: [] });
    }
  }
  for (const group of groups.reverse()) checkGroup(group);
  return [...new Set(problems)];
}

function characters(text: string): string[] {
  return [...new Intl.Segmenter().segment(text)].map(({ segment }) => segment);
}

function namesProblems(names: readonly string[]): string[] {
  return [
    ...(names.length > swatches.length
      ? [`\`colours\` names ${String(names.length)} colours: name at most six, one per swatch`]
      : []),
    ...names
      .filter((name) => characters(name).length > 2)
      .map(
        (name) =>
          `the colour "${name}" is named in more than two characters: name it in one or two, such as "${characters(name).slice(0, 2).join("")}"`,
      ),
  ];
}

// figure-colours.css sets a label at 15 units and centres it on its x and y. Measured in Archivo
// there, one character is at most 13 units wide and two up to 25, so one plate size holds every
// label in the drawing, the smaller when all are one character, which shows more of the hatching.
const plateSides = { one: 18, two: 24 };

export function platedLabels(drawing: string): string {
  const label = /<text\b[^>]*\sdata-swatch\s*=[^>]*>([\s\S]*?)<\/text>/g;
  const side = [...drawing.matchAll(label)].some(
    ([, text = ""]) => characters(text.replace(/<[^>]*>/g, "").trim()).length > 1,
  )
    ? plateSides.two
    : plateSides.one;
  return drawing.replace(/<text\b[^>]*\sdata-swatch\s*=[^>]*>/g, (tag) => {
    const centre = centreOf(tag);
    if (centre === undefined) return tag;
    const transform = attributeOf(tag, "transform");
    const corner = (at: number) => String(at - side / 2);
    return `<rect x="${corner(centre.x)}" y="${corner(centre.y)}" width="${String(side)}" height="${String(side)}" class="fill-surface" data-swatch-plate${transform === undefined ? "" : ` transform="${transform}"`} />${tag}`;
  });
}
