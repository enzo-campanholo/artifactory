// A question's options: one numbered list at the end of the HTML it's given.
export const optionsList = /<ol\b[^>]*>([\s\S]*)<\/ol>\s*$/;

const listItem = /<li\b[^>]*>([\s\S]*?)<\/li>/g;
const singleParagraph = /^\s*<p>((?:(?!<\/?p\b)[\s\S])*)<\/p>\s*$/;

// Markdown wraps a list's items in paragraphs once a blank line separates them, so an item's one
// paragraph unwraps to its inline HTML, and a list with an item of more paragraphs gives none.
export function inlineItems(list: string): string[] | undefined {
  const items: string[] = [];
  for (const [, item = ""] of list.matchAll(listItem)) {
    if (!/<p\b/.test(item)) {
      items.push(item.trim());
      continue;
    }
    const paragraph = singleParagraph.exec(item);
    if (paragraph === null) return undefined;
    items.push(paragraph[1] ?? "");
  }
  return items;
}
