import { pathToFileURL } from "node:url";
import { parentPort, workerData } from "node:worker_threads";
import type { Build, Content, Typed } from "@artifactory/design-system/stage-build";
import {
  runBuild,
  type Control,
  type Run,
  type Written,
} from "@artifactory/design-system/step-applier";

export interface Job {
  file: string;
  control: Control;
  inputs: (string | Typed)[];
  written: Written;
  lang: Content["lang"];
}

export interface Thrown {
  message: string;
  stack: string;
}

export type Result =
  | { loaded: false; error: Thrown }
  | { loaded: true; input: string | Typed; run: Exclude<Run, { refused: "threw" }> }
  | { loaded: true; input: string | Typed; run: { refused: "threw"; error: Thrown } };

function thrown(error: unknown): Thrown {
  return error instanceof Error
    ? { message: error.message, stack: error.stack ?? "" }
    : { message: String(error), stack: "" };
}

// The check runs each build here, in a thread it can stop, since a build that never returns would
// hang the check with it.
const { file, control, inputs, written, lang } = workerData as Job;
const post = (result: Result) => {
  parentPort?.postMessage(result);
};
try {
  const build = ((await import(pathToFileURL(file).href)) as { default: Build<string | Typed> })
    .default;
  for (const input of inputs) {
    const run = runBuild(build, control, input, written, lang);
    post(
      "refused" in run && run.refused === "threw"
        ? { loaded: true, input, run: { refused: "threw", error: thrown(run.error) } }
        : { loaded: true, input, run },
    );
  }
} catch (error) {
  post({ loaded: false, error: thrown(error) });
}
