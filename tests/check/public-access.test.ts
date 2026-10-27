import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
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
const publicAppName = "artifactory public artifacts";

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

  async function publicAccess(mode: string, manifest: string[] | undefined): Promise<CommandRun> {
    const manifestFile = join(repo.root, "dist-worker/public-paths.json");
    await mkdir(dirname(manifestFile), { recursive: true });
    await (manifest === undefined
      ? rm(manifestFile, { force: true })
      : writeFile(manifestFile, JSON.stringify(manifest)));
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
    return api.account.apps.find(({ name }) => name === publicAppName);
  }

  function protectedAppInAccount(): AccessApp {
    const app = api.account.apps.find(({ aud }) => aud === protectedAud);
    if (app === undefined) throw new Error("the protected app is gone");
    return app;
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

  it("open and close repair a Bypass edited by hand into anything but a bypass for everyone", async () => {
    await succeeds(publicAccess("open", limitesOpen));
    const editByHand = () => {
      const policy = api.account.policies.find(({ name }) => name === publicAppName);
      if (policy === undefined) throw new Error("open created no Bypass");
      policy.decision = "allow";
      policy.include = [{ email: { email: "someone@example.org" } }];
    };

    for (const mode of ["open", "close"]) {
      editByHand();

      const run = await publicAccess(mode, limitesOpen);

      expect(run.exitCode).toBe(0);
      expect(api.account.policies.filter(({ name }) => name === publicAppName)).toEqual([
        expect.objectContaining({ decision: "bypass", include: [{ everyone: {} }] }),
      ]);
      expect(publicApp()?.policies?.map(({ id }) => id)).toEqual(
        bypassPolicies().map(({ id }) => id),
      );
    }
  });

  it("deletes the public app and its Bypass once nothing is public, leaving the protected app", async () => {
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
        "Deleted the public Access app, so nothing is open.",
        "",
      ].join("\n"),
    );
  });

  it("deletes the public app but keeps a Bypass another app uses, failing to say so", async () => {
    await succeeds(publicAccess("open", ["/_astro/*", "/favicon.svg", "/limites", "/limites/"]));
    const [bypass] = bypassPolicies();
    if (bypass === undefined) throw new Error("open created no Bypass");
    const notes: AccessApp = {
      id: "notes-app-id",
      aud: "notes-app-aud",
      name: "notes",
      type: "self_hosted",
      domain: "notes.example.org",
      policies: [{ id: bypass.id, precedence: 1 }],
    };
    api.account.apps.push(notes);

    const run = await publicAccess("close", []);

    expect(run.exitCode).toBe(1);
    expect(run.output).toContain(
      'pnpm public-access: the Access app "notes" uses the "artifactory public artifacts" policy too, so it wasn\'t deleted; take the policy off it, then rerun',
    );
    expect(api.account.apps).toEqual([protectedApp, notes]);
    expect(bypassPolicies()).toEqual([bypass]);
    expect(run.stdout).toBe(
      [
        "Removed estudos.example.org/_astro/*",
        "Removed estudos.example.org/favicon.svg",
        "Removed estudos.example.org/limites",
        "Removed estudos.example.org/limites/",
        "Deleted the public Access app, so nothing is open.",
        "",
      ].join("\n"),
    );
  });

  it("open with nothing public creates nothing", async () => {
    const run = await publicAccess("open", []);

    expect(run.exitCode).toBe(0);
    expect(api.account.apps).toEqual([protectedApp]);
    expect(bypassPolicies()).toEqual([]);
    expect(run.stdout).toBe("Nothing is open, and there's no public Access app.\n");
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
    protectedAppInAccount().path_cookie_attribute = true;

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

  it("open refuses to open anything while the protected app links the Bypass", async () => {
    await succeeds(publicAccess("open", ["/_astro/*", "/favicon.svg", "/limites", "/limites/"]));
    const [bypass] = bypassPolicies();
    if (bypass === undefined) throw new Error("open created no Bypass");
    protectedAppInAccount().policies?.push({ id: bypass.id, precedence: 2 });

    const run = await publicAccess("open", limitesOpen);

    expect(run.exitCode).toBe(1);
    expect(run.output).toContain(
      'pnpm public-access: the Access app "artifactory" uses the "artifactory public artifacts" policy, so anyone can open the whole site; take the policy off it, then rerun. Nothing was opened',
    );
    expect(publicApp()?.destinations?.map(({ uri }) => uri)).toEqual([
      "estudos.example.org/_astro/*",
      "estudos.example.org/favicon.svg",
      "estudos.example.org/limites",
      "estudos.example.org/limites/",
    ]);
  });

  it("open refuses a manifest that could open the state API, wildcards included, before changing anything", async () => {
    await succeeds(publicAccess("open", limitesOpen));
    const before = structuredClone(api.account);

    const run = await publicAccess("open", [
      "/",
      "/*/library",
      "/_astro/*",
      "/a*",
      "/api",
      "/api/library",
      "/apis",
      "/apis/",
      "/favicon.svg",
      "/limites",
    ]);

    expect(run.exitCode).toBe(1);
    expect(run.output).toContain(
      "pnpm public-access: dist-worker/public-paths.json lists /, /*/library, /a*, /api, /api/library, which could open the state API",
    );
    expect(api.account).toEqual(before);
  });

  it("close takes away what is no longer public before refusing a manifest that could open the state API", async () => {
    await succeeds(publicAccess("open", limitesOpen));

    const run = await publicAccess("close", [
      "/_astro/*",
      "/api/library",
      "/favicon.svg",
      "/limites",
      "/limites/",
    ]);

    expect(run.exitCode).toBe(1);
    expect(run.output).toContain(
      "pnpm public-access: dist-worker/public-paths.json lists /api/library, which could open the state API",
    );
    expect(publicApp()?.destinations?.map(({ uri }) => uri)).toEqual([
      "estudos.example.org/_astro/*",
      "estudos.example.org/favicon.svg",
      "estudos.example.org/limites",
      "estudos.example.org/limites/",
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

  it("close with no manifest closes everything, then fails", async () => {
    await succeeds(publicAccess("open", ["/_astro/*", "/favicon.svg", "/limites", "/limites/"]));

    const run = await publicAccess("close", undefined);

    expect(run.exitCode).toBe(1);
    expect(run.output).toContain(
      "pnpm public-access: there's no dist-worker/public-paths.json: build first",
    );
    expect(api.account.apps).toEqual([protectedApp]);
    expect(bypassPolicies()).toEqual([]);
    expect(run.stdout).toBe(
      [
        "Removed estudos.example.org/_astro/*",
        "Removed estudos.example.org/favicon.svg",
        "Removed estudos.example.org/limites",
        "Removed estudos.example.org/limites/",
        "Deleted the public Access app, so nothing is open.",
        "",
      ].join("\n"),
    );
  });

  it("refuses to run before CI has filled in the custom domain, close closing everything first", async () => {
    await succeeds(publicAccess("open", limitesOpen));
    const before = structuredClone(api.account);
    await succeeds(repo.run("git", ["stash", "push", "--quiet", "--", "wrangler.jsonc"]));
    try {
      const placeholders =
        "pnpm public-access: wrangler.jsonc still has its placeholders: run scripts/deploy-config.ts first";

      const opened = await publicAccess("open", limitesOpen);

      expect(opened.exitCode).toBe(1);
      expect(opened.output).toContain(placeholders);
      expect(api.account).toEqual(before);

      const closed = await publicAccess("close", limitesOpen);

      expect(closed.exitCode).toBe(1);
      expect(closed.output).toContain(placeholders);
      expect(api.account.apps).toEqual([protectedApp]);
      expect(bypassPolicies()).toEqual([]);
    } finally {
      await succeeds(repo.run("git", ["stash", "pop", "--quiet"]));
    }
  });
});
