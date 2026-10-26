import { spawn } from "node:child_process";
import { join } from "node:path";
import { stripVTControlCharacters } from "node:util";

export interface ToolRun {
  exitCode: number;
  stdout: string;
  output: string;
}

export function runTool(root: string, tool: string, args: string[]): Promise<ToolRun> {
  return new Promise((resolve, reject) => {
    const child = spawn(join(root, "node_modules/.bin", tool), args, {
      cwd: root,
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", ASTRO_TELEMETRY_DISABLED: "1" },
    });
    let stdout = "";
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({
        exitCode: exitCode ?? 1,
        stdout: stripVTControlCharacters(stdout),
        output: stripVTControlCharacters(output),
      });
    });
  });
}
