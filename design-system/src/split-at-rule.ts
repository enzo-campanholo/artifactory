export function splitAtRule(html: string): { before: string; after: string } | undefined {
  const rule = /<hr\b[^>]*>/.exec(html);
  return rule === null
    ? undefined
    : {
        before: html.slice(0, rule.index).trim(),
        after: html.slice(rule.index + rule[0].length).trim(),
      };
}
