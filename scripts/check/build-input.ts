import { join } from "node:path";
import typescript from "typescript";
import type { Failure } from "../../src/check-failure.ts";

interface StagedBuild {
  file: string;
  // The fields' names with `input`; nothing with `choose`.
  fields: string[] | undefined;
}

// A build's input type comes from its own file and a Stage's fields from the entry, so neither
// TypeScript program sees both: this compares what `steps` takes with what the Stage gives it.
export function buildInputFailures(root: string, stages: StagedBuild[]): Failure[] {
  if (stages.length === 0) return [];
  const config = typescript.getParsedCommandLineOfConfigFile(
    join(root, "tsconfig.builds.json"),
    {},
    { ...typescript.sys, onUnRecoverableConfigFileDiagnostic: () => undefined },
  );
  const program = typescript.createProgram(
    stages.map(({ file }) => join(root, file)),
    config?.options ?? {},
  );
  const checker = program.getTypeChecker();
  return stages.flatMap(({ file, fields }): Failure[] => {
    const source = program.getSourceFile(join(root, file));
    const build = source?.statements.find(typescript.isExportAssignment)?.expression;
    if (source === undefined || build === undefined) return [];
    const input = inputOf(checker, build);
    if (input === undefined) return [];
    const expected =
      fields === undefined
        ? undefined
        : `{ ${fields.map((name) => `${name}: number`).join("; ")} }`;
    const fits =
      fields === undefined
        ? (input.flags & typescript.TypeFlags.String) !== 0
        : takesNumbersNamed(checker, input, fields);
    if (fits) return [];
    const takes = checker
      .typeToString(
        input,
        undefined,
        typescript.TypeFormatFlags.NoTruncation | typescript.TypeFormatFlags.InTypeAlias,
      )
      .replaceAll("; }", " }");
    const at = typescript.isCallExpression(build)
      ? (build.typeArguments?.[0] ?? build.expression)
      : build;
    const { line, character } = source.getLineAndCharacterOfPosition(at.getStart(source));
    return [
      {
        file,
        line: line + 1,
        column: character + 1,
        ruleId: "build-input",
        message:
          expected === undefined
            ? `\`steps\` takes \`${takes}\`, but the Stage's options give it text: write \`defineBuild\` without a type`
            : `\`steps\` takes \`${takes}\`, but the Stage's fields give it \`${expected}\`: write \`defineBuild<${expected}>\``,
        skillSection: "Custom builds",
      },
    ];
  });
}

function inputOf(
  checker: typescript.TypeChecker,
  build: typescript.Expression,
): typescript.Type | undefined {
  const steps = checker.getPropertyOfType(checker.getTypeAtLocation(build), "steps");
  if (steps === undefined) return undefined;
  const [signature] = checker.getTypeOfSymbolAtLocation(steps, build).getCallSignatures();
  const [parameter] = signature?.getParameters() ?? [];
  return parameter === undefined ? undefined : checker.getTypeOfSymbolAtLocation(parameter, build);
}

function takesNumbersNamed(
  checker: typescript.TypeChecker,
  input: typescript.Type,
  fields: string[],
): boolean {
  if (input.isUnion() || checker.getIndexInfosOfType(input).length > 0) return false;
  const properties = checker.getPropertiesOfType(input);
  return (
    properties.length === fields.length &&
    properties.every(
      (property) =>
        fields.includes(property.name) &&
        // An optional field's type is `number | undefined`, so this refuses it too.
        checker.getTypeOfSymbol(property).flags === typescript.TypeFlags.Number,
    )
  );
}
