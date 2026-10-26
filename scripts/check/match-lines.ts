export function matchLines<Name extends string>(
  output: string,
  pattern: RegExp,
  names: readonly Name[],
): Record<Name, string>[] {
  return output.split("\n").flatMap((line) => {
    const groups = pattern.exec(line)?.groups;
    if (groups === undefined) return [];
    return [
      Object.fromEntries(names.map((name) => [name, groups[name] ?? ""])) as Record<Name, string>,
    ];
  });
}
