import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  standInAccountId,
  standInToken,
  startAccessApiStandIn,
  type AccessApiStandIn,
  type AccessApp,
} from "./access-api-stand-in.ts";
import { createFixtureRepo, succeeds, type CommandRun, type FixtureRepo } from "./fixture-repo.ts";

const domain = "estudos.example.org";
const protectedAud = "protected-app-aud";

const protectedApp: AccessApp = {
  id: "protected-app-id",
  aud: protectedAud,
  name: "artifactory",
  type: "self_hosted",
  domain,
  path_cookie_attribute: false,
  destinations: [{ type: "public", uri: domain }],
  policies: [{ id: "owner-only", precedence: 1 }],
};

const limitesOpen = ["/_astro/*", "/favicon.svg", "/limite", "/limite/", "/limites", "/limites/"];

describe("pnpm public-access against Cloudflare's Access API", () => {
  let repo: FixtureRepo;
  let api: AccessApiStandIn;

  beforeAll(async () => {
    api = await startAccessApiStandIn();
    repo = await createFixtureRepo({});
    await succeeds(
      repo.run("env", [
        `ARTIFACTORY_DOMAIN=${domain}`,
        "D1_DATABASE_ID=11111111-1111-1111-1111-111111111111",
        "ACCESS_TEAM_DOMAIN=https://estudos.cloudflareaccess.com",
        `ACCESS_AUD=${protectedAud}`,
        "node",
        "scripts/deploy-config.ts",
      ]),
    );
  }, 60_000);

  afterAll(async () => {
    await api.close();
    await repo.remove();
  });

  beforeEach(() => {
    api.account.apps = [structuredClone(protectedApp)];
    api.account.policies = [{ id: "owner-only", name: "Owner", decision: "allow", include: [] }];
  });

  async function publicAccess(mode: string, manifest: string[]): Promise<CommandRun> {
    await mkdir(join(repo.root, "dist-worker"), { recursive: true });
    await writeFile(join(repo.root, "dist-worker/public-paths.json"), JSON.stringify(manifest));
    return repo.run("env", [
      `CLOUDFLARE_API_BASE_URL=${api.url}`,
      `CLOUDFLARE_ACCOUNT_ID=${standInAccountId}`,
      `CLOUDFLARE_ACCESS_API_TOKEN=${standInToken}`,
      "pnpm",
      "public-access",
      mode,
    ]);
  }

  function publicApp(): AccessApp | undefined {
    return api.account.apps.find(({ name }) => name === "artifactory public artifacts");
  }

  function bypassPolicies() {
    return api.account.policies.filter(({ decision }) => decision === "bypass");
  }

  it("open creates the public app with one Bypass policy for everyone, opening exactly the manifest", async () => {
    const run = await publicAccess("open", limitesOpen);

    expect(run.exitCode).toBe(0);
    expect(publicApp()?.destinations).toEqual([
      { type: "public", uri: "estudos.example.org/_astro/*" },
      { type: "public", uri: "estudos.example.org/favicon.svg" },
      { type: "public", uri: "estudos.example.org/limite" },
      { type: "public", uri: "estudos.example.org/limite/" },
      { type: "public", uri: "estudos.example.org/limites" },
      { type: "public", uri: "estudos.example.org/limites/" },
    ]);
    expect(bypassPolicies()).toEqual([
      expect.objectContaining({ decision: "bypass", include: [{ everyone: {} }] }),
    ]);
    expect(publicApp()?.policies?.map(({ id }) => id)).toEqual(
      bypassPolicies().map(({ id }) => id),
    );
    expect(run.stdout).toBe(
      [
        "Added estudos.example.org/_astro/*",
        "Added estudos.example.org/favicon.svg",
        "Added estudos.example.org/limite",
        "Added estudos.example.org/limite/",
        "Added estudos.example.org/limites",
        "Added estudos.example.org/limites/",
        "Created the public Access app, opening 6 destinations.",
        "",
      ].join("\n"),
    );
  });

  it("close keeps only what is open now and still public, adding nothing that goes public", async () => {
    await succeeds(publicAccess("open", limitesOpen));

    const run = await publicAccess("close", [
      "/_astro/*",
      "/derivada",
      "/derivada/",
      "/favicon.svg",
      "/limites",
      "/limites/",
    ]);

    expect(run.exitCode).toBe(0);
    expect(publicApp()?.destinations).toEqual([
      { type: "public", uri: "estudos.example.org/_astro/*" },
      { type: "public", uri: "estudos.example.org/favicon.svg" },
      { type: "public", uri: "estudos.example.org/limites" },
      { type: "public", uri: "estudos.example.org/limites/" },
    ]);
    expect(run.stdout).toBe(
      [
        "Removed estudos.example.org/limite",
        "Removed estudos.example.org/limite/",
        "The public Access app opens 4 destinations.",
        "",
      ].join("\n"),
    );
  });

  it("open replaces the whole list, so a rerun repairs destinations edited by hand", async () => {
    await succeeds(publicAccess("open", limitesOpen));
    const app = publicApp();
    if (app === undefined) throw new Error("open created no public app");
    app.destinations = [
      { type: "public", uri: "estudos.example.org/_astro/*" },
      { type: "public", uri: "estudos.example.org/catalog/" },
    ];

    const run = await publicAccess("open", limitesOpen);

    expect(run.exitCode).toBe(0);
    expect(publicApp()?.destinations?.map(({ uri }) => uri)).toEqual([
      "estudos.example.org/_astro/*",
      "estudos.example.org/favicon.svg",
      "estudos.example.org/limite",
      "estudos.example.org/limite/",
      "estudos.example.org/limites",
      "estudos.example.org/limites/",
    ]);
    expect(bypassPolicies()).toHaveLength(1);
    expect(run.stdout).toBe(
      [
        "Removed estudos.example.org/catalog/",
        "Added estudos.example.org/favicon.svg",
        "Added estudos.example.org/limite",
        "Added estudos.example.org/limite/",
        "Added estudos.example.org/limites",
        "Added estudos.example.org/limites/",
        "The public Access app opens 6 destinations.",
        "",
      ].join("\n"),
    );
  });

  it("deletes the public app and its Bypass once nothing is public, leaving the owner's app", async () => {
    await succeeds(publicAccess("open", ["/_astro/*", "/favicon.svg", "/limites", "/limites/"]));

    const run = await publicAccess("close", []);

    expect(run.exitCode).toBe(0);
    expect(api.account.apps).toEqual([protectedApp]);
    expect(bypassPolicies()).toEqual([]);
    expect(run.stdout).toBe(
      [
        "Removed estudos.example.org/_astro/*",
        "Removed estudos.example.org/favicon.svg",
        "Removed estudos.example.org/limites",
        "Removed estudos.example.org/limites/",
        "Deleted the public Access app, since nothing is public.",
        "",
      ].join("\n"),
    );
  });

  it("open with nothing public creates nothing", async () => {
    const run = await publicAccess("open", []);

    expect(run.exitCode).toBe(0);
    expect(api.account.apps).toEqual([protectedApp]);
    expect(bypassPolicies()).toEqual([]);
    expect(run.stdout).toBe("Nothing is public, and there's no public Access app.\n");
  });

  it("close with no public app has nothing to close and opens nothing", async () => {
    const run = await publicAccess("close", limitesOpen);

    expect(run.exitCode).toBe(0);
    expect(api.account.apps).toEqual([protectedApp]);
    expect(bypassPolicies()).toEqual([]);
    expect(run.stdout).toBe("There's no public Access app, so nothing is open to close.\n");
  });

  it("open refuses to open anything when no Access app has the protected app's AUD", async () => {
    api.account.apps = [];

    const run = await publicAccess("open", limitesOpen);

    expect(run.exitCode).toBe(1);
    expect(run.output).toContain(
      "pnpm public-access: no Access app has the AUD wrangler.jsonc's ACCESS_AUD gives, so nothing was opened",
    );
    expect(api.account.apps).toEqual([]);
    expect(bypassPolicies()).toEqual([]);
  });

  it("open refuses to open anything while the protected app's Cookie Path Attribute is on", async () => {
    await succeeds(publicAccess("open", ["/_astro/*", "/favicon.svg", "/limites", "/limites/"]));
    const owners = api.account.apps.find(({ aud }) => aud === protectedAud);
    if (owners === undefined) throw new Error("the protected app is gone");
    owners.path_cookie_attribute = true;

    const run = await publicAccess("open", limitesOpen);

    expect(run.exitCode).toBe(1);
    expect(run.output).toContain(
      "pnpm public-access: the Access app \"artifactory\" has its Cookie Path Attribute on, so the owner's answers on a public page wouldn't save; turn it off, then rerun. Nothing was opened",
    );
    expect(publicApp()?.destinations?.map(({ uri }) => uri)).toEqual([
      "estudos.example.org/_astro/*",
      "estudos.example.org/favicon.svg",
      "estudos.example.org/limites",
      "estudos.example.org/limites/",
    ]);
  });

  it("refuses a manifest that would open the state API, in either mode, before changing anything", async () => {
    await succeeds(publicAccess("open", limitesOpen));
    const before = structuredClone(api.account);
    const manifest = ["/_astro/*", "/api/library", "/favicon.svg", "/limites", "/limites/"];

    const runs = [await publicAccess("close", manifest), await publicAccess("open", manifest)];

    for (const run of runs) {
      expect(run.exitCode).toBe(1);
      expect(run.output).toContain(
        "pnpm public-access: dist-worker/public-paths.json lists /api/library, and the state API never opens",
      );
    }
    expect(api.account).toEqual(before);
  });

  it("refuses to run before CI has filled in the custom domain", async () => {
    await succeeds(repo.run("git", ["stash", "push", "--quiet", "--", "wrangler.jsonc"]));
    try {
      const run = await publicAccess("open", limitesOpen);

      expect(run.exitCode).toBe(1);
      expect(run.output).toContain(
        "pnpm public-access: wrangler.jsonc still has its placeholders: run scripts/deploy-config.ts first",
      );
      expect(api.account.apps).toEqual([protectedApp]);
    } finally {
      await succeeds(repo.run("git", ["stash", "pop", "--quiet"]));
    }
  });
});
