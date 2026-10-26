import { applyD1Migrations, reset } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { afterEach, beforeEach } from "vitest";
import { signAccessToken, type AccessKeys } from "../../scripts/access-token.ts";

export function useFreshDatabase(): void {
  beforeEach(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  });
  afterEach(async () => {
    await reset();
  });
}

export function accessKeys(binding: string): AccessKeys {
  return JSON.parse(binding) as AccessKeys;
}

export function accessToken(claims: Record<string, unknown> = {}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return signAccessToken(accessKeys(env.TEST_ACCESS_KEYS), {
    iss: env.ACCESS_TEAM_DOMAIN,
    aud: [env.ACCESS_AUD],
    email: "owner@example.com",
    iat: now,
    exp: now + 600,
    ...claims,
  });
}

export async function apiRequest(
  method: "GET" | "PUT",
  path: string,
  { body, token }: { body?: string; token?: string | null } = {},
): Promise<Response> {
  const headers = new Headers({ "Content-Type": "application/json" });
  const assertion = token === undefined ? await accessToken() : token;
  if (assertion !== null) headers.set("Cf-Access-Jwt-Assertion", assertion);
  return exports.default.fetch(
    new Request(`https://artifactory.test${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body }),
    }),
  );
}

export function putAnswer(
  artifactId: string,
  attemptId: string,
  questionId: string,
  answer: unknown,
): Promise<Response> {
  return apiRequest("PUT", `/api/state/${artifactId}/attempts/${attemptId}/answers/${questionId}`, {
    body: JSON.stringify(answer),
  });
}
