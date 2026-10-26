import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { findPackageJSON } from "node:module";
import { join, relative } from "node:path";
import { diagramFonts } from "@artifactory/design-system/diagram-fonts";
import { D2, type CompileOptions, type Diagram } from "@d2lang/d2";
import type { Failure, Report } from "./check-failure.ts";

interface Renderer {
  fonts: CompileOptions;
  // Covers the D2 version, the defaults and the fonts, so changing any of them redraws the cache.
  cacheKey: string;
}

const defaults = { layout: "elk", themeID: 0, pad: 8 } as const;

// `./x.d2` imports the root board, and `./x.d2?steps` every board a stepper steps through.
type D2Import = "root" | "steps";

// The syntax tree is kept so the design system's refusals are worked out on every load.
interface Rendered {
  svgs: string[];
  ast: D2Map;
}

type Refusal = Pick<Failure, "line" | "column" | "message">;

// Stand in for a diagram that failed, so its page still renders and one build reports every
// failure.
const failedDiagram = { root: '<svg viewBox="0 0 0 0"></svg>', steps: [] };

export function diagrams(root: string, report: Report) {
  const cacheDirectory = join(root, "node_modules/.cache/d2");
  let d2: D2 | undefined;
  let renderer: Promise<Renderer> | undefined;

  async function renderCached(file: string, source: string, kind: D2Import): Promise<Rendered> {
    renderer ??= loadRenderer();
    const { fonts, cacheKey } = await renderer;
    const salt = hash(file).slice(0, 8);
    const cached = join(cacheDirectory, `${hash(source, salt, kind, cacheKey)}.json`);
    const hit = await readFile(cached, "utf8").catch(() => undefined);
    if (hit !== undefined) return JSON.parse(hit) as Rendered;
    d2 ??= new D2();
    const rendered = await render(d2, source, salt, fonts, kind);
    await mkdir(cacheDirectory, { recursive: true });
    // Write, then rename, so a build killed mid-write (a fixture check that times out, say) never
    // leaves a truncated entry for the next build to read.
    const partial = `${cached}.${randomUUID()}`;
    await writeFile(partial, JSON.stringify(rendered));
    await rename(partial, cached);
    return rendered;
  }

  return {
    name: "artifactory-diagrams",
    async load(id: string) {
      const [path = "", query] = id.split("?", 2);
      if (!path.endsWith(".d2") || (query !== undefined && query !== "steps")) return null;
      const kind: D2Import = query === undefined ? "root" : "steps";
      const file = relative(root, path);
      const source = await readFile(path, "utf8");
      const exported = await renderCached(file, source, kind).then(
        ({ svgs, ast }) => {
          for (const refusal of refusalsIn(ast)) {
            report({ file, ...refusal, ruleId: "d2", skillSection: "Diagrams and figures" });
          }
          if (kind === "root") return svgs[0];
          if (svgs.length >= 2) return svgs;
          report(tooFewBoards(file, svgs.length));
          return failedDiagram.steps;
        },
        (error: unknown) => {
          for (const failure of d2Failures(file, error)) report(failure);
          return failedDiagram[kind];
        },
      );
      return `export default ${JSON.stringify(exported)};`;
    },
    async buildEnd() {
      await d2?.dispose();
      d2 = undefined;
    },
  };
}

async function loadRenderer(): Promise<Renderer> {
  const { regular, italic, bold, semibold } = diagramFonts;
  const [fontRegular, fontItalic, fontBold, fontSemibold] = await Promise.all(
    [regular, italic, bold, semibold].map(async (path) =>
      (await readFile(path)).toString("base64"),
    ),
  );
  // D2 fonts go in as base64: Uint8Array fails under Node.
  const fonts = { fontRegular, fontItalic, fontBold, fontSemibold } as unknown as CompileOptions;
  const d2Package = findPackageJSON("@d2lang/d2", import.meta.url);
  if (d2Package === undefined) throw new Error("@d2lang/d2 has no package.json");
  const { version } = JSON.parse(await readFile(d2Package, "utf8")) as { version: string };
  return { fonts, cacheKey: hash(version, JSON.stringify(defaults), JSON.stringify(fonts)) };
}

