import { readArtifacts } from "../src/artifacts.ts";
import { publicSlugs } from "../src/public-paths.ts";
import { messageOf } from "./error-message.ts";
import { readDeployedSite } from "./wrangler-config.ts";

// Checks from outside, with no cookies and following no redirects, that exactly the public paths
// are open. It reads the checkout's frontmatter, so it runs without a build.

function fail(message: string): never {
  console.error(`pnpm probe: ${message}`);
  process.exit(1);
}

type Expected =
  | { open: true; status: 200; namesAstroFiles?: true }
  | { open: true; status: 301 | 307; to: string }
  | { open: false; or401: boolean };

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
const openSlugs = publicSlugs(artifacts);
const publicArtifacts = new Set(openSlugs.map(({ artifact }) => artifact));
const privateArtifact = artifacts.find(
  (artifact) =>
    artifact.entry !== undefined && !artifact.entry.draft && !publicArtifacts.has(artifact),
);
const firstPublicPage = openSlugs
  .filter(({ former }) => !former)
  .map(({ slug }) => `/${slug}/`)
  .at(0);
const closed: Expected = { open: false, or401: true };

const pageChecks = openSlugs.flatMap(({ artifact, slug, former }): Check[] =>
  former
    ? [`/${slug}`, `/${slug}/`].map((path) => ({
        path,
        expected: { open: true, status: 301, to: `/${artifact.slug}/` },
      }))
    : [
        {
          path: `/${slug}/`,
          expected:
            `/${slug}/` === firstPublicPage
              ? { open: true, status: 200, namesAstroFiles: true }
              : { open: true, status: 200 },
        },
        { path: `/${slug}`, expected: { open: true, status: 307, to: `/${slug}/` } },
      ],
);
const faviconCheck: Check = {
  path: "/favicon.svg",
  expected: openSlugs.length > 0 ? { open: true, status: 200 } : closed,
};
const closedChecks: Check[] = [
  ...["/", "/drafts/", "/api/library", "/catalog/"].map((path): Check => ({
    path,
    // The Worker answers 401 itself to a request without an Access token, so a 401 on the API
    // could mean Access let it through.
    expected: path.startsWith("/api/") ? { open: false, or401: false } : closed,
  })),
  ...(privateArtifact === undefined
    ? []
    : [{ path: `/${privateArtifact.slug}/`, expected: closed }]),
];

console.log(
  `Probing ${origin === site ? site : `${domain} at ${origin},`} from outside, with no cookies and following no redirects.`,
);
const deadline = Date.now() + retryMs;
let retryAnnounced = false;
const answers = await askUntilAsExpected([...pageChecks, faviconCheck, ...closedChecks]);
const fileChecks: Check[] = astroFiles(
  firstPublicPage === undefined ? undefined : answers.get(firstPublicPage),
).map((path) => ({ path, expected: { open: true, status: 200 } }));
for (const [path, answer] of await askUntilAsExpected(fileChecks)) answers.set(path, answer);

const checks = [...pageChecks, faviconCheck, ...fileChecks, ...closedChecks];
const mismatches = checks.filter(
  ({ path, expected }) => !answersAsExpected(expected, answers.get(path)),
);
for (const { path, expected } of checks) {
  const answer = answers.get(path) ?? { error: "not asked" };
  console.log(
    `${answersAsExpected(expected, answer) ? "ok " : "OFF"} ${path}: expected ${describeExpected(expected)}, got ${describeAnswer(answer, expected)}`,
  );
}
if (mismatches.length > 0) {
  fail(`${String(mismatches.length)} of ${String(checks.length)} paths didn't answer as expected`);
}
console.log(`All ${String(checks.length)} paths answered as expected.`);

async function askUntilAsExpected(checks: Check[]): Promise<Map<string, Answer>> {
  const answers = new Map<string, Answer>();
  for (let round = 0; ; round += 1) {
    const off = checks.filter(
      ({ path, expected }) => !answersAsExpected(expected, answers.get(path)),
    );
    if (off.length === 0 || (round > 0 && Date.now() >= deadline)) return answers;
    if (round > 0) {
      if (!retryAnnounced) {
        retryAnnounced = true;
        console.log(
          `Retrying what's off for up to ${String(Math.round(retryMs / 1000))} seconds, while Access and the deploy propagate.`,
        );
      }
      await sleep(Math.min(retryInterval, deadline - Date.now()));
    }
    for (const { path } of off) answers.set(path, await ask(path));
  }
}

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
function astroFiles(answer: Answer | undefined): string[] {
  const page = answer !== undefined && "body" in answer ? (answer.body ?? "") : "";
  return [...new Set(page.match(/\/_astro\/[^"'\s()<>?#]+/g) ?? [])].sort();
}

// Access sends a visitor who isn't signed in to its login at the team's domain, which the
// probe doesn't know without wrangler.jsonc, so the login is recognized by its path.
function isAccessLogin(answer: Answer): boolean {
  return (
    "status" in answer &&
    answer.status === 302 &&
    answer.location?.pathname.startsWith("/cdn-cgi/access/login") === true
  );
}

function answersAsExpected(expected: Expected, answer: Answer | undefined): boolean {
  if (answer === undefined || "error" in answer) return false;
  if (!expected.open) return isAccessLogin(answer) || (expected.or401 && answer.status === 401);
  return (
    answer.status === expected.status &&
    answer.noindex &&
    (!("namesAstroFiles" in expected) || astroFiles(answer).length > 0) &&
    ("to" in expected ? answer.location?.href === `${site}${expected.to}` : true)
  );
}

function describeExpected(expected: Expected): string {
  if (!expected.open) return `302 to the Access login${expected.or401 ? " or 401" : ""}`;
  return `${String(expected.status)}${"to" in expected ? ` to ${expected.to}` : ""} with noindex${"namesAstroFiles" in expected ? " and /_astro/ files" : ""}`;
}

function describeAnswer(answer: Answer, expected: Expected): string {
  if ("error" in answer) return `no answer (${answer.error})`;
  if (isAccessLogin(answer)) return "302 to the Access login";
  if (answer.status === 401) return "401";
  const { location } = answer;
  const to =
    location === undefined
      ? ""
      : ` to ${location.origin === site ? `${location.pathname}${location.search}` : location.href}`;
  const files =
    "namesAstroFiles" in expected && answer.status === 200
      ? ` and ${String(astroFiles(answer).length || "no")} /_astro/ files`
      : "";
  return `${String(answer.status)}${to} ${answer.noindex ? "with" : "without"} noindex${files}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
