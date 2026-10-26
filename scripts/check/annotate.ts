import { readFile } from "node:fs/promises";
import { closingBlockIn, parseFailures } from "../../src/check-failure.ts";

// GitHub Actions shows at most 10 error annotations per step.
const maxAnnotations = 10;

const [logFile] = process.argv.slice(2);
if (logFile === undefined) throw new Error("usage: node scripts/check/annotate.ts <check log>");

const log = await readFile(logFile, "utf8");
const failures = parseFailures(closingBlockIn(log).join("\n"));
const annotated = failures.slice(0, maxAnnotations);

function escapeData(text: string): string {
  return text.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}

function escapeProperty(text: string): string {
  return escapeData(text).replaceAll(":", "%3A").replaceAll(",", "%2C");
}

for (const { file, line, column, ruleId, message, skillSection } of annotated) {
  const location = `file=${escapeProperty(file)},line=${String(line)},col=${String(column)}`;
  const text = `${ruleId}: ${message} (artifact skill: ${skillSection})`;
  console.log(`::error ${location}::${escapeData(text)}`);
}
