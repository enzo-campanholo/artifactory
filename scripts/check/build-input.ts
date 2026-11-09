import { join } from "node:path";
import typescript from "typescript";
import type { Control, NamedValue, Takes } from "@artifactory/design-system/step-applier";
import type { Failure } from "../../src/check-failure.ts";

interface StagedBuild {
  file: string;
  control: Control;
  takes: Takes;
}

const givers: Record<Control, string> = { choose: "options", input: "fields" };

const kindFlags: Record<NamedValue["kind"], typescript.TypeFlags> = {
  number: typescript.TypeFlags.Number,
};

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
  return stages.flatMap(({ file, control, takes }): Failure[] => {
    const source = program.getSourceFile(join(root, file));
    const build = source?.statements.find(typescript.isExportAssignment)?.expression;
    if (source === undefined || build === undefined) return [];
    const input = inputOf(checker, build);
    if (input === undefined) return [];
    const fits =
      takes.shape === "text"
        ? (input.flags & typescript.TypeFlags.String) !== 0
        : takesValuesNamed(checker, input, takes.values);
    if (fits) return [];
    const typeTaken = checker
      .typeToString(
        input,
        undefined,
        typescript.TypeFormatFlags.NoTruncation | typescript.TypeFormatFlags.InTypeAlias,
      )
      .replaceAll("; }", " }");
    const expected =
      takes.shape === "text"
        ? undefined
        : `{ ${takes.values.map(({ name, kind }) => `${name}: ${kind}`).join("; ")} }`;
    const fix =
      expected === undefined
        ? "write `defineBuild` without a type"
        : tracesAMachine(checker, build)
          ? "name exactly the Stage's fields in `reads`"
          : `write \`defineBuild<${expected}>\``;
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
        message: `\`steps\` takes \`${typeTaken}\`, but the Stage's ${givers[control]} give it ${
          expected === undefined ? "text" : `\`${expected}\``
        }: ${fix}`,
        skillSection: "Custom builds",
      },
    ];
  });
}

// A machine trace takes its input type from its `reads`, which is what to fix.
function tracesAMachine(checker: typescript.TypeChecker, build: typescript.Expression): boolean {
  if (!typescript.isCallExpression(build)) return false;
  const callee = checker.getSymbolAtLocation(build.expression);
  if (callee === undefined) return false;
  const declared =
    (callee.flags & typescript.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(callee) : callee;
  return declared.name === "trace";
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

function takesValuesNamed(
  checker: typescript.TypeChecker,
  input: typescript.Type,
  values: NamedValue[],
): boolean {
  if (input.isUnion() || checker.getIndexInfosOfType(input).length > 0) return false;
  const properties = checker.getPropertiesOfType(input);
  return (
    properties.length === values.length &&
    properties.every((property) => {
      const value = values.find(({ name }) => name === property.name);
      // An optional value's type is `number | undefined`, so this refuses it too.
      return (
        value !== undefined && checker.getTypeOfSymbol(property).flags === kindFlags[value.kind]
      );
    })
  );
}
