import { brokenRule } from "./component-rules.ts";
import { inlineItems, optionsList } from "./list-items.ts";
import { splitAtRule } from "./split-at-rule.ts";

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
    throw brokenRule(
      "SingleChoice",
      "write the question, then its options as one numbered list at the end, before any `---`, with no list inside an option",
    );
  }
  if (explanation === "") {
    throw brokenRule("SingleChoice", "write the explanation after `---`, or leave out the `---`");
  }
  const options = inlineItems(list[1] ?? "");
  if (options === undefined) {
    throw brokenRule("SingleChoice", "keep each option to one paragraph");
  }
  if (options.length < 2) {
    throw brokenRule(
      "SingleChoice",
      `it has ${String(options.length)} option; give it at least two`,
    );
  }
  if (!Number.isInteger(answer) || answer < 1 || answer > options.length) {
    throw brokenRule(
      "SingleChoice",
      `\`answer\` is ${String(answer)}, but it must be the number of one of its ${String(options.length)} options`,
    );
  }
  return { prompt: question.slice(0, list.index), options, explanation };
}
