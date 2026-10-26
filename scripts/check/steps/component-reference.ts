import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { componentReference, referenceFile, regenerateCommand } from "../../component-reference.ts";
import { platformFailure, type Step } from "../step.ts";

function failure(message: string) {
  return [platformFailure(referenceFile, "component-reference", message)];
}

export const componentReferenceFreshness: Step = {
  name: "component reference",
  async run(root) {
    let expected: string;
    try {
      expected = await componentReference(root);
    } catch (error) {
      return failure(
        `can't be generated: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const current = await readFile(join(root, referenceFile), "utf8").catch(() => undefined);
    if (current === expected) return [];
    return failure(`is out of date with the design system's source; run \`${regenerateCommand}\``);
  },
};