async function render(
  d2: D2,
  source: string,
  salt: string,
  fonts: CompileOptions,
  kind: D2Import,
): Promise<Rendered> {
  const options = { ...fonts, themeID: defaults.themeID };
  const asWritten = await d2.compile(source, options);
  const { diagram, renderOptions } = choosesLayout(asWritten.diagram)
    ? asWritten
    : await d2.compile(source, { ...options, layout: defaults.layout });
  const renderBoard = (target: string | undefined, boardSalt: string) =>
    d2.render(diagram, {
      ...renderOptions,
      sketch: false,
      ...(target === undefined ? {} : { target }),
      pad: defaults.pad,
      salt: boardSalt,
      noXMLTag: true,
    });
  const ast = asWritten.graph.ast as D2Map;
  if (kind === "root") return { svgs: [await renderBoard(undefined, salt)], ast };
  // D2 draws nothing for a folder-only root, which is a root with nothing outside `steps`.
  const targets = [
    ...(diagram.isFolderOnly ? [] : [undefined]),
    ...(diagram.steps ?? []).flatMap((step) => (step ? [`steps.${step.name}`] : [])),
  ];
  const svgs: string[] = [];
  for (const [index, target] of targets.entries()) {
    svgs.push(await renderBoard(target, `${salt}s${String(index)}`));
  }
  return { svgs, ast };
}

function choosesLayout(diagram: Diagram): boolean {
  const config = diagram.config ?? {};
  return "layoutEngine" in config && config.layoutEngine != null;
}

// The parts of D2's syntax tree that `refusalsIn` reads. `range` is "index,<line>:<column>:…",
// counted from 0.
interface D2Map {
  nodes?: { map_key?: D2Key }[];
}

interface D2Key {
  range: string;
  key?: D2Path;
  edges?: { src: D2Path; dst: D2Path; src_arrow: string; dst_arrow: string }[];
  edge_key?: D2Path;
  primary?: D2Value;
  value?: D2Value;
}

interface D2Path {
  range: string;
  path: D2Value[];
}

interface D2Value {
  map?: D2Map;
  block_string?: { range: string; tag: string; value: string };
  unquoted_string?: { value: { string?: string }[] };
  double_quoted_string?: { value: { string?: string }[] };
  single_quoted_string?: { value: string };
  boolean?: { value: boolean };
  number?: { raw: string };
}

const interactive: Record<string, string> = {
  link: "a link",
  tooltip: "a tooltip",
  icon: "an icon",
};

const leaveItOut: Record<string, string> = {
  shadow: "diagrams cast no shadows",
  animated: "diagrams don't move",
  "fill-pattern": "diagrams fill flat",
  opacity: "diagrams don't fade",
};

// Each refusal names what asked for it by its key in the file, such as `a.b` or `a -> b`.
function refusalsIn(board: D2Map, owner: string[] = []): Refusal[] {
  return (board.nodes ?? []).flatMap(({ map_key: key }) => {
    if (key === undefined) return [];
    const path = [
      ...owner,
      ...(key.edges === undefined ? [] : [edgeName(key.edges)]),
      ...segments(key.edge_key ?? key.key),
    ];
    const at = position((key.edge_key ?? key.key ?? key).range);
    const named = (attribute: number) => {
      const name = path.slice(0, path.length - attribute).join(".");
      return name === "" ? "The board" : `\`${name}\``;
    };
    const [parent, last] = [path.at(-2), path.at(-1)];
    const value = text(key.value);
    const refusals: Refusal[] = [];
    const refuse = (message: string) => refusals.push({ ...at, message });

    const feature = last === undefined || parent === "style" ? undefined : interactive[last];
    if (feature !== undefined && !path.includes("vars")) {
      refuse(
        `${named(1)} has ${feature}, but diagrams draw no links, tooltips or icons: put it in the prose`,
      );
    }
    if (parent === "style" && last !== undefined) {
      const reason = leaveItOut[last];
      const asked =
        last === "opacity" ? !(Number(value) >= 1) : value !== "false" && value !== "none";
      if (reason !== undefined && asked) {
        refuse(`${named(2)} sets \`style.${last}\`, but ${reason}: leave it out`);
      }
      if (
        ["fill", "stroke", "font-color"].includes(last) &&
        value !== undefined &&
        !/^(?:[A-Z]+\d|transparent)$/.test(value)
      ) {
        refuse(
          `${named(2)} sets \`style.${last}\` to \`${value}\`, but diagrams take their colours from the design system: leave it out`,
        );
      }
    }
    if (parent === "d2-config" && last === "sketch" && value === "true") {
      refuse("`sketch` draws by hand, but diagrams are drawn with straight rules: leave it out");
    }
    if (parent === "vars" && last === "d2-legend") {
      refuse(
        "`d2-legend` draws a legend, but diagrams have none: say what the shapes mean in the caption or the prose",
      );
    }
    for (const label of [key.primary?.block_string, key.value?.block_string]) {
      if (
        label !== undefined &&
        ["md", "markdown"].includes(label.tag) &&
        label.value.includes("](")
      ) {
        const shape = last === "label" ? named(1) : named(0);
        refusals.push({
          ...position(label.range),
          message: `${shape}'s markdown label has a link, but diagrams draw no links: put it in the prose`,
        });
      }
    }
    const inner = key.value?.map;
    return inner === undefined ? refusals : [...refusals, ...refusalsIn(inner, path)];
  });
}

