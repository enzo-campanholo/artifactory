import { spawn, type SpawnOptions } from "node:child_process";
import { createServer, request } from "node:http";
import { accessCerts, createAccessKeys } from "./access-keys.ts";
import { signAccessToken } from "./access-token.ts";

// Locally nothing stands where Cloudflare Access does in production, so this plays its part: it
// publishes signing keys at the team's certs path and adds a signed `Cf-Access-Jwt-Assertion` to
// every request it passes on to `wrangler dev`. The Worker verifies these tokens exactly as it
// verifies real ones; only its ACCESS_TEAM_DOMAIN and ACCESS_AUD point here.
//
// `wrangler dev` listens on DEV_WORKER_PORT (8787 by default) and the stand-in on the port after it,
// so a second `pnpm dev:worker` runs beside the first with DEV_WORKER_PORT set two ports away.
const workerPort = Number(process.env.DEV_WORKER_PORT ?? 8787);
if (!Number.isInteger(workerPort) || workerPort < 1 || workerPort > 65534) {
  console.error(
    `pnpm dev:worker: DEV_WORKER_PORT must be a port from 1 to 65534, so the Access stand-in can take the next one, not "${String(process.env.DEV_WORKER_PORT)}".`,
  );
  process.exit(1);
}
const accessPort = workerPort + 1;
const teamDomain = `http://localhost:${String(accessPort)}`;
const audience = "local";

function run(command: string, args: string[], options: SpawnOptions = {}) {
  return spawn(command, args, { stdio: "inherit", ...options });
}

function finished(command: string, args: string[], options: SpawnOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    run(command, args, options).on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${String(code)}`));
    });
  });
}

await finished("astro", ["build"], {
  env: { ...process.env, PUBLIC_STATE_TRANSPORT: "http" },
});
await finished("wrangler", ["d1", "migrations", "apply", "artifactory", "--local"]);

const keys = await createAccessKeys("local");
const wrangler = run("wrangler", [
  "dev",
  "--port",
  String(workerPort),
  "--var",
  `ACCESS_TEAM_DOMAIN:${teamDomain}`,
  "--var",
  `ACCESS_AUD:${audience}`,
]);

const accessStandIn = createServer((incoming, outgoing) => {
  if (incoming.url === "/cdn-cgi/access/certs") {
    outgoing.writeHead(200, { "Content-Type": "application/json" });
    outgoing.end(JSON.stringify(accessCerts(keys)));
    return;
  }
  const now = Math.floor(Date.now() / 1000);
  signAccessToken(keys, {
    iss: teamDomain,
    aud: [audience],
    email: "owner@localhost",
    iat: now,
    exp: now + 600,
  }).then(
    (token) => {
      const upstream = request(
        {
          port: workerPort,
          path: incoming.url,
          method: incoming.method,
          headers: { ...incoming.headers, "cf-access-jwt-assertion": token },
        },
        (response) => {
          outgoing.writeHead(response.statusCode ?? 502, response.headers);
          response.pipe(outgoing);
        },
      );
      upstream.on("error", () => outgoing.writeHead(502).end("wrangler dev isn't answering yet"));
      incoming.pipe(upstream);
    },
    (error: unknown) =>
      outgoing.writeHead(500).end(`Signing an Access token failed: ${String(error)}`),
  );
});

accessStandIn.listen(accessPort, () => {
  console.log(`\nOpen ${teamDomain}/ to reach wrangler dev through the local Access stand-in.\n`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => wrangler.kill(signal));
}

wrangler.on("exit", (code) => {
  accessStandIn.close();
  process.exitCode = code ?? 0;
});
