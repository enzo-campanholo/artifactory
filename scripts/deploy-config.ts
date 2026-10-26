import { readFileSync, writeFileSync } from "node:fs";

// Each repository variable replaces its placeholder in wrangler.jsonc, once, before a deploy.
const placeholders = {
  ARTIFACTORY_DOMAIN: '"artifactory.example.com"',
  D1_DATABASE_ID: '"00000000-0000-0000-0000-000000000000"',
  ACCESS_TEAM_DOMAIN: '"https://example.cloudflareaccess.com"',
  ACCESS_AUD: '"example-access-aud"',
};

let config = readFileSync("wrangler.jsonc", "utf8");
const problems: string[] = [];
for (const [name, placeholder] of Object.entries(placeholders)) {
  const value = process.env[name];
  if (!value) problems.push(`${name} isn't set`);
  else if (config.split(placeholder).length !== 2) problems.push(`${placeholder} isn't in it once`);
  else config = config.replace(placeholder, JSON.stringify(value));
}
if (problems.length > 0) {
  console.error(`deploy-config: wrangler.jsonc can't be filled in: ${problems.join("; ")}.`);
  process.exit(1);
}
writeFileSync("wrangler.jsonc", config);
