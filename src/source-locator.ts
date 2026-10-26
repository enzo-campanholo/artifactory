import type { ArtifactSource } from "./artifacts.ts";
import { positionAt, type Position } from "./check-failure.ts";

// A built page keeps no link to its MDX source, so each target is found by searching the source
// for what the page shows. A target names what was found, not how to search for it, so the search
// can change without changing a caller.
type SourceTarget =
  | ElementTarget
  | LinkTarget
  | { kind: "question-id"; id: string; occurrence: number }
  | { kind: "statement-id"; id: string; occurrence: number }
  | { kind: "citation"; to: string; occurrence: number }
  | { kind: "proof"; of: string; occurrence: number }
  | { kind: "component"; names: string[] };

interface ElementTarget {
  kind: "element";
  text: string;
  attribute: (name: string) => string | undefined;
}

interface LinkTarget {
  kind: "link";
  destination: string;
  occurrence: number;
}

interface Located {
  position: Position;
  matched: boolean;
}

const entryStart: Located = { position: { line: 1, column: 1 }, matched: false };

export function locate(source: ArtifactSource, target: SourceTarget): Located {
  const offset = offsetOf(source, target);
  return offset === undefined
    ? entryStart
    : { position: positionAt(source.text, offset), matched: true };
}

function offsetOf(source: ArtifactSource, target: SourceTarget): number | undefined {
  switch (target.kind) {
    case "element":
      return elementOffset(source, target);
    case "link":
      return linkOffset(source, target);
    case "question-id":
      return idPropOffsets(source.text, target.id)[target.occurrence];
    case "statement-id":
      return componentPropOffsets(source.text, "statement", "id", target.id)[target.occurrence];
    case "citation":
      return componentPropOffsets(source.text, "ref", "to", target.to)[target.occurrence];
    case "proof":
      return componentPropOffsets(source.text, "proof", "of", target.of)[target.occurrence];
    case "component":
      return onlyTagOffset(source.text, target.names);
  }
}

// Markdown syntax inside a passage breaks a long text match, and a shorter one matches anywhere.
const wordsToMatch = 8;
const shortestMatch = 3;
const attributesNamingSource = ["id", "href", "src", "alt"];

function elementOffset(
  { text, bodyStart }: ArtifactSource,
  element: ElementTarget,
): number | undefined {
  const words = element.text.replace(/\s+/g, " ").trim().split(" ").slice(0, wordsToMatch);
  const textPrefixes = words.map((_, index) => words.slice(0, words.length - index).join(" "));
  const attributeValues = attributesNamingSource.map((name) => element.attribute(name) ?? "");
  for (const candidate of [...textPrefixes, ...attributeValues]) {
    if (candidate.length < shortestMatch) continue;
    const offset = text.indexOf(candidate, bodyStart);
    if (offset !== -1) return offset;
  }
  return undefined;
}

// A link is placed where the source writes the same destination, the same number of times over, or
// the last time if the layout links there too. Markdown encodes accents in a destination, so the
// decoded destination is tried too.
function linkOffset(
  { text, bodyStart }: ArtifactSource,
  { destination, occurrence }: LinkTarget,
): number | undefined {
  const body = text.slice(bodyStart);
  for (const written of new Set([destination, decoded(destination)])) {
    const writtenDestination = new RegExp(
      String.raw`(?<=[(\s"'<])${escaped(written)}(?=[)\s"'>]|$)`,
      "gm",
    );
    const matches = [...body.matchAll(writtenDestination)];
    const match = matches[occurrence] ?? matches.at(-1);
    if (match !== undefined) return bodyStart + match.index;
  }
  return undefined;
}

function idPropOffsets(text: string, id: string): number[] {
  const idProp = new RegExp(
    String.raw`(?<=<[A-Z][\w.]*\s[^<>]*)(?<![\w-])id\s*=\s*\{?\s*(["'\x60])${escaped(id)}\1`,
    "g",
  );
  return [...text.matchAll(idProp)].map((match) => match.index);
}

// A design system component is found by the name the entry imports it as. Its props are read whole,
// so a `<` or `>` in a prop's value doesn't end its tag.
function componentPropOffsets(
  text: string,
  component: string,
  prop: string,
  value: string,
): number[] {
  const module = escaped(`@artifactory/design-system/${component}`);
  const names = [
    ...text.matchAll(
      new RegExp(String.raw`^import\s+([A-Za-z_$][\w$]*)\s+from\s+(["'])${module}\2`, "gm"),
    ),
  ].map(([, name = ""]) => name);
  if (names.length === 0) return [];
  const tags = new RegExp(
    String.raw`<(?:${names.map(escaped).join("|")})(${writtenProps.source})`,
    "g",
  );
  return [...text.matchAll(tags)].flatMap(({ 0: tag, 1: props = "", index }) => {
    const propsStart = index + tag.length - props.length;
    return [...props.matchAll(writtenProp)]
      .filter(([, name, written = ""]) => name === prop && unquoted(written) === value)
      .map((match) => propsStart + match.index);
  });
}

const writtenProp = /([\w:-]+)(?:\s*=\s*("[^"]*"|'[^']*'|\{[^{}]*\}))?/g;
const writtenProps = /(?:\s+[\w:-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|\{[^{}]*\}))?)*/;

function unquoted(written: string): string | undefined {
  return (/^\{\s*(["'\x60])(.*)\1\s*\}$/s.exec(written) ?? /^(["'])(.*)\1$/s.exec(written))?.[2];
}

// A component's own error has no location, so it is placed at the component only when the entry
// has a single tag with one of its names.
function onlyTagOffset(text: string, names: string[]): number | undefined {
  const tags = [...text.matchAll(new RegExp(`<(?:${names.join("|")})(?=[\\s/>])`, "g"))];
  return tags.length === 1 ? tags[0]?.index : undefined;
}

function escaped(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

export function decoded(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}
