import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";
import { accessCerts, createAccessKeys } from "./scripts/access-keys.ts";
import { seamFolders } from "./scripts/check/seams.ts";

const workerSeam = "tests/worker";
const accessTeamDomain = "https://artifactory-test.cloudflareaccess.com";

export default defineConfig({
  test: {
    passWithNoTests: true,
    // Each test file runs whole `pnpm check` fixtures; one at a time keeps the gate within 7 GB.
    maxWorkers: 1,
    projects: [
      {
        test: {
          name: "node",
          include: seamFolders
            .filter((folder) => folder !== workerSeam)
            .map((folder) => `${folder}/**/*.test.ts`),
        },
      },
      {
        resolve: {
          alias: {
            "build-id": `${import.meta.dirname}/${workerSeam}/build-id.json`,
            "question-manifest": `${import.meta.dirname}/${workerSeam}/question-manifest.json`,
          },
        },
        plugins: [
          cloudflareTest(async () => {
            const accessKeys = await createAccessKeys("test-key");
            const unpublishedKeys = await createAccessKeys("test-key");
            return {
              wrangler: { configPath: "./wrangler.jsonc" },
              miniflare: {
                bindings: {
                  ACCESS_TEAM_DOMAIN: accessTeamDomain,
                  ACCESS_AUD: "artifactory-test-audience",
                  TEST_ACCESS_KEYS: JSON.stringify(accessKeys),
                  TEST_UNPUBLISHED_ACCESS_KEYS: JSON.stringify(unpublishedKeys),
                  TEST_MIGRATIONS: await readD1Migrations("migrations"),
                },
                outboundService: (request: Request) =>
                  request.url === `${accessTeamDomain}/cdn-cgi/access/certs`
                    ? Response.json(accessCerts(accessKeys))
                    : new Response(null, { status: 404 }),
              },
            };
          }),
        ],
        test: {
          name: "worker",
          include: [`${workerSeam}/**/*.test.ts`],
        },
      },
    ],
  },
});
