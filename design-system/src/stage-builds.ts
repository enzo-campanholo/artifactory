import { glob } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";

const buildFiles = ["artifacts/*/*.build.ts", "design-system/catalog/*.build.ts"];

// Astro renders the pages after the client build, in the same process, so the chunk each build
// became is handed to the Stage that renders it through a global the client build fills.
const bundled = Symbol.for("artifactory.stage-builds");
const shared = globalThis as typeof globalThis & { [bundled]?: Map<string, string> };

// Each custom build is a chunk of its own, so a Stage's page names only its own build.
export function stageBuilds(): AstroIntegration {
  return {
    name: "stage-builds",
    hooks: {
      "astro:config:setup": ({ config, command, updateConfig }) => {
        if (command !== "build") return;
        const root = fileURLToPath(config.root);
        const chunks = new Map<string, string>();
        updateConfig({
          vite: {
            plugins: [
              {
                name: "stage-builds",
                apply: "build",
                applyToEnvironment: (environment) => environment.name === "client",
                async buildStart() {
                  for await (const file of glob(buildFiles, { cwd: root })) {
                    chunks.set(
                      `/${file}`,
                      this.emitFile({
                        type: "chunk",
                        id: join(root, file),
                        preserveSignature: "strict",
                      }),
                    );
                  }
                },
                generateBundle() {
                  shared[bundled] = new Map(
                    [...chunks].map(([source, chunk]) => [source, `/${this.getFileName(chunk)}`]),
                  );
                },
              },
            ],
          },
        });
      },
    },
  };
}

// `astro dev` serves the build from its source. `import.meta.env.DEV` can't tell, since a build
// run with `NODE_ENV=test`, as the check's tests run it, is also DEV.
export function buildModule(buildFile: string): string {
  const modules = shared[bundled];
  if (modules === undefined) return buildFile;
  const module = modules.get(buildFile);
  if (module === undefined) throw new Error(`\`${buildFile}\` isn't in the client bundle`);
  return module;
}
