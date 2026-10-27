import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { publicPathsFile } from "../src/public-paths.ts";
import { readDeployedSite } from "./wrangler-config.ts";

// Keeps the public Access app's Bypass in step with the build's public paths
// (.scratch/public-artifacts/spec.md, "The public Access script"). `close` runs before the deploy
// and only takes destinations away; `open` runs after it and sets exactly the new manifest. Every
// change goes in an order that never opens more than the manifest asks, so a failure leaves pages
// locked.

const root = process.cwd();
const publicAppName = "artifactory public artifacts";

function fail(message: string): never {
  console.error(`pnpm public-access: ${message}`);
  process.exit(1);
}

interface Envelope<T> {
  success: boolean;
  errors: { code: number; message: string }[];
  result: T;
}

interface AccessApp {
  id: string;
  aud: string;
  name: string;
  path_cookie_attribute?: boolean;
  destinations?: { type: string; uri?: string }[];
}

interface AccessPolicy {
  id: string;
  name: string;
}

const [mode, ...extra] = process.argv.slice(2);
if ((mode !== "close" && mode !== "open") || extra.length > 0) {
  fail("usage: pnpm public-access close|open");
}
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
const token = process.env.CLOUDFLARE_ACCESS_API_TOKEN ?? "";
if (accountId === "" || token === "") {
  fail("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_ACCESS_API_TOKEN must be set");
}
// The variable wrangler reads for the API's address too; the tests point it at a stand-in.
const apiBase = process.env.CLOUDFLARE_API_BASE_URL ?? "https://api.cloudflare.com/client/v4";

const site = (() => {
  try {
    return readDeployedSite(root);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
})();
const manifest = await readManifest();
const refused = manifest.filter((path) => path === "/api" || path.startsWith("/api/"));
if (refused.length > 0) {
  fail(`${publicPathsFile} lists ${refused.join(", ")}, and the state API never opens`);
}
const wanted = manifest.map((path) => `${site.domain}${path}`);

const publicApp = await findPublicApp();
if (mode === "close") {
  if (publicApp === undefined) {
    console.log("There's no public Access app, so nothing is open to close.");
  } else {
    const open = destinationsOf(publicApp);
    await setDestinations(
      publicApp,
      open.filter((destination) => wanted.includes(destination)),
    );
  }
} else {
  const protectedApp = (
    await call<AccessApp[]>("GET", `apps?aud=${encodeURIComponent(site.accessAud)}&per_page=1000`)
  ).find(({ aud }) => aud === site.accessAud);
  if (protectedApp === undefined) {
    fail(`no Access app has the AUD wrangler.jsonc's ACCESS_AUD gives, so nothing was opened`);
  }
  if (protectedApp.path_cookie_attribute === true) {
    fail(
      `the Access app "${protectedApp.name}" has its Cookie Path Attribute on, so the owner's answers on a public page wouldn't save; turn it off, then rerun. Nothing was opened`,
    );
  }
  await setDestinations(publicApp, wanted);
}

async function readManifest(): Promise<string[]> {
  const text = await readFile(join(root, publicPathsFile), "utf8").catch(() =>
    fail(`there's no ${publicPathsFile}: build first`),
  );
  const paths = JSON.parse(text) as unknown;
  if (
    !Array.isArray(paths) ||
    !paths.every((path): path is string => typeof path === "string" && path.startsWith("/"))
  ) {
    fail(`${publicPathsFile} isn't a list of paths`);
  }
  return paths;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${apiBase}/accounts/${accountId}/access/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? null : JSON.stringify(body),
  }).catch((error: unknown) =>
    fail(
      `${method} ${path} didn't reach Cloudflare: ${error instanceof Error ? error.message : String(error)}`,
    ),
  );
  const envelope = (await response.json().catch(() => undefined)) as Envelope<T> | undefined;
  if (!response.ok || envelope?.success !== true) {
    const reasons = envelope?.errors.map(({ code, message }) => `${String(code)} ${message}`);
    fail(
      `Cloudflare answered ${method} ${path} with ${String(response.status)}${reasons === undefined ? "" : `: ${reasons.join("; ")}`}`,
    );
  }
  return envelope.result;
}

async function findPublicApp(): Promise<AccessApp | undefined> {
  const apps = (
    await call<AccessApp[]>(
      "GET",
      `apps?name=${encodeURIComponent(publicAppName)}&exact=true&per_page=1000`,
    )
  ).filter(({ name }) => name === publicAppName);
  if (apps.length > 1) {
    fail(`${String(apps.length)} Access apps are named "${publicAppName}": delete all but one`);
  }
  return apps[0];
}

function destinationsOf(app: AccessApp): string[] {
  return (app.destinations ?? []).flatMap(({ type, uri }) =>
    type === "public" && uri !== undefined ? [uri] : [],
  );
}

// The Bypass is a reusable policy found by the app's name, linked by ID, since that's the form the
// API reference documents for an app's `policies`:
// https://developers.cloudflare.com/api/resources/zero_trust/subresources/access/subresources/applications/methods/create/
async function bypassPolicy(): Promise<AccessPolicy | undefined> {
  return (await call<AccessPolicy[]>("GET", "policies?per_page=1000")).find(
    ({ name }) => name === publicAppName,
  );
}

async function setDestinations(app: AccessApp | undefined, destinations: string[]): Promise<void> {
  if (destinations.length === 0) {
    if (app !== undefined) await call("DELETE", `apps/${app.id}`);
    const policy = await bypassPolicy();
    if (policy !== undefined) await call("DELETE", `policies/${policy.id}`);
    printChanges(app, destinations);
    console.log(
      app === undefined
        ? "Nothing is public, and there's no public Access app."
        : "Deleted the public Access app, since nothing is public.",
    );
    return;
  }

  const policy =
    (await bypassPolicy()) ??
    (await call<AccessPolicy>("POST", "policies", {
      name: publicAppName,
      decision: "bypass",
      include: [{ everyone: {} }],
    }));
  const body = {
    name: publicAppName,
    type: "self_hosted",
    domain: destinations[0],
    destinations: destinations.map((uri) => ({ type: "public", uri })),
    policies: [{ id: policy.id, precedence: 1 }],
    app_launcher_visible: false,
  };
  if (app === undefined) {
    await call("POST", "apps", body);
    printChanges(app, destinations);
    console.log(
      `Created the public Access app, opening ${String(destinations.length)} destinations.`,
    );
  } else {
    await call("PUT", `apps/${app.id}`, body);
    printChanges(app, destinations);
    console.log(`The public Access app opens ${String(destinations.length)} destinations.`);
  }
}

function printChanges(app: AccessApp | undefined, destinations: string[]): void {
  const open = app === undefined ? [] : destinationsOf(app);
  for (const destination of open.filter((uri) => !destinations.includes(uri))) {
    console.log(`Removed ${destination}`);
  }
  for (const destination of destinations.filter((uri) => !open.includes(uri))) {
    console.log(`Added ${destination}`);
  }
}
