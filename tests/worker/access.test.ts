import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { signAccessToken } from "../../scripts/access-token.ts";
import { accessKeys, accessToken, apiRequest, useFreshDatabase } from "./requests.ts";

useFreshDatabase();

const answerPath =
  "/api/state/orbits01/attempts/6f9a2c84-1d3e-4b57-9a0c-2e8f71d4b6a3/answers/orbit-period";
const answer = JSON.stringify({ response: 2, mark: "right" });
const hourAgo = Math.floor(Date.now() / 1000) - 3600;

test("an API request with a valid Access token is let through", async () => {
  const response = await apiRequest("PUT", answerPath, { body: answer });

  expect(response.status).toBe(201);
});

test.each([
  ["no Access token", () => Promise.resolve(null)],
  ["a token that isn't a JWT", () => Promise.resolve("not-a-token")],
  [
    "a token signed by a key Access didn't publish",
    async () =>
      signAccessToken(accessKeys(env.TEST_UNPUBLISHED_ACCESS_KEYS), {
        iss: env.ACCESS_TEAM_DOMAIN,
        aud: [env.ACCESS_AUD],
        exp: Math.floor(Date.now() / 1000) + 600,
      }),
  ],
  ["a token for another Access application", () => accessToken({ aud: ["another-application"] })],
  [
    "a token from another Access team",
    () => accessToken({ iss: "https://elsewhere.cloudflareaccess.com" }),
  ],
  ["an expired token", () => accessToken({ iat: hourAgo - 600, exp: hourAgo })],
  ["a token without an expiry", () => accessToken({ exp: undefined })],
])("an API request with %s is rejected as signed out", async (_case, token) => {
  const put = await apiRequest("PUT", answerPath, { body: answer, token: await token() });
  const get = await apiRequest("GET", "/api/state/orbits01", { token: await token() });

  expect(put.status).toBe(401);
  expect(get.status).toBe(401);
});
