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
  | { kind: "component"; names: string[] }
  | { kind: "component-instance"; module: string; occurrence: number; onPage: number };

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
      return questionIdOffsets(source.text, target.id)[target.occurrence];
    case "statement-id":
      return componentPropOffsets(source.text, "statement", "id", target.id)[target.occurrence];
    case "citation":
      return componentPropOffsets(source.text, "ref", "to", target.to)[target.occurrence];
    case "proof":
      return componentPropOffsets(source.text, "proof", "of", target.of)[target.occurrence];
    case "component":
      return onlyTagOffset(source.text, target.names);
    case "component-instance":
      return instanceOffset(source.text, target);
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

// A matching's items are questions whose IDs are the keys of its `answers`, so a question ID is
// written either as an `id` prop or as such a key, in the page's order either way.
function questionIdOffsets(text: string, id: string): number[] {
  return [...idPropOffsets(text, id), ...answersKeyOffsets(text, id)].sort((a, b) => a - b);
}

function idPropOffsets(text: string, id: string): number[] {
  const idProp = new RegExp(
    String.raw`(?<=<[A-Z][\w.]*\s[^<>]*)(?<![\w-])id\s*=\s*\{?\s*(["'\x60])${escaped(id)}\1`,
    "g",
  );
  return [...text.matchAll(idProp)].map((match) => match.index);
}

function answersKeyOffsets(text: string, id: string): number[] {
  const key = new RegExp(
    String.raw`(?<=[{,]\s*)(?:(["'])${escaped(id)}\1|${escaped(id)}(?![\w$]))(?=\s*:)`,
    "g",
  );
  return componentProps(text, "matching")
    .filter(({ name }) => name === "answers")
    .flatMap(({ written, writtenStart }) =>
      [...written.matchAll(key)].map((match) => writtenStart + match.index),
    );
}

function componentPropOffsets(
  text: string,
  component: string,
  prop: string,
  value: string,
): number[] {
  return componentProps(text, component)
    .filter(({ name, written }) => name === prop && unquoted(written) === value)
    .map(({ start }) => start);
}

interface WrittenProp {
  name: string;
  written: string;
  start: number;
  writtenStart: number;
}

// A design system component is found by the name the entry imports it as. Its props are read whole,
// so a `<` or `>` in a prop's value doesn't end its tag.
function componentTags(text: string, component: string): RegExpExecArray[] {
  const module = escaped(`@artifactory/design-system/${component}`);
  const names = [
    ...text.matchAll(
      new RegExp(String.raw`^import\s+([A-Za-z_$][\w$]*)\s+from\s+(["'])${module}\2`, "gm"),
    ),
  ].map(([, name = ""]) => name);
  if (names.length === 0) return [];
  const tags = new RegExp(
    String.raw`<(?:${names.map(escaped).join("|")})(${writtenProps.source})(?=[\s/>])`,
    "g",
  );
  return [...text.matchAll(tags)];
}

function componentProps(text: string, component: string): WrittenProp[] {
  return componentTags(text, component).flatMap(({ 0: tag, 1: props = "", index }) => {
    const propsStart = index + tag.length - props.length;
    return [...props.matchAll(writtenProp)].map(
      ({ 0: whole, 1: name = "", 2: written = "", index: at }) => {
        const start = propsStart + at;
        return { name, written, start, writtenStart: start + whole.length - written.length };
      },
    );
  });
}

// A prop's value is a string or an expression in braces, which may hold one object in braces of its
// own, as `answers={{ … }}` does.
const writtenValue = String.raw`"[^"]*"|'[^']*'|\{(?:[^{}]|\{[^{}]*\})*\}`;
const writtenProp = new RegExp(String.raw`([\w:-]+)(?:\s*=\s*(${writtenValue}))?`, "g");
const writtenProps = new RegExp(String.raw`(?:\s+[\w:-]+(?:\s*=\s*(?:${writtenValue}))?)*`);

function unquoted(written: string): string | undefined {
  return (/^\{\s*(["'\x60])(.*)\1\s*\}$/s.exec(written) ?? /^(["'])(.*)\1$/s.exec(written))?.[2];
}

// The page and the entry list a component's instances in the same order, unless one wasn't rendered,
// such as one inside a component whose rule is broken. Then the counts disagree and none is placed.
function instanceOffset(
  text: string,
  { module, occurrence, onPage }: { module: string; occurrence: number; onPage: number },
): number | undefined {
  const tags = componentTags(text, module);
  return tags.length === onPage ? tags[occurrence]?.index : undefined;
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
