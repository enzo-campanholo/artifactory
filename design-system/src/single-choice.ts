import { componentError } from "./component-errors.ts";
import { splitAtRule } from "./split-at-rule.ts";

const optionsList = /<ol\b[^>]*>([\s\S]*)<\/ol>\s*$/;
const optionItem = /<li\b[^>]*>([\s\S]*?)<\/li>/g;
const singleParagraph = /^\s*<p>((?:(?!<\/?p\b)[\s\S])*)<\/p>\s*$/;

export function singleChoiceParts(
  html: string,
  answer: number,
): { prompt: string; options: string[]; explanation: string | undefined } {
  const parts = splitAtRule(html);
  const question = parts?.before ?? html;
  const explanation = parts?.after;
  const list = optionsList.exec(question);
  if (
    list === null ||
    question.match(/<ol\b/g)?.length !== 1 ||
    /<(?:ul|ol)\b/.test(list[1] ?? "")
  ) {
    throw componentError(
      "SingleChoice",
      "write the question, then its options as one numbered list at the end, before any `---`, with no list inside an option",
    );
  }
  if (explanation === "") {
    throw componentError(
      "SingleChoice",
      "write the explanation after `---`, or leave out the `---`",
    );
  }
  const options = [...(list[1] ?? "").matchAll(optionItem)].map(([, option = ""]) => {
    if (!/<p\b/.test(option)) return option.trim();
    const paragraph = singleParagraph.exec(option);
    if (paragraph === null)
      throw componentError("SingleChoice", "keep each option to one paragraph");
    return paragraph[1] ?? "";
  });
  if (options.length < 2) {
    throw componentError(
      "SingleChoice",
      `it has ${String(options.length)} option; give it at least two`,
    );
  }
  if (!Number.isInteger(answer) || answer < 1 || answer > options.length) {
    throw componentError(
      "SingleChoice",
      `\`answer\` is ${String(answer)}, but it must be the number of one of its ${String(options.length)} options`,
    );
  }
  return { prompt: question.slice(0, list.index), options, explanation };
}
