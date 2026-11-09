import { componentError } from "./component-errors.ts";
import { splitAtRule } from "./split-at-rule.ts";

export interface MatchingItem {
  id: string;
  key: number;
  text: string;
}

const optionsList = /<ol\b[^>]*>([\s\S]*)<\/ol>\s*$/;
const itemsList = /^<ul\b[^>]*>((?:(?!<\/?(?:ul|ol)\b)[\s\S])*)<\/ul>/;
const listItem = /<li\b[^>]*>([\s\S]*?)<\/li>/g;
const singleParagraph = /^\s*<p>((?:(?!<\/?p\b)[\s\S])*)<\/p>\s*$/;

const shape =
  "write the prompt, then its options as one numbered list, then a blank line, `---`, another blank line and its items as one bulleted list, with no list inside an option or item";

function inlineParts(items: string): string[] {
  return [...items.matchAll(listItem)].map(([, item = ""]) => {
    if (!/<p\b/.test(item)) return item.trim();
    const paragraph = singleParagraph.exec(item);
    if (paragraph === null)
      throw componentError("Matching", "keep each option and each item to one paragraph");
    return paragraph[1] ?? "";
  });
}

const counted = (count: number, one: string, many: string) =>
  `${String(count)} ${count === 1 ? one : many}`;

function countProblems(options: number, items: number, answers: [string, number][]): string[] {
  return [
    ...(options < 2
      ? [`it has ${counted(options, "option", "options")}; give it at least two`]
      : []),
    ...(items < 2 ? [`it has ${counted(items, "item", "items")}; give it at least two`] : []),
    ...(answers.length === items
      ? []
      : [
          `\`answers\` has ${counted(answers.length, "answer", "answers")} for its ${counted(items, "item", "items")}; give one per item, in the items' order`,
        ]),
    ...answers.flatMap(([id, key]) =>
      Number.isInteger(key) && key >= 1 && key <= options
        ? []
        : [
            `\`answers\` gives \`${id}\` ${String(key)}, but it must be the number of one of its ${counted(options, "option", "options")}`,
          ],
    ),
  ];
}

export function matchingParts(
  html: string,
  answers: Record<string, number>,
): { prompt: string; options: string[]; items: MatchingItem[] } {
  const parts = splitAtRule(html);
  const question = parts?.before ?? "";
  const options = optionsList.exec(question);
  const items = itemsList.exec(parts?.after ?? "");
  if (
    options === null ||
    items === null ||
    question.match(/<(?:ul|ol)\b/g)?.length !== 1 ||
    /<(?:ul|ol)\b/.test(options[1] ?? "")
  ) {
    throw componentError("Matching", shape);
  }
  if ((parts?.after ?? "").slice(items[0].length).trim() !== "") {
    throw componentError("Matching", "end it with the items' bulleted list: nothing may follow it");
  }
  const optionTexts = inlineParts(options[1] ?? "");
  const itemTexts = inlineParts(items[1] ?? "");
  const keys = Object.entries(answers);
  const problems = countProblems(optionTexts.length, itemTexts.length, keys);
  if (problems.length > 0) throw componentError("Matching", problems.join("; "));
  return {
    prompt: question.slice(0, options.index),
    options: optionTexts,
    items: keys.map(([id, key], index) => ({ id, key, text: itemTexts[index] ?? "" })),
  };
}
