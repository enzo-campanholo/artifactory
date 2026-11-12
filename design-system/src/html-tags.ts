import { unescapedAttribute } from "./html-attributes.ts";

const voidElements = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

// Astro writes well-formed HTML with every attribute value quoted, and code blocks escape their
// "<", so a tag is a tag. Script and style bodies, and comments, are skipped whole.
const token =
  /<!--[\s\S]*?-->|<(script|style)\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1\s*>|<\/[a-zA-Z][\w:-]*\s*>|<([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;

// An opening tag's depth is the number of elements open around it, and `end` is the offset of its
// ">". A closing tag's depth is the one its element was opened at.
type Tag =
  | { closing: false; element: string; attributes: string; depth: number; end: number }
  | { closing: true; depth: number };

export function* tags(content: string): Generator<Tag> {
  let depth = 0;
  for (const { 0: tag, 1: rawText, 2: name, 3: attributes = "", index } of content.matchAll(
    token,
  )) {
    if (rawText !== undefined || tag.startsWith("<!")) continue;
    if (name === undefined) {
      depth = Math.max(0, depth - 1);
      yield { closing: true, depth };
      continue;
    }
    const element = name.toLowerCase();
    yield { closing: false, element, attributes, depth, end: index + tag.length - 1 };
    if (!voidElements.has(element) && !attributes.endsWith("/")) depth += 1;
  }
}

export function attributeValue(attributes: string, name: string): string | undefined {
  const written = new RegExp(String.raw`\s${name}="([^"]*)"`).exec(attributes)?.[1];
  return written === undefined ? undefined : unescapedAttribute(written);
}

export function withInserted(content: string, insertions: { at: number; text: string }[]): string {
  let written = "";
  let from = 0;
  for (const { at, text } of [...insertions].sort((a, b) => a.at - b.at)) {
    written += content.slice(from, at) + text;
    from = at;
  }
  return written + content.slice(from);
}
