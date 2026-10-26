const skillSections = [
  "Frontmatter",
  "Slugs",
  "Links",
  "Artifact files",
  "Content only",
  "Math",
  "Code blocks",
  "Diagrams and figures",
  "Components",
  "Custom builds",
  "HTML",
  "Build failures",
  "Platform changes",
] as const;

type SkillSection = (typeof skillSections)[number];

export interface Failure {
  file: string;
  line: number;
  column: number;
  ruleId: string;
  message: string;
  skillSection: SkillSection;
}

export type Report = (failure: Failure) => void;

export function formatFailure({
  file,
  line,
  column,
  ruleId,
  message,
  skillSection,
}: Failure): string {
  return `${file}:${String(line)}:${String(column)} error ${ruleId}: ${message} (artifact skill: ${skillSection})`;
}

const failureLine =
  /(?<file>[^\s:]+):(?<line>\d+):(?<column>\d+) error (?<ruleId>\S+): (?<message>.*) \(artifact skill: (?<skillSection>[^)]+)\)/;

function isSkillSection(section: string): section is SkillSection {
  return (skillSections as readonly string[]).includes(section);
}

export function parseFailures(output: string): Failure[] {
  return output.split("\n").flatMap((text) => {
    const match = failureLine.exec(text)?.groups;
    if (match === undefined) return [];
    const { file = "", line, column, ruleId = "", message = "", skillSection = "" } = match;
    if (!isSkillSection(skillSection)) return [];
    return [{ file, line: Number(line), column: Number(column), ruleId, message, skillSection }];
  });
}

export function closingBlock(failureLines: readonly string[]): string[] {
  const count = failureLines.length;
  return [`pnpm check: ${String(count)} ${count === 1 ? "failure" : "failures"}`, ...failureLines];
}

export function closingBlockIn(log: string): string[] {
  const lines = log.trimEnd().split("\n");
  const start = lines.findLastIndex((line) => /^pnpm check: \d+ failures?$/.test(line));
  return start === -1 ? [] : lines.slice(start);
}

export interface Position {
  line: number;
  column: number;
}

export function positionAt(source: string, offset: number): Position {
  const before = source.slice(0, offset);
  return {
    line: before.split("\n").length,
    column: offset - before.lastIndexOf("\n"),
  };
}
