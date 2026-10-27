import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createFixtureRepo, succeeds, type CommandRun, type FixtureRepo } from "./fixture-repo.ts";
import {
  accessLogin,
  startSiteStandIn,
  type SiteAnswer,
  type SiteStandIn,
} from "./site-stand-in.ts";

function artifact(...fields: string[]): string {
  return [
    "---",
    "title: Um artefato",
    "subject: Cálculo",
    "lang: pt-BR",
    "published: 2026-10-15",
    ...fields,
    "---",
    "",
    "Texto.",
    "",
  ].join("\n");
}

const publicLimites = artifact("id: l1m1t3s1", "public: true", "formerSlugs: [limite]");

const artifacts = {
  "artifacts/cadeia/index.mdx": artifact("id: c4d31441", "draft: true"),
  "artifacts/derivadas/index.mdx": artifact("id: d3r1v4d4"),
  "artifacts/limites/index.mdx": publicLimites,
};

const limitesPage = [
  "<!doctype html>",
  '<html lang="pt-BR"><head>',
  '<link rel="stylesheet" href="/_astro/limites.Ab12.css">',
  '<script type="module" src="/_astro/page.Cd34.js"></script>',
  "</head><body></body></html>",
].join("");

const open = (answer: Omit<SiteAnswer, "noindex">): SiteAnswer => ({ ...answer, noindex: true });

// What a deploy that opened exactly the public paths answers, past what Access sends.
function deployedSite(): Record<string, SiteAnswer> {
  return {
    "/limites/": open({ status: 200, body: limitesPage }),
    "/limites": open({ status: 307, location: "/limites/" }),
    "/limite": open({ status: 301, location: "/limites/" }),
    "/limite/": open({ status: 301, location: "https://estudos.example.org/limites/" }),
    "/favicon.svg": open({ status: 200 }),
    "/_astro/limites.Ab12.css": open({ status: 200 }),
    "/_astro/page.Cd34.js": open({ status: 200 }),
    "/api/library": { status: 401 },
  };
}

const passingLines = [
  "Probing https://estudos.example.org from outside, with no cookies and following no redirects.",
  "ok  /limites/: expected 200 with noindex, got 200 with noindex",
  "ok  /limites: expected 307 to /limites/ with noindex, got 307 to /limites/ with noindex",
  "ok  /limite: expected 301 to /limites/ with noindex, got 301 to /limites/ with noindex",
  "ok  /limite/: expected 301 to /limites/ with noindex, got 301 to /limites/ with noindex",
  "ok  /favicon.svg: expected 200 with noindex, got 200 with noindex",
  "ok  /_astro/limites.Ab12.css: expected 200 with noindex, got 200 with noindex",
  "ok  /_astro/page.Cd34.js: expected 200 with noindex, got 200 with noindex",
  "ok  /: expected 302 to the Access login or 401, got 302 to the Access login",
  "ok  /drafts/: expected 302 to the Access login or 401, got 302 to the Access login",
  "ok  /api/library: expected 302 to the Access login or 401, got 401",
  "ok  /catalog/: expected 302 to the Access login or 401, got 302 to the Access login",
  "ok  /derivadas/: expected 302 to the Access login or 401, got 302 to the Access login",
];

