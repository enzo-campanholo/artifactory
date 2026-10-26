import { entriesOf, readArtifacts } from "../../../src/artifacts.ts";
import { importableComponents } from "../../component-reference.ts";
import { acrossArtifacts } from "../artifact-checks/across-artifacts.ts";
import { buildImportFailures } from "../artifact-checks/custom-builds.ts";
import { fileFailures, mdxFailures, svgFailures } from "../artifact-checks/content-only.ts";
import type { Step } from "../step.ts";

export const artifactChecks: Step = {
  name: "artifact checks",
  async run(root) {
    const repo = await readArtifacts(root);
    const { artifacts, looseFiles } = repo;
    const components = (await importableComponents(root)).map(({ specifier }) => specifier);
    const figureFailures = await Promise.all(
      artifacts.map((artifact) => svgFailures(root, artifact)),
    );
    const importFailures = await Promise.all(
      artifacts.map((artifact) => buildImportFailures(root, artifact)),
    );
    return [
      ...acrossArtifacts(repo),
      ...fileFailures(artifacts, looseFiles),
      ...entriesOf(artifacts).flatMap((entry) => mdxFailures(entry, components)),
      ...figureFailures.flat(),
      ...importFailures.flat(),
    ];
  },
};
