import { attributeValue, tags, withInserted, type Insertion } from "./html-tags.ts";

// The page's CSS prints each number from `data-number` on the element that shows it.
function numberAt(tagEnd: number, number: string): Insertion {
  return { at: tagEnd, text: ` data-number="${number}"` };
}

// A section's number goes on its h2, a clause's on a paragraph or h3 of the main column, or on a
// statement's first child, its first line. A clause is any of these after the first h2, in one
// series per section, so a proof, an example's solution and anything in a list or a question take
// none.
export function withSectionAndClauseNumbers(content: string): string {
  const numbers: Insertion[] = [];
  let section = 0;
  let clause = 0;
  let statementNumber: string | undefined;
  for (const tag of tags(content)) {
    if (tag.closing) continue;
    const { element, attributes, depth, end } = tag;
    if (statementNumber !== undefined && depth === 1) numbers.push(numberAt(end, statementNumber));
    statementNumber = undefined;
    if (depth === 0 && element === "h2") {
      section += 1;
      clause = 0;
      numbers.push(numberAt(end, String(section)));
    } else if (depth === 0 && section > 0) {
      const isStatement = attributeValue(attributes, "data-statement-id") !== undefined;
      if (element === "p" || element === "h3" || isStatement) {
        clause += 1;
        const number = `${String(section)}.${String(clause)}`;
        if (isStatement) statementNumber = number;
        else numbers.push(numberAt(end, number));
      }
    }
  }
  return withInserted(content, numbers);
}

// Reads each section's number from its h2's `data-number`, so it runs after
// `withSectionAndClauseNumbers`. A displayed equation in the main column, or directly in one of its
// statements or proofs, takes the next number of one series across the page, written on the
// equation. A figure, a Stage's included, or a diagram takes the next of its kind's series in its
// section ("4.1"), or before the first section a number alone, written on its `.figure-number`.
// Nothing in a question's model answer or explanation takes one: a number on a figure the page
// hides would leave a gap in the series the owner sees.
export function withEquationFigureAndDiagramNumbers(content: string): string {
  const numbers: Insertion[] = [];
  let equation = 0;
  let section: string | undefined;
  const drawings = { figure: 0, diagram: 0 };
  let inStatementOrProof = false;
  let revealedDepth: number | undefined;
  const openFigures: { depth: number; number: string }[] = [];
  for (const tag of tags(content)) {
    if (tag.closing) {
      if (tag.depth === revealedDepth) revealedDepth = undefined;
      if (openFigures.at(-1)?.depth === tag.depth) openFigures.pop();
      continue;
    }
    const { element, attributes, depth, end } = tag;
    const classes = attributeValue(attributes, "class")?.split(" ") ?? [];
    if (depth === 0) {
      inStatementOrProof = classes.includes("statement") || classes.includes("proof");
      if (element === "h2") {
        section = attributeValue(attributes, "data-number");
        drawings.figure = 0;
        drawings.diagram = 0;
      }
    }
    if (revealedDepth !== undefined) continue;
    if (classes.includes("question-revealed")) {
      revealedDepth = depth;
    } else if (
      classes.includes("equation") &&
      (depth === 0 || (depth === 1 && inStatementOrProof))
    ) {
      equation += 1;
      numbers.push(numberAt(end, String(equation)));
    } else if (
      element === "figure" &&
      (classes.includes("figure") || classes.includes("diagram"))
    ) {
      const kind = classes.includes("figure") ? "figure" : "diagram";
      drawings[kind] += 1;
      const count = String(drawings[kind]);
      openFigures.push({ depth, number: section === undefined ? count : `${section}.${count}` });
    } else if (classes.includes("figure-number")) {
      const figure = openFigures.at(-1);
      if (figure !== undefined) numbers.push(numberAt(end, figure.number));
    }
  }
  return withInserted(content, numbers);
}

// A question's number is written on the element that names it: a question's header, a matching
// item's row number, and a matching's header, which takes its first and last items' numbers as its
// range. Each takes its number in the page's order of questions, the one the question manifest and
// the Library's questions block carry.
export function questionNumberAttributes(questionId: string) {
  return { "data-question-number": questionId };
}

export function questionRangeAttributes(firstId: string, lastId: string) {
  return { "data-question-range-from": firstId, "data-question-range-to": lastId };
}

export function withQuestionNumbers(
  content: string,
  questions: readonly { id: string; number: number }[],
): string {
  const numberOf = new Map(questions.map(({ id, number }) => [id, String(number)]));
  const numbers: Insertion[] = [];
  for (const tag of tags(content)) {
    if (tag.closing) continue;
    const numberFor = (attribute: string) => {
      const id = attributeValue(tag.attributes, attribute);
      return id === undefined ? undefined : numberOf.get(id);
    };
    const own = numberFor("data-question-number");
    const first = numberFor("data-question-range-from");
    const last = numberFor("data-question-range-to");
    const number =
      own ?? (first === undefined || last === undefined ? undefined : `${first}–${last}`);
    if (number !== undefined) numbers.push(numberAt(tag.end, number));
  }
  return withInserted(content, numbers);
}