describe("pnpm probe against the deployed site", () => {
  let repo: FixtureRepo;
  let site: SiteStandIn;

  beforeAll(async () => {
    site = await startSiteStandIn();
    repo = await createFixtureRepo(artifacts);
  }, 60_000);

  afterAll(async () => {
    await site.close();
    await repo.remove();
  });

  beforeEach(() => {
    site.answers = deployedSite();
    site.requests = [];
  });

  function probe(
    env = ["ARTIFACTORY_DOMAIN=estudos.example.org"],
    unset: string[] = [],
  ): Promise<CommandRun> {
    return repo.run("env", [
      ...unset.flatMap((name) => ["-u", name]),
      `ARTIFACTORY_PROBE_ORIGIN=${site.url}`,
      "ARTIFACTORY_PROBE_RETRY_MS=0",
      ...env,
      "pnpm",
      "probe",
    ]);
  }

  it("passes when exactly the public artifacts' paths are open, printing what each path was expected to answer and answered", async () => {
    const run = await probe();

    expect(run.exitCode).toBe(0);
    expect(run.stdout).toBe([...passingLines, "All 12 paths answered as expected.", ""].join("\n"));
  });

  function outcome(run: CommandRun) {
    return {
      exitCode: run.exitCode,
      off: run.stdout.split("\n").filter((line) => line.startsWith("OFF ")),
      verdict: run.output.split("\n").find((line) => line.startsWith("pnpm probe: ")),
    };
  }

  function oneOff(line: string) {
    return {
      exitCode: 1,
      off: [line],
      verdict: "pnpm probe: 1 of 12 paths didn't answer as expected",
    };
  }

  it("fails a former slug that redirects anywhere but its artifact's page", async () => {
    site.answers["/limite"] = open({ status: 301, location: "https://outro.example.org/limites/" });

    expect(outcome(await probe())).toEqual(
      oneOff(
        "OFF /limite: expected 301 to /limites/ with noindex, got 301 to https://outro.example.org/limites/ with noindex",
      ),
    );
  });

  it("fails a slug without its slash that isn't the trailing-slash redirect to its page", async () => {
    site.answers["/limites"] = open({ status: 301, location: "/limites/" });

    expect(outcome(await probe())).toEqual(
      oneOff(
        "OFF /limites: expected 307 to /limites/ with noindex, got 301 to /limites/ with noindex",
      ),
    );
  });

  it("fails an open path that redirects to the Access login", async () => {
    site.answers["/limite/"] = accessLogin("/limite/");

    expect(outcome(await probe())).toEqual(
      oneOff("OFF /limite/: expected 301 to /limites/ with noindex, got 302 to the Access login"),
    );
  });

  it("fails an /_astro/ file the first public page links that stays behind the sign-in", async () => {
    site.answers["/_astro/page.Cd34.js"] = accessLogin("/_astro/page.Cd34.js");

    expect(outcome(await probe())).toEqual(
      oneOff("OFF /_astro/page.Cd34.js: expected 200 with noindex, got 302 to the Access login"),
    );
  });

  it("fails an open path the assets layer answers without noindex", async () => {
    site.answers["/limites/"] = { status: 200, body: limitesPage };

    expect(outcome(await probe())).toEqual(
      oneOff("OFF /limites/: expected 200 with noindex, got 200 without noindex"),
    );
  });

  it("fails a private artifact anyone can open", async () => {
    site.answers["/derivadas/"] = open({ status: 200 });

    expect(outcome(await probe())).toEqual(
      oneOff("OFF /derivadas/: expected 302 to the Access login or 401, got 200 with noindex"),
    );
  });

  it("fails the Library anyone can open", async () => {
    site.answers["/"] = open({ status: 200 });

    expect(outcome(await probe())).toEqual(
      oneOff("OFF /: expected 302 to the Access login or 401, got 200 with noindex"),
    );
  });

  it("with nothing public, expects the favicon closed with everything else", async () => {
    await writeFile(
      join(repo.root, "artifacts/limites/index.mdx"),
      artifact("id: l1m1t3s1", "formerSlugs: [limite]"),
    );
    try {
      const withFaviconOpen = await probe();
      site.answers = {};
      const allClosed = await probe();

      expect(withFaviconOpen.exitCode).toBe(1);
      expect(withFaviconOpen.stdout).toContain(
        "OFF /favicon.svg: expected 302 to the Access login or 401, got 200 with noindex",
      );
      expect(allClosed.exitCode).toBe(0);
      expect(allClosed.stdout).toBe(
        [
          "Probing https://estudos.example.org from outside, with no cookies and following no redirects.",
          "ok  /favicon.svg: expected 302 to the Access login or 401, got 302 to the Access login",
          "ok  /: expected 302 to the Access login or 401, got 302 to the Access login",
          "ok  /drafts/: expected 302 to the Access login or 401, got 302 to the Access login",
          "ok  /api/library: expected 302 to the Access login or 401, got 302 to the Access login",
          "ok  /catalog/: expected 302 to the Access login or 401, got 302 to the Access login",
          "ok  /derivadas/: expected 302 to the Access login or 401, got 302 to the Access login",
          "All 6 paths answered as expected.",
          "",
        ].join("\n"),
      );
    } finally {
      await writeFile(join(repo.root, "artifacts/limites/index.mdx"), publicLimites);
    }
  });

  it("retries a path that's off until it opens within the retry budget", async () => {
    site.answers["/limites/"] = [
      accessLogin("/limites/"),
      open({ status: 200, body: limitesPage }),
    ];

    const run = await probe([
      "ARTIFACTORY_DOMAIN=estudos.example.org",
      "ARTIFACTORY_PROBE_RETRY_MS=2000",
    ]);

    expect(run.exitCode).toBe(0);
    expect(run.stdout).toBe(
      [
        passingLines[0],
        "Retrying what's off for up to 2 seconds, while Access and the deploy propagate.",
        ...passingLines.slice(1),
        "All 12 paths answered as expected.",
        "",
      ].join("\n"),
    );
    expect(site.requests.filter((path) => path === "/limites/")).toHaveLength(2);
  });

  it("fails a path still off once the retry budget runs out, having asked it again", async () => {
    site.answers["/limite"] = accessLogin("/limite");

    const run = await probe([
      "ARTIFACTORY_DOMAIN=estudos.example.org",
      "ARTIFACTORY_PROBE_RETRY_MS=1000",
    ]);

    expect(outcome(run)).toEqual(
      oneOff("OFF /limite: expected 301 to /limites/ with noindex, got 302 to the Access login"),
    );
    expect(site.requests.filter((path) => path === "/limite").length).toBeGreaterThan(1);
  });

  it("takes the custom domain from wrangler.jsonc once CI has filled it in, over ARTIFACTORY_DOMAIN", async () => {
    await succeeds(
      repo.run("env", [
        "ARTIFACTORY_DOMAIN=estudos.example.org",
        "D1_DATABASE_ID=11111111-1111-1111-1111-111111111111",
        "ACCESS_TEAM_DOMAIN=https://estudos.cloudflareaccess.com",
        "ACCESS_AUD=protected-app-aud",
        "node",
        "scripts/deploy-config.ts",
      ]),
    );
    try {
      const run = await probe(["ARTIFACTORY_DOMAIN=outro.example.org"]);

      expect(run.exitCode).toBe(0);
      expect(run.stdout.split("\n")[0]).toBe(passingLines[0]);
    } finally {
      await succeeds(repo.run("git", ["checkout", "--", "wrangler.jsonc"]));
    }
  });

  it("refuses to probe without a custom domain in wrangler.jsonc or ARTIFACTORY_DOMAIN, naming both", async () => {
    const unnamed = await probe([], ["ARTIFACTORY_DOMAIN"]);
    const notAHostname = await probe(["ARTIFACTORY_DOMAIN=https://estudos.example.org"]);

    expect(unnamed.exitCode).toBe(1);
    expect(unnamed.output).toContain(
      "pnpm probe: wrangler.jsonc names no custom domain (wrangler.jsonc still has its placeholders: run scripts/deploy-config.ts first), and ARTIFACTORY_DOMAIN isn't set. Name it in either, for example: ARTIFACTORY_DOMAIN=$(gh variable get ARTIFACTORY_DOMAIN) pnpm probe",
    );
    expect(notAHostname.exitCode).toBe(1);
    expect(notAHostname.output).toContain(
      'pnpm probe: ARTIFACTORY_DOMAIN must be a hostname such as artifactory.example.com, not "https://estudos.example.org"',
    );
    expect(site.requests).toEqual([]);
  });
});
