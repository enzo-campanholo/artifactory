import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { publicPathsFile } from "../src/public-paths.ts";
import { readDeployedSite, type DeployedSite } from "./wrangler-config.ts";

// Keeps the public Access app's Bypass in step with the build's public paths
// (.scratch/public-artifacts/spec.md, "The public Access script"). Every change goes in an order
// that never opens more than the manifest asks, so a failure leaves artifacts locked.

const root = process.cwd();
const publicAppName = "artifactory public artifacts";
const bypass = { name: publicAppName, decision: "bypass", include: [{ everyone: {} }] };

function fail(message: string): never {
  console.error(`pnpm public-access: ${message}`);
  process.exit(1);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
  policies?: { id: string }[];
}

interface AccessPolicy {
  id: string;
  name: string;
  decision: string;
  include: unknown[];
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

const { site, manifest } = await readInputs().catch(async (error: unknown) => {
  // Without the manifest and the domain, `close` can't tell what stays public, so it keeps
  // nothing open.
  if (mode === "close") await setPublicApp(await findPublicApp(), []);
  fail(messageOf(error));
});
const refused = manifest.filter(couldOpenStateApi);
const refusal = `${publicPathsFile} lists ${refused.join(", ")}, which could open the state API`;
const wanted = manifest
  .filter((path) => !refused.includes(path))
  .map((path) => `${site.domain}${path}`);

const publicApp = await findPublicApp();
if (mode === "close") {
  if (publicApp === undefined) {
    console.log("There's no public Access app, so nothing is open to close.");
  } else {
    const openNow = destinationsOf(publicApp);
    await setPublicApp(
      publicApp,
      openNow.filter((destination) => wanted.includes(destination)),
    );
  }
  if (refused.length > 0) fail(refusal);
} else {
  if (refused.length > 0) fail(refusal);
  const protectedApp = (await list<AccessApp>("apps", { aud: site.accessAud })).find(
    ({ aud }) => aud === site.accessAud,
  );
  if (protectedApp === undefined) {
    fail(`no Access app has the AUD wrangler.jsonc's ACCESS_AUD gives, so nothing was opened`);
  }
  if (protectedApp.path_cookie_attribute === true) {
    fail(
      `the Access app "${protectedApp.name}" has its Cookie Path Attribute on, so the owner's answers on a public page wouldn't save; turn it off, then rerun. Nothing was opened`,
    );
  }
  const policy = await findBypass();
  if (policy !== undefined && protectedApp.policies?.some(({ id }) => id === policy.id) === true) {
    fail(
      `the Access app "${protectedApp.name}" uses the "${publicAppName}" policy, so anyone can open the whole site; take the policy off it, then rerun. Nothing was opened`,
    );
  }
  await setPublicApp(publicApp, wanted);
}

async function readInputs(): Promise<{ site: DeployedSite; manifest: string[] }> {
  const site = readDeployedSite(root);
  const text = await readFile(join(root, publicPathsFile), "utf8").catch(() => {
    throw new Error(`there's no ${publicPathsFile}: build first`);
  });
  const paths = (() => {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return undefined;
    }
  })();
  if (
    !Array.isArray(paths) ||
    !paths.every((path): path is string => typeof path === "string" && path.startsWith("/"))
  ) {
    throw new Error(`${publicPathsFile} isn't a list of paths`);
  }
  return { site, manifest: paths };
}

// A destination may cover the paths under it as well as itself, and `*` in it matches any run of
// characters, so this refuses every path that could reach `/api` or anything under `/api/`.
function couldOpenStateApi(path: string): boolean {
  const covered = [path, path.endsWith("/") ? `${path}*` : `${path}/*`];
  return covered.some(
    (pattern) => couldMatch(pattern, "/api", false) || couldMatch(pattern, "/api/", true),
  );
}

