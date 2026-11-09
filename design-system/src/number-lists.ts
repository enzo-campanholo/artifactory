// The list grammar a Stepper's `lines` and a figure's `data-step` share: `3`, `3-5`, `3-` (to
// `last`) and `1-2, 6`, each number from `first` to `last`.
export function numberList(
  list: string,
  first: number,
  last: number,
): { numbers: number[] } | { refused: string } {
  const numbers: number[] = [];
  for (const item of list.split(",")) {
    const range = /^\s*(\d+)\s*(?:(-)\s*(\d*)\s*)?$/.exec(item);
    const from = Number(range?.[1]);
    const to = range?.[2] === undefined ? from : range[3] === "" ? last : Number(range[3]);
    if (range === null || from < first || to < from || to > last) {
      return {
        refused: `must list numbers from ${String(first)} to ${String(last)}, such as "2", "2-4", "2-" or "1-2, 5"`,
      };
    }
    for (let number = from; number <= to; number += 1) numbers.push(number);
  }
  return { numbers };
}
