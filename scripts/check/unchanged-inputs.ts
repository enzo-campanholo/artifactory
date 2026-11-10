import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { atomicJson, readJson } from "../heavy-state.ts";
import type { Step } from "./step.ts";

type Reads = NonNullable<Step["reads"]>;

// Fixture repos share this folder, and several differ only in files a step doesn't read, so each
// step keeps more than its latest pass.
const remembered = 8;

// TypeScript loads these and nothing else, so no other file can change what a type check or a
// typed lint reports.
export const isCode: Reads = (file) => /\.(astro|[cm]?[jt]sx?|json)$/.test(file);

// A step's result can change only with a file it reads, a dependency or Node itself. Git lists the
// files; Astro's generated types are ignored by git, but the type checks read them.
export function inputsOf(root: string, { reads }: Step): string | undefined {
  if (reads === undefined) return undefined;
  const listed = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  )
    .split("\0")
    .filter((file) => file !== "" && (file === "pnpm-lock.yaml" || reads(file)));
  const generated = existsSync(join(root, ".astro"))
    ? readdirSync(join(root, ".astro"), { recursive: true, encoding: "utf8" })
        .filter((file) => file.endsWith(".d.ts"))
        .map((file) => `.astro/${file}`)
    : [];
  const hash = createHash("sha256").update(process.version);
  for (const file of [...new Set([...listed, ...generated])].sort()) {
    hash.update(`\0${file}\0`);
    try {
      hash.update(readFileSync(join(root, file)));
    } catch (error) {
      // Git still lists a deleted file, and lists a folder another repo owns as one path.
      const { code } = error as NodeJS.ErrnoException;
      if (code !== "ENOENT" && code !== "EISDIR") throw error;
      hash.update(code);
    }
  }
  return hash.digest("hex");
}

function passesFile(root: string, step: Step): string {
  return join(
    root,
    "node_modules/.cache/check-passed",
    `${step.name.toLowerCase().replaceAll(" ", "-")}.json`,
  );
}

function passes(root: string, step: Step): string[] {
  try {
    const inputs = readJson(passesFile(root, step));
    return Array.isArray(inputs) ? inputs.filter((item) => typeof item === "string") : [];
  } catch {
    // No pass yet, or a file cut short: either way the step runs.
    return [];
  }
}

export function passedWith(root: string, step: Step, inputs: string): boolean {
  return passes(root, step).includes(inputs);
}

export function rememberPass(root: string, step: Step, inputs: string): void {
  mkdirSync(join(root, "node_modules/.cache/check-passed"), { recursive: true });
  atomicJson(
    passesFile(root, step),
    [inputs, ...passes(root, step).filter((earlier) => earlier !== inputs)].slice(0, remembered),
  );
}