function couldMatch(pattern: string, path: string, asPrefix: boolean): boolean {
  if (path === "") return asPrefix || /^\**$/.test(pattern);
  if (pattern === "") return false;
  if (pattern.startsWith("*")) {
    return (
      couldMatch(pattern.slice(1), path, asPrefix) || couldMatch(pattern, path.slice(1), asPrefix)
    );
  }
  return (
    path.startsWith(pattern.charAt(0)) && couldMatch(pattern.slice(1), path.slice(1), asPrefix)
  );
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${apiBase}/accounts/${accountId}/access/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? null : JSON.stringify(body),
  }).catch((error: unknown) =>
    fail(`${method} ${path} didn't reach Cloudflare: ${messageOf(error)}`),
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

async function list<T>(collection: string, filters: Record<string, string> = {}): Promise<T[]> {
  const query = new URLSearchParams({ ...filters, per_page: "1000" });
  return call<T[]>("GET", `${collection}?${query.toString()}`);
}

async function findPublicApp(): Promise<AccessApp | undefined> {
  const apps = (await list<AccessApp>("apps", { name: publicAppName, exact: "true" })).filter(
    ({ name }) => name === publicAppName,
  );
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
async function findBypass(): Promise<AccessPolicy | undefined> {
  return (await list<AccessPolicy>("policies")).find(({ name }) => name === publicAppName);
}

async function deleteBypass(): Promise<void> {
  const policy = await findBypass();
  if (policy === undefined) return;
  const users = (await list<AccessApp>("apps")).filter((app) =>
    app.policies?.some(({ id }) => id === policy.id),
  );
  if (users.length > 0) {
    fail(
      `the Access app ${users.map(({ name }) => `"${name}"`).join(", ")} uses the "${publicAppName}" policy too, so it wasn't deleted; take the policy off it, then rerun`,
    );
  }
  await call("DELETE", `policies/${policy.id}`);
}

// Creates, replaces or, with no destinations, deletes the public app and its Bypass.
async function setPublicApp(app: AccessApp | undefined, destinations: string[]): Promise<void> {
  const policy = destinations.length === 0 ? undefined : await putPublicApp(app, destinations);
  if (policy === undefined && app !== undefined) await call("DELETE", `apps/${app.id}`);
  printChanges(app, destinations);
  if (policy === undefined) {
    await deleteBypass();
  } else if (
    policy.decision !== bypass.decision ||
    !isDeepStrictEqual(policy.include, bypass.include)
  ) {
    // Repaired only now, so it opens nothing beyond `destinations`.
    await call("PUT", `policies/${policy.id}`, bypass);
    console.log(`Made the "${publicAppName}" policy a bypass for everyone again.`);
  }
}

async function putPublicApp(app: AccessApp | undefined, destinations: string[]) {
  const policy = (await findBypass()) ?? (await call<AccessPolicy>("POST", "policies", bypass));
  const body = {
    name: publicAppName,
    type: "self_hosted",
    domain: destinations[0],
    destinations: destinations.map((uri) => ({ type: "public", uri })),
    policies: [{ id: policy.id, precedence: 1 }],
    app_launcher_visible: false,
  };
  await (app === undefined ? call("POST", "apps", body) : call("PUT", `apps/${app.id}`, body));
  return policy;
}

function printChanges(app: AccessApp | undefined, destinations: string[]): void {
  const before = app === undefined ? [] : destinationsOf(app);
  for (const destination of before.filter((uri) => !destinations.includes(uri))) {
    console.log(`Removed ${destination}`);
  }
  for (const destination of destinations.filter((uri) => !before.includes(uri))) {
    console.log(`Added ${destination}`);
  }
  const count = String(destinations.length);
  if (destinations.length > 0) {
    console.log(
      app === undefined
        ? `Created the public Access app, opening ${count} destinations.`
        : `The public Access app opens ${count} destinations.`,
    );
  } else {
    console.log(
      app === undefined
        ? "Nothing is open, and there's no public Access app."
        : "Deleted the public Access app, so nothing is open.",
    );
  }
}
