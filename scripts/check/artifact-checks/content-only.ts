import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  mdxToMdast,
  type MdastNode,
  type MdxJsxFlowElement,
  type MdxJsxTextElement,
} from "satteri";
import typescript from "typescript";
import type { Artifact, Entry } from "../../../src/artifacts.ts";
import { positionAt, type Failure } from "../../../src/check-failure.ts";
import { designSystemPackage } from "../../component-reference.ts";
import { buildFile, stageBuildsIn, unmatchedBuild } from "./custom-builds.ts";

const contentFile = /\.(?:d2|svg|png|jpe?g|webp|gif|avif)$/i;
const diagramOrFigureImport = /^\.\/[^/]+\.(?:d2(?:\?steps)?|svg\?raw)$/;
const svgWithoutRaw = /^\.\/[^/]+\.svg$/;

export function fileFailures(artifacts: Artifact[], looseFiles: string[]): Failure[] {
  const failure = (file: string, message: string): Failure => ({
    file,
    line: 1,
    column: 1,
    ruleId: "artifact-file",
    message,
    skillSection: "Artifact files",
  });
  return [
    ...looseFiles.map((name) =>
      failure(`artifacts/${name}`, `\`${name}\` isn't an artifact folder`),
    ),
    ...artifacts.flatMap(({ slug, entry, besideEntry }) => {
      const builds = stageBuildsIn(entry?.source.text ?? "");
      return besideEntry.flatMap((name) => {
        const problem = buildFile.test(name)
          ? builds && unmatchedBuild(name, builds)
          : name.endsWith("/") || !contentFile.test(name)
            ? `\`${name}\` isn't a diagram, figure, image or custom build`
            : undefined;
        return problem === undefined
          ? []
          : [failure(`artifacts/${slug}/${name.replace(/\/$/, "")}`, problem)];
      });
    }),
  ];
}

interface Problem {
  offset: number;
  ruleId: "import" | "content-only";
  message: string;
}

export function mdxFailures({ file, source: { text } }: Entry, components: string[]): Failure[] {
  let tree: MdastNode;
  try {
    // The build's processor parses math too, so braces inside `$…$` aren't expressions.
    tree = mdxToMdast(text, { features: { math: true } });
  } catch {
    // The build reports MDX that doesn't parse, at the error's position.
    return [];
  }
  return problemsIn(tree, text, components).map(({ offset, ruleId, message }) => ({
    file,
    ...positionAt(text, offset),
    ruleId,
    message,
    skillSection: "Content only",
  }));
}

function problemsIn(node: MdastNode, source: string, components: string[]): Problem[] {
  const offset = node.position?.start.offset ?? 0;
  switch (node.type) {
    case "mdxjsEsm":
      return esmProblems(node.value, offset, components);
    case "mdxFlowExpression":
    case "mdxTextExpression":
      return isOnlyComments(node.value)
        ? []
        : [contentOnlyProblem(offset, `${excerpt(`{${node.value}}`)} is JavaScript, not content`)];
    case "mdxJsxFlowElement":
    case "mdxJsxTextElement":
      if (node.name === "style" || node.name === "script") {
        return [contentOnlyProblem(offset, `\`<${node.name}>\` elements aren't content`)];
      }
      return [
        ...attributeProblems(node, source, offset),
        ...node.children.flatMap((child) => problemsIn(child, source, components)),
      ];
  }
  return "children" in node
    ? node.children.flatMap((child) => problemsIn(child, source, components))
    : [];
}

function contentOnlyProblem(offset: number, message: string): Problem {
  return { offset, ruleId: "content-only", message };
}

function excerpt(code: string): string {
  const oneLine = code.replace(/\s+/g, " ").trim();
  return `\`${oneLine.length > 40 ? `${oneLine.slice(0, 39)}…` : oneLine}\``;
}

function parse(code: string): typescript.SourceFile {
  return typescript.createSourceFile("mdx.ts", code, typescript.ScriptTarget.Latest, true);
}

function esmProblems(code: string, start: number, components: string[]): Problem[] {
  const file = parse(code);
  return file.statements.flatMap((statement) => {
    if (!typescript.isImportDeclaration(statement)) {
      return [
        contentOnlyProblem(
          start + statement.getStart(file),
          `${excerpt(statement.getText(file))} is JavaScript, not an import`,
        ),
      ];
    }
    const specifier = statement.moduleSpecifier;
    const problem = typescript.isStringLiteral(specifier)
      ? importProblem(specifier.text, components)
      : undefined;
    return problem === undefined
      ? []
      : [{ offset: start + specifier.getStart(file), ruleId: "import", message: problem }];
  });
}

