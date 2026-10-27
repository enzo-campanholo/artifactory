import { readFileSync, writeFileSync } from "node:fs";
import { placeholders } from "./wrangler-config.ts";

let config = readFileSync("wrangler.jsonc", "utf8");
const problems: string[] = [];
for (const [name, value] of Object.entries(placeholders)) {
  const placeholder = JSON.stringify(value);
  const variable = process.env[name];
  if (!variable) problems.push(`${name} isn't set`);
  else if (config.split(placeholder).length !== 2) problems.push(`${placeholder} isn't in it once`);
  else config = config.replace(placeholder, JSON.stringify(variable));
}
if (problems.length > 0) {
  console.error(`deploy-config: wrangler.jsonc can't be filled in: ${problems.join("; ")}.`);
  process.exit(1);
}
writeFileSync("wrangler.jsonc", config);
