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

// A question's number is written on the element that names it, as `data-number`, which its CSS
// prints: a question's header, a matching item's row number, and a matching's header, which takes
// its first and last items' numbers as its range. Each takes the outline's number, the one the
// question manifest and the Library's questions block carry.
export function questionNumberMarker(questionId: string) {
  return { "data-question-number": questionId };
}

export function questionRangeMarker(firstId: string, lastId: string) {
  return { "data-question-range-from": firstId, "data-question-range-to": lastId };
}

export function withQuestionNumbers(
  content: string,
  questions: readonly { id: string; number: number }[],
): string {
  const numbers = new Map(questions.map(({ id, number }) => [id, String(number)]));
  const insertions: { at: number; text: string }[] = [];
  for (const tag of tags(content)) {
    if (tag.closing) continue;
    const numberOf = (marker: string) => {
      const id = attributeValue(tag.attributes, marker);
      return id === undefined ? undefined : numbers.get(id);
    };
    const own = numberOf("data-question-number");
    const first = numberOf("data-question-range-from");
    const last = numberOf("data-question-range-to");
    const number =
      own ?? (first === undefined || last === undefined ? undefined : `${first}–${last}`);
    if (number !== undefined) insertions.push({ at: tag.end, text: ` data-number="${number}"` });
  }
  return withInserted(content, insertions);
}