function importProblem(specifier: string, components: string[]): string | undefined {
  if (components.includes(specifier) || diagramOrFigureImport.test(specifier)) return undefined;
  if (specifier.startsWith(designSystemPackage)) {
    return `\`${specifier}\` isn't a component an artifact can import`;
  }
  if (svgWithoutRaw.test(specifier)) return `\`${specifier}\` is imported without \`?raw\``;
  return `\`${specifier}\` isn't a design system component or a diagram or figure beside the entry`;
}

function isOnlyComments(code: string): boolean {
  return parse(code).statements.length === 0;
}

function attributeProblems(
  element: MdxJsxFlowElement | MdxJsxTextElement,
  source: string,
  start: number,
): Problem[] {
  let cursor = start + 1 + (element.name?.length ?? 0);
  return element.attributes.flatMap((attribute): Problem[] => {
    if (attribute.type === "mdxJsxExpressionAttribute") {
      const offset = source.indexOf("{", cursor);
      cursor = offset + 1 + attribute.value.length;
      return [
        contentOnlyProblem(offset, `${excerpt(`{${attribute.value}}`)} is JavaScript, not content`),
      ];
    }
    const { name, value } = attribute;
    const offset = offsetOfName(source, name, cursor);
    const valueText = typeof value === "string" ? value : (value?.value ?? "");
    const valueOffset = source.indexOf(valueText, offset + name.length);
    cursor = valueOffset === -1 ? offset + name.length : valueOffset + valueText.length;
    if (name === "style" || /^on[a-z]/i.test(name)) {
      return [contentOnlyProblem(offset, `\`${name}\` attributes aren't content`)];
    }
    if (typeof value === "object" && value !== null && !isData(value.value)) {
      return [
        contentOnlyProblem(
          offset,
          `the \`${name}\` value ${excerpt(`{${value.value}}`)} is JavaScript, not data`,
        ),
      ];
    }
    return [];
  });
}

function offsetOfName(source: string, name: string, from: number): number {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const pattern = new RegExp(String.raw`(?<=\s)${escaped}(?![\w:-])`, "g");
  pattern.lastIndex = from;
  return pattern.exec(source)?.index ?? from;
}

function isData(code: string): boolean {
  const [statement, ...rest] = parse(`(${code}\n)`).statements;
  return (
    statement !== undefined &&
    rest.length === 0 &&
    typescript.isExpressionStatement(statement) &&
    isDataExpression(statement.expression)
  );
}

// Data is what a prop needs: literals, imported names, and lists and objects of them.
function isDataExpression(node: typescript.Node): boolean {
  if (typescript.isParenthesizedExpression(node)) return isDataExpression(node.expression);
  if (typescript.isArrayLiteralExpression(node)) return node.elements.every(isDataExpression);
  if (typescript.isObjectLiteralExpression(node)) {
    return node.properties.every(
      (property) =>
        typescript.isShorthandPropertyAssignment(property) ||
        (typescript.isPropertyAssignment(property) &&
          !typescript.isComputedPropertyName(property.name) &&
          isDataExpression(property.initializer)),
    );
  }
  if (typescript.isPrefixUnaryExpression(node)) {
    return (
      node.operator === typescript.SyntaxKind.MinusToken &&
      typescript.isNumericLiteral(node.operand)
    );
  }
  return (
    typescript.isStringLiteral(node) ||
    typescript.isNoSubstitutionTemplateLiteral(node) ||
    typescript.isNumericLiteral(node) ||
    typescript.isIdentifier(node) ||
    node.kind === typescript.SyntaxKind.TrueKeyword ||
    node.kind === typescript.SyntaxKind.FalseKeyword ||
    node.kind === typescript.SyntaxKind.NullKeyword
  );
}

// A figure's SVG is inlined into the page, where its scripts would run and its styles would apply
// to the whole page. Its links would take focus inside a drawing that screen readers skip.
const codeInSvg = /<(script|style|a)\b|\s(on[a-z]+)\s*=/gi;

export async function svgFailures(root: string, artifact: Artifact): Promise<Failure[]> {
  const figures = artifact.besideEntry.filter((name) => /\.svg$/i.test(name));
  const failures = await Promise.all(
    figures.map(async (name) => {
      const file = `artifacts/${artifact.slug}/${name}`;
      const svg = await readFile(join(root, file), "utf8");
      return [...svg.matchAll(codeInSvg)].map((match) => {
        const [, element = "", attribute] = match;
        return {
          file,
          ...positionAt(svg, match.index + (attribute === undefined ? 0 : 1)),
          ruleId: "content-only",
          message:
            attribute === undefined
              ? `\`<${element.toLowerCase()}>\` elements aren't content`
              : `\`${attribute}\` attributes aren't content`,
          skillSection: "Content only" as const,
        };
      });
    }),
  );
  return failures.flat();
}
