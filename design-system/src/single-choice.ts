import { componentError } from "./component-errors.ts";

const optionsList = /<ol\b[^>]*>([\s\S]*)<\/ol>\s*$/;
const optionItem = /<li\b[^>]*>([\s\S]*?)<\/li>/g;
const singleParagraph = /^\s*<p>((?:(?!<\/?p\b)[\s\S])*)<\/p>\s*$/;

export function singleChoiceParts(
  html: string,
  answer: number,
): { prompt: string; options: string[] } {
  const list = optionsList.exec(html);
  if (list === null || html.match(/<ol\b/g)?.length !== 1 || /<(?:ul|ol)\b/.test(list[1] ?? "")) {
    throw componentError(
      "SingleChoice",
      "write the question, then its options as one numbered list at the end, with no list inside an option",
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
  return { prompt: html.slice(0, list.index), options };
}
