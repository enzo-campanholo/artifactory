import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

// Each repository variable replaces its placeholder in wrangler.jsonc, once, before a deploy.
export const placeholders = {
  ARTIFACTORY_DOMAIN: "artifactory.example.com",
  D1_DATABASE_ID: "00000000-0000-0000-0000-000000000000",
  ACCESS_TEAM_DOMAIN: "https://example.cloudflareaccess.com",
  ACCESS_AUD: "example-access-aud",
};

export interface DeployedSite {
  domain: string;
  accessAud: string;
}

interface WranglerConfig {
  routes?: { pattern?: unknown }[];
  vars?: { ACCESS_AUD?: unknown };
}

// The custom domain and the protected Access app's AUD, once scripts/deploy-config.ts has filled
// them in. TypeScript's reader takes wrangler.jsonc's comments and trailing commas.
export function readDeployedSite(root: string): DeployedSite {
  const { config, error } = ts.parseConfigFileTextToJson(
    "wrangler.jsonc",
    readFileSync(join(root, "wrangler.jsonc"), "utf8"),
  ) as { config?: WranglerConfig; error?: unknown };
  const domain = config?.routes?.[0]?.pattern;
  const accessAud = config?.vars?.ACCESS_AUD;
  if (error !== undefined || typeof domain !== "string" || typeof accessAud !== "string") {
    throw new Error("wrangler.jsonc has no route pattern or no ACCESS_AUD");
  }
  if (domain === placeholders.ARTIFACTORY_DOMAIN || accessAud === placeholders.ACCESS_AUD) {
    throw new Error(
      "wrangler.jsonc still has its placeholders: run scripts/deploy-config.ts first",
    );
  }
  return { domain, accessAud };
}
