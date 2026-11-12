import { attributeValue, tags, withInserted } from "./html-tags.ts";

// The page's CSS prints each number from `data-number` on the element whose margin shows it: a
// section's on its h2, a clause's on a paragraph or h3 of the main column, or on a statement's first
// child, its first line. A clause is any of these after the first h2, in one series per section, so
// a proof, an example's solution and anything in a list or a question take none. A figure's or a
// diagram's number reads its section's from `data-section`.
export function withSectionAndClauseNumbers(content: string): string {
  const insertions: { at: number; text: string }[] = [];
  const write = (at: number, name: string, value: string) => {
    insertions.push({ at, text: ` ${name}="${value}"` });
  };
  let section = 0;
  let clause = 0;
  let statementNumber: string | undefined;
  for (const tag of tags(content)) {
    if (tag.closing) continue;
    const { element, attributes, depth, end } = tag;
    if (statementNumber !== undefined && depth === 1) write(end, "data-number", statementNumber);
    statementNumber = undefined;
    if (depth === 0 && element === "h2") {
      section += 1;
      clause = 0;
      write(end, "data-number", String(section));
    } else if (depth === 0 && section > 0) {
      const isStatement = attributeValue(attributes, "data-statement-id") !== undefined;
      if (element === "p" || element === "h3" || isStatement) {
        clause += 1;
        const number = `${String(section)}.${String(clause)}`;
        if (isStatement) statementNumber = number;
        else write(end, "data-number", number);
      }
    }
    if (section > 0 && attributeValue(attributes, "class")?.split(" ").includes("figure-number")) {
      write(end, "data-section", String(section));
    }
  }
  return withInserted(content, insertions);
}
