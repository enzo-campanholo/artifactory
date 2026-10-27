import { readArtifacts } from "../src/artifacts.ts";
import { publicSlugs } from "../src/public-paths.ts";
import { readDeployedSite } from "./wrangler-config.ts";

// Checks from outside, with no cookies and following no redirects, that exactly the public paths
// are open (.scratch/public-artifacts/spec.md, "The probe"). It reads the checkout's frontmatter,
// so it runs without a build.

function fail(message: string): never {
  console.error(`pnpm probe: ${message}`);
  process.exit(1);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type Expected =
  { open: true; status: 200 } | { open: true; status: 301 | 307; to: string } | { open: false };

interface Check {
  path: string;
  expected: Expected;
}

type Answer =
  | { status: number; location: URL | undefined; noindex: boolean; body: string | undefined }
  | { error: string };

if (process.argv.length > 2) fail("usage: pnpm probe");

const root = process.cwd();
const domain = customDomain();
const site = `https://${domain}`;
// The tests point the probe at a local stand-in and shorten its retry; CI sets neither.
const origin = process.env.ARTIFACTORY_PROBE_ORIGIN ?? site;
const retryMs = Number(process.env.ARTIFACTORY_PROBE_RETRY_MS ?? 60_000);
if (!Number.isFinite(retryMs) || retryMs < 0) {
  fail("ARTIFACTORY_PROBE_RETRY_MS must be a number of milliseconds");
}
const retryInterval = 5_000;

const { artifacts } = await readArtifacts(root);
const held = publicSlugs(artifacts);
const publicArtifacts = new Set(held.map(({ artifact }) => artifact));
const privateArtifact = artifacts.find(
  (artifact) =>
    artifact.entry !== undefined && !artifact.entry.draft && !publicArtifacts.has(artifact),
);
const firstPage = held.find(({ former }) => !former);
const firstPagePath = firstPage === undefined ? undefined : `/${firstPage.slug}/`;
const closed: Expected = { open: false };

const checks: Check[] = [
  ...held.flatMap(({ artifact, slug, former }): Check[] =>
    former
      ? [`/${slug}`, `/${slug}/`].map((path) => ({
          path,
          expected: { open: true, status: 301, to: `/${artifact.slug}/` },
        }))
      : [
          { path: `/${slug}/`, expected: { open: true, status: 200 } },
          { path: `/${slug}`, expected: { open: true, status: 307, to: `/${slug}/` } },
        ],
  ),
  {
    path: "/favicon.svg",
    expected: held.length > 0 ? { open: true, status: 200 } : closed,
  },
  ...["/", "/drafts/", "/api/library", "/catalog/"].map((path) => ({ path, expected: closed })),
  ...(privateArtifact === undefined
    ? []
    : [{ path: `/${privateArtifact.slug}/`, expected: closed }]),
];

console.log(`Probing ${site} from outside, with no cookies and following no redirects.`);
const answers = new Map<string, Answer>();
const deadline = Date.now() + retryMs;
let filesListed = false;
for (let round = 0; ; round += 1) {
  const off = checks.filter((check) => !answersAsExpected(check));
  if (off.length === 0 || (round > 0 && Date.now() >= deadline)) break;
  if (round === 1) {
    console.log(
      `Retrying what's off for up to ${String(Math.round(retryMs / 1000))} seconds, while Access and the deploy propagate.`,
    );
  }
  if (round > 0) await sleep(Math.min(retryInterval, deadline - Date.now()));
  for (const check of off) {
    const answer = await ask(check.path);
    answers.set(check.path, answer);
    if (!filesListed && check.path === firstPagePath && "body" in answer && answer.body) {
      filesListed = true;
      const files = astroFiles(answer.body).map((path) => ({ path, expected: check.expected }));
      checks.splice(checks.findIndex(({ path }) => path === "/favicon.svg") + 1, 0, ...files);
      off.push(...files);
    }
  }
}

const mismatches = checks.filter((check) => !answersAsExpected(check));
for (const check of checks) {
  const answer = answers.get(check.path) ?? { error: "not asked" };
  console.log(
    `${answersAsExpected(check) ? "ok " : "OFF"} ${check.path}: expected ${describeExpected(check.expected)}, got ${describeAnswer(answer)}`,
  );
}
if (mismatches.length > 0) {
  fail(`${String(mismatches.length)} of ${String(checks.length)} paths didn't answer as expected`);
}
console.log(`All ${String(checks.length)} paths answered as expected.`);

// Wrangler.jsonc names the domain once CI has filled it in. Run by hand, it still holds its
// placeholders, and the owner names the domain in ARTIFACTORY_DOMAIN, as CI's variable does.
function customDomain(): string {
  try {
    return readDeployedSite(root).domain;
  } catch (error) {
    const fromEnvironment = process.env.ARTIFACTORY_DOMAIN ?? "";
    if (fromEnvironment === "") {
      fail(
        `wrangler.jsonc names no custom domain (${messageOf(error)}), and ARTIFACTORY_DOMAIN isn't set. Name it in either, for example: ARTIFACTORY_DOMAIN=$(gh variable get ARTIFACTORY_DOMAIN) pnpm probe`,
      );
    }
    if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(fromEnvironment)) {
      fail(
        `ARTIFACTORY_DOMAIN must be a hostname such as artifactory.example.com, not "${fromEnvironment}"`,
      );
    }
    return fromEnvironment;
  }
}

async function ask(path: string): Promise<Answer> {
  try {
    const response = await fetch(`${origin}${path}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    const location = response.headers.get("Location");
    const body = response.status === 200 ? await response.text() : undefined;
    if (body === undefined) await response.body?.cancel();
    return {
      status: response.status,
      // A relative Location is on the site, whichever origin was asked.
      location: location === null ? undefined : new URL(location, `${site}${path}`),
      noindex: response.headers.get("X-Robots-Tag")?.includes("noindex") === true,
      body,
    };
  } catch (error) {
    return { error: messageOf(error) };
  }
}

// Every page links the same kind of `/_astro/` files, so the first public page's stand for all.
function astroFiles(page: string): string[] {
  return [...new Set(page.match(/\/_astro\/[^"'\s()<>?#]+/g) ?? [])].sort();
}

// Access sends a visitor who isn't signed in to its login at the team's domain, which the
// probe doesn't know without wrangler.jsonc, so the login is recognized by its path.
function isAccessLogin(location: URL | undefined): boolean {
  return location?.pathname.startsWith("/cdn-cgi/access/login") === true;
}

function answersAsExpected({ path, expected }: Check): boolean {
  const answer = answers.get(path);
  if (answer === undefined || "error" in answer) return false;
  if (!expected.open) {
    return answer.status === 401 || (answer.status === 302 && isAccessLogin(answer.location));
  }
  return (
    answer.status === expected.status &&
    answer.noindex &&
    ("to" in expected ? answer.location?.href === `${site}${expected.to}` : true)
  );
}

function describeExpected(expected: Expected): string {
  if (!expected.open) return "302 to the Access login or 401";
  return `${String(expected.status)}${"to" in expected ? ` to ${expected.to}` : ""} with noindex`;
}

function describeAnswer(answer: Answer): string {
  if ("error" in answer) return `no answer (${answer.error})`;
  if (answer.status === 302 && isAccessLogin(answer.location)) return "302 to the Access login";
  if (answer.status === 401) return "401";
  const { location } = answer;
  const to =
    location === undefined
      ? ""
      : ` to ${location.origin === site ? `${location.pathname}${location.search}` : location.href}`;
  return `${String(answer.status)}${to} ${answer.noindex ? "with" : "without"} noindex`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
