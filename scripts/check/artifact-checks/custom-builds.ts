import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { mdxToMdast, type MdastNode } from "satteri";
import typescript from "typescript";
import type { Artifact } from "../../../src/artifacts.ts";
import { positionAt, type Failure } from "../../../src/check-failure.ts";
import { designSystemPackage } from "../../component-reference.ts";

const stage = `${designSystemPackage}stage`;
const stageBuild = `${designSystemPackage}stage-build`;
export const buildFile = /^[^/]+\.build\.ts$/;

// The `build` of every Stage in the entry, by the name the entry imports the Stage under, or
// nothing when the entry doesn't parse: the build reports that at its line.
export function stageBuildsIn(text: string): string[] | undefined {
  let tree: MdastNode;
  try {
    tree = mdxToMdast(text, { features: { math: true } });
  } catch {
    return undefined;
  }
  const names = new Set<string>();
  const builds: string[] = [];
  const visit = (node: MdastNode) => {
    if (node.type === "mdxjsEsm") {
      const [, name] =
        new RegExp(String.raw`import\s+(\w+)\s+from\s+["']${stage}["']`).exec(node.value) ?? [];
      if (name !== undefined) names.add(name);
    }
    if (
      (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") &&
      names.has(node.name ?? "")
    ) {
      for (const attribute of node.attributes) {
        if (
          attribute.type === "mdxJsxAttribute" &&
          attribute.name === "build" &&
          typeof attribute.value === "string"
        ) {
          builds.push(attribute.value);
        }
      }
    }
    if ("children" in node) node.children.forEach(visit);
  };
  visit(tree);
  return builds;
}

export function unmatchedBuild(name: string, builds: string[]): string | undefined {
  const stages = builds.filter((build) => `${build}.build.ts` === name).length;
  if (stages === 1) return undefined;
  return stages === 0
    ? `\`${name}\` is a custom build that no Stage in the entry names`
    : `\`${name}\` is the build of ${String(stages)} Stages; give each Stage its own build`;
}

export async function buildImportFailures(root: string, artifact: Artifact): Promise<Failure[]> {
  const builds = artifact.besideEntry.filter((name) => buildFile.test(name));
  const failures = await Promise.all(
    builds.map(async (name) => {
      const file = `artifacts/${artifact.slug}/${name}`;
      const text = await readFile(join(root, file), "utf8");
      return importsIn(text).flatMap(({ specifier, offset }) =>
        specifier === stageBuild
          ? []
          : [
              {
                file,
                ...positionAt(text, offset),
                ruleId: "build-import",
                message: `\`${specifier}\` isn't \`${stageBuild}\`, the only module a build may import`,
                skillSection: "Custom builds" as const,
              },
            ],
      );
    }),
  );
  return failures.flat();
}

function importsIn(text: string): { specifier: string; offset: number }[] {
  const source = typescript.createSourceFile(
    "build.ts",
    text,
    typescript.ScriptTarget.Latest,
    true,
  );
  const found: { specifier: string; offset: number }[] = [];
  const visit = (node: typescript.Node) => {
    const specifier =
      typescript.isImportDeclaration(node) || typescript.isExportDeclaration(node)
        ? node.moduleSpecifier
        : typescript.isCallExpression(node) &&
            node.expression.kind === typescript.SyntaxKind.ImportKeyword
          ? node.arguments[0]
          : typescript.isImportEqualsDeclaration(node) &&
              typescript.isExternalModuleReference(node.moduleReference)
            ? node.moduleReference.expression
            : undefined;
    if (specifier !== undefined) {
      found.push({
        specifier: typescript.isStringLiteralLike(specifier)
          ? specifier.text
          : specifier.getText(source),
        offset: specifier.getStart(source),
      });
    }
    typescript.forEachChild(node, visit);
  };
  visit(source);
  return found;
}
