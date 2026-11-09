import { join } from "node:path";
import typescript from "typescript";
import type { NamedValue, Takes } from "@artifactory/design-system/step-applier";
import type { Failure } from "../../src/check-failure.ts";

interface StagedBuild {
  file: string;
  takes: Takes;
}

const givers: Record<Takes["shape"], string> = {
  option: "options",
  groups: "groups",
  fields: "fields",
};

const kindTypes: Record<
  NamedValue["kind"],
  { name: string; flags: typescript.TypeFlags; only: string; gives: string }
> = {
  number: {
    name: "number",
    flags: typescript.TypeFlags.Number,
    only: "numbers",
    gives: "a number",
  },
  text: { name: "string", flags: typescript.TypeFlags.String, only: "text", gives: "text" },
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
  return stages.flatMap(({ file, takes }): Failure[] => {
    const source = program.getSourceFile(join(root, file));
    const build = source?.statements.find(typescript.isExportAssignment)?.expression;
    if (source === undefined || build === undefined) return [];
    const input = inputOf(checker, build);
    if (input === undefined) return [];
    const fits =
      takes.shape === "option"
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
      takes.shape === "option"
        ? undefined
        : `{ ${takes.values.map(({ name, kind }) => `${name}: ${kindTypes[kind].name}`).join("; ")} }`;
    const fix = tracesAMachine(checker, build)
      ? traceFix(checker, input, takes)
      : expected === undefined
        ? "write `defineBuild` without a type"
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
        message: `\`steps\` takes \`${typeTaken}\`, but the Stage's ${givers[takes.shape]} give it ${
          expected === undefined ? "text" : `\`${expected}\``
        }: ${fix}`,
        skillSection: "Custom builds",
      },
    ];
  });
}

// A machine trace takes its input type from its `reads`, which is what to fix, and from the kind
// of value the machine reads, which no `reads` can change.
function tracesAMachine(checker: typescript.TypeChecker, build: typescript.Expression): boolean {
  if (!typescript.isCallExpression(build)) return false;
  const callee = checker.getSymbolAtLocation(build.expression);
  if (callee === undefined) return false;
  const declared =
    (callee.flags & typescript.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(callee) : callee;
  return declared.name === "trace";
}

function traceFix(checker: typescript.TypeChecker, input: typescript.Type, takes: Takes): string {
  if (takes.shape === "option") {
    return "a machine reads values by name, which one group's option doesn't have: give the Stage `input` or a list of choice groups";
  }
  const read = checker.getPropertiesOfType(input);
  const sameNames =
    read.length === takes.values.length &&
    read.every((property) => takes.values.some(({ name }) => name === property.name));
  const readKind = Object.values(kindTypes).find(
    ({ flags }) => read[0] !== undefined && checker.getTypeOfSymbol(read[0]).flags === flags,
  );
  const otherKind = takes.values.find(({ kind }) => kindTypes[kind] !== readKind);
  if (!sameNames || readKind === undefined || otherKind === undefined) {
    return `name exactly the Stage's ${givers[takes.shape]} in \`reads\``;
  }
  return `the machine reads only ${readKind.only}, and \`${otherKind.name}\` gives it ${kindTypes[otherKind.kind].gives}`;
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
        value !== undefined &&
        checker.getTypeOfSymbol(property).flags === kindTypes[value.kind].flags
      );
    })
  );
}
