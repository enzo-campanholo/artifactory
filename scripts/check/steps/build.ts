import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join, relative } from "node:path";
import {
  contentTypesFile,
  readBuildResult,
  type BuildResult,
} from "../../../src/build-failures.ts";
import type { Failure } from "../../../src/check-failure.ts";
import { componentNamesIn } from "@artifactory/design-system/component-errors";
import { importableComponents } from "../../component-reference.ts";
import { artifactsFolderItems, entryFile, readEntry } from "../../../src/artifacts.ts";
import { locate } from "../../../src/source-locator.ts";
import { runTool } from "../run-tool.ts";

interface LogRecord {
  message: string;
  label: string | null;
  level: string;
}

export async function build(root: string): Promise<BuildResult> {
  await rm(join(root, contentTypesFile), { force: true });
  const astroBuild = await runTool(root, "astro", ["build", "--json"]);
  const { failures, contentSynced, builtOutput } = readBuildResult(root);
  const { records, text } = splitLog(astroBuild.output);
  const unreported =
    astroBuild.exitCode !== 0 && failures.length === 0
      ? [await failureFromAstroError(root, records, text)]
      : [];
  const libraryIsEmpty = (await artifactsFolderItems(root)).length === 0;
  return {
    failures: [
      ...failures,
      ...unreported,
      ...warnings(records).filter(
        ({ message }) =>
          !(libraryIsEmpty && emptyLibraryWarnings.some((pattern) => pattern.test(message))),
      ),
    ],
    contentSynced,
    builtOutput,
  };
}

// Astro logs through its JSON logger, but prints the error that ends a build as plain text.
function splitLog(output: string): { records: LogRecord[]; text: string[] } {
  const records: LogRecord[] = [];
  const text: string[] = [];
  for (const line of output.split("\n")) {
    const record = logRecord(line);
    if (record === undefined) text.push(line);
    else records.push(record);
  }
  return { records, text };
}

function logRecord(line: string): LogRecord | undefined {
  if (!line.startsWith("{")) return undefined;
  try {
    const { message, label, level } = JSON.parse(line) as Partial<LogRecord>;
    return typeof message === "string" && typeof level === "string"
      ? { message, label: label ?? null, level }
      : undefined;
  } catch {
    return undefined;
  }
}

// An empty library is valid, but Astro warns about it: the glob loader finds no entries, or no
// `artifacts/` at all since git keeps no empty folder, and `getCollection` finds no collection.
const emptyLibraryWarnings = [
  /^The base directory ".*\/artifacts\/" does not exist\.$/,
  /^No files found matching "\*\/index\.mdx" in directory "artifacts"$/,
  /^The collection "artifacts" does not exist or is empty\./,
];

type Place = Pick<Failure, "file" | "line" | "column">;

const configStart: Place = { file: "astro.config.ts", line: 1, column: 1 };

function warnings(records: LogRecord[]): Failure[] {
  return records
    .filter(({ level }) => level === "warn")
    .map(({ label, message }) => ({
      ...configStart,
      ruleId: label === null ? "build-warning" : `build-warning/${label}`,
      message,
      skillSection: "Build failures",
    }));
}

async function failureFromAstroError(
  root: string,
  records: LogRecord[],
  text: string[],
): Promise<Failure> {
  const locationIndex = text.findIndex((line) => line.trim() === "Location:");
  const location = /^\s*(?<file>.+):(?<line>\d+):(?<column>\d+)$/.exec(
    text[locationIndex + 1] ?? "",
  )?.groups;
  const message = text
    .slice(0, locationIndex === -1 ? undefined : locationIndex)
    .findLast((line) => /^\S/.test(line))
    ?.trim();
  const place: Place | undefined =
    location?.file === undefined
      ? await componentInArtifact(root, failedPage(records), message)
      : {
          file: relative(root, location.file),
          line: Math.max(1, Number(location.line)),
          column: Math.max(1, Number(location.column)),
        };
  return {
    ...(place ?? configStart),
    ruleId: "build",
    message: message ?? "the build failed",
    skillSection: "Build failures",
  };
}

function failedPage(records: LogRecord[]): string | undefined {
  return records
    .filter(({ level, label }) => level === "error" && label === "build")
    .map(({ message }) => /^Caught error rendering \/(?<slug>[^/\s:]+)\/?:/.exec(message))
    .find((match) => match !== null)?.groups?.slug;
}

// A component's own error has no location, but the build log names the page it failed on.
async function componentInArtifact(
  root: string,
  slug: string | undefined,
  message: string | undefined,
): Promise<Place | undefined> {
  const names = await componentsNamedIn(root, message ?? "");
  if (slug === undefined || names.length === 0) return undefined;
  if (!existsSync(join(root, entryFile(slug)))) return undefined;
  const { file, source } = await readEntry(root, slug);
  return { file, ...locate(source, { kind: "component", names }).position };
}

async function componentsNamedIn(root: string, message: string): Promise<string[]> {
  const names = componentNamesIn(message);
  const components = new Set((await importableComponents(root)).map(({ name }) => name));
  return names.every((name) => components.has(name)) ? names : [];
}