function edgeName(edges: NonNullable<D2Key["edges"]>): string {
  const [first] = edges;
  const ends = edges.map(
    ({ dst, src_arrow, dst_arrow }) =>
      `${src_arrow === "<" ? "<" : ""}-${dst_arrow === ">" ? ">" : "-"} ${segments(dst).join(".")}`,
  );
  return [first === undefined ? "" : segments(first.src).join("."), ...ends].join(" ");
}

function segments(key: D2Path | undefined): string[] {
  return (key?.path ?? []).map((segment) => text(segment) ?? "");
}

function text(value: D2Value | undefined): string | undefined {
  if (value === undefined) return undefined;
  const quoted = value.unquoted_string ?? value.double_quoted_string;
  if (quoted !== undefined) return quoted.value.map((part) => part.string ?? "").join("");
  if (value.single_quoted_string !== undefined) return value.single_quoted_string.value;
  if (value.boolean !== undefined) return String(value.boolean.value);
  if (value.number !== undefined) return value.number.raw;
  return undefined;
}

function position(range: string): Pick<Failure, "line" | "column"> {
  const [, line = "0", column = "0"] = /,(\d+):(\d+):/.exec(range) ?? [];
  return { line: Number(line) + 1, column: Number(column) + 1 };
}

function hash(...parts: string[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

function tooFewBoards(file: string, count: number): Failure {
  return {
    file,
    line: 1,
    column: 1,
    ruleId: "d2",
    message: `A stepper needs at least two boards, but this diagram has ${String(count)}: draw each step under \`steps\``,
    skillSection: "Diagrams and figures",
  };
}

function d2Failures(file: string, error: unknown): Failure[] {
  const message = error instanceof Error ? error.message : String(error);
  return compileErrors(message).map((errmsg) => {
    const located = /^[^:\n]*:(\d+):(\d+): (.*)$/s.exec(errmsg);
    return {
      file,
      line: Number(located?.[1] ?? 1),
      column: Number(located?.[2] ?? 1),
      ruleId: "d2",
      message: `D2 can't compile this diagram: ${located?.[3] ?? errmsg}`,
      skillSection: "Diagrams and figures",
    };
  });
}

// A compile error's message is a JSON list of `{ errmsg: "index:<line>:<column>: …" }`. Other
// failures, such as the D2 worker crashing, throw a plain message.
function compileErrors(message: string): string[] {
  const listed = parseJson(message);
  const errmsgs = Array.isArray(listed)
    ? listed.flatMap((entry: unknown) =>
        typeof entry === "object" &&
        entry !== null &&
        "errmsg" in entry &&
        typeof entry.errmsg === "string"
          ? [entry.errmsg]
          : [],
      )
    : [];
  return errmsgs.length > 0 ? errmsgs : [message];
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
