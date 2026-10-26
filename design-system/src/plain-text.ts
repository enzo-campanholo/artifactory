interface Tag {
  name: string;
  children: (Tag | string)[];
}

const voidElements = new Set(["br", "img", "wbr", "mspace"]);

// Astro escapes only `&` and `"` in attribute values, so a value can hold a `>`.
const token = /<(\/?)([a-zA-Z][\w-]*)(?:[^>"']|"[^"]*"|'[^']*')*?(\/?)>|([^<]+)/g;

const entities = new Map([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
]);

function zipped(from: string, to: string): Map<string, string> {
  const targets = Array.from(to);
  return new Map(
    Array.from(from).map((character, index) => [character, targets[index] ?? character]),
  );
}

const superscripts = zipped("0123456789+-−=()in", "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁻⁼⁽⁾ⁱⁿ");
const subscripts = zipped("0123456789+-−=()aehijklmnoprstuvx", "₀₁₂₃₄₅₆₇₈₉₊₋₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ");

// Chrome leaves MathML out of an element's name, so a name that holds math writes it out on one
// line instead: "O(n²)", "n(n+1)/2".
export function plainText(html: string): string {
  return spoken(parsed(html)).replace(/\s+/g, " ").trim();
}

function parsed(html: string): Tag {
  const root: Tag = { name: "", children: [] };
  const open = [root];
  for (const [, closing, written = "", selfClosing, text] of html.matchAll(token)) {
    const parent = open.at(-1) ?? root;
    const name = written.toLowerCase();
    if (text !== undefined) parent.children.push(decoded(text));
    else if (closing === "/") {
      while (open.length > 1 && open.pop()?.name !== name);
    } else {
      const tag: Tag = { name, children: [] };
      parent.children.push(tag);
      if (selfClosing !== "/" && !voidElements.has(name)) open.push(tag);
    }
  }
  return root;
}

function decoded(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (written, name: string) => {
    if (/^#x/i.test(name)) return String.fromCodePoint(Number.parseInt(name.slice(2), 16));
    if (name.startsWith("#")) return String.fromCodePoint(Number(name.slice(1)));
    return entities.get(name) ?? written;
  });
}

function spoken(node: Tag | string): string {
  if (typeof node === "string") return node;
  const parts = node.children.map(spoken);
  const [first = "", second = "", third = ""] = parts;
  switch (node.name) {
    case "annotation":
    case "annotation-xml":
      return "";
    case "msup":
    case "mover":
      return first + script(second, superscripts, "^");
    case "msub":
    case "munder":
      return first + script(second, subscripts, "_");
    case "msubsup":
    case "munderover":
      return first + script(second, subscripts, "_") + script(third, superscripts, "^");
    case "mfrac":
      return `${grouped(first)}/${grouped(second)}`;
    case "msqrt":
      return `√${grouped(parts.join(""))}`;
    case "mroot":
      return `${script(second, superscripts, "^")}√${grouped(first)}`;
    default:
      return parts.join("");
  }
}

function script(text: string, characters: Map<string, string>, mark: string): string {
  const written = Array.from(text).map((character) => characters.get(character));
  if (written.every((character) => character !== undefined)) return written.join("");
  return mark + (Array.from(text).length === 1 ? text : `(${text})`);
}

function grouped(text: string): string {
  let outside = text;
  while (/\([^()]*\)/.test(outside)) outside = outside.replace(/\([^()]*\)/g, "");
  return /[-+−±=/\s]/.test(outside) ? `(${text})` : text;
}
