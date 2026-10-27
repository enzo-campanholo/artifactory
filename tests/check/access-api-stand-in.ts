import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

// A Cloudflare account's Access apps and reusable policies, served at the endpoints `pnpm
// public-access` calls, in the shapes Cloudflare's API reference gives:
// https://developers.cloudflare.com/api/resources/zero_trust/subresources/access/subresources/applications/
// https://developers.cloudflare.com/api/resources/zero_trust/subresources/access/subresources/policies/
export interface AccessApp {
  id: string;
  aud: string;
  name: string;
  type: string;
  domain: string;
  path_cookie_attribute?: boolean;
  destinations?: { type: string; uri?: string }[];
  policies?: { id: string; precedence?: number }[];
}

interface AccessPolicy {
  id: string;
  name: string;
  decision: string;
  include: unknown[];
}

interface AccessAccount {
  apps: AccessApp[];
  policies: AccessPolicy[];
}

export interface AccessApiStandIn {
  url: string;
  account: AccessAccount;
  close(): Promise<void>;
}

export const standInAccountId = "0123456789abcdef0123456789abcdef";
export const standInToken = "access-api-token";

export async function startAccessApiStandIn(): Promise<AccessApiStandIn> {
  const standIn = { account: { apps: [], policies: [] } as AccessAccount };
  const server = createServer((request, response) => {
    void bodyOf(request).then((body) => {
      respond(response, answer(standIn.account, request, body));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return Object.assign(standIn, {
    url: `http://127.0.0.1:${String(port)}/client/v4`,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      }),
  });
}

interface Answer {
  status: number;
  result?: unknown;
}

function answer(account: AccessAccount, request: IncomingMessage, body: unknown): Answer {
  if (request.headers.authorization !== `Bearer ${standInToken}`) return { status: 403 };
  const url = new URL(request.url ?? "/", "http://stand-in");
  const prefix = `/client/v4/accounts/${standInAccountId}/access/`;
  if (!url.pathname.startsWith(prefix)) return { status: 404 };
  const [collection, id, ...rest] = url.pathname.slice(prefix.length).split("/");
  if (rest.length > 0) return { status: 404 };
  const route = `${request.method ?? ""} ${collection ?? ""}${id === undefined ? "" : "/:id"}`;
  switch (route) {
    case "GET apps": {
      const name = url.searchParams.get("name");
      const aud = url.searchParams.get("aud");
      return {
        status: 200,
        result: account.apps.filter(
          (app) => (name === null || app.name === name) && (aud === null || app.aud === aud),
        ),
      };
    }
    case "POST apps": {
      const app = {
        ...(body as Omit<AccessApp, "id" | "aud">),
        id: randomUUID(),
        aud: randomUUID(),
      };
      account.apps.push(app);
      return { status: 201, result: app };
    }
    case "PUT apps/:id": {
      const index = account.apps.findIndex((app) => app.id === id);
      const existing = account.apps[index];
      if (existing === undefined) return { status: 404 };
      const app = { ...(body as AccessApp), id: existing.id, aud: existing.aud };
      account.apps[index] = app;
      return { status: 200, result: app };
    }
    case "DELETE apps/:id": {
      if (!account.apps.some((app) => app.id === id)) return { status: 404 };
      account.apps = account.apps.filter((app) => app.id !== id);
      return { status: 202, result: { id } };
    }
    case "GET policies":
      return { status: 200, result: account.policies };
    case "POST policies": {
      const policy = { ...(body as Omit<AccessPolicy, "id">), id: randomUUID() };
      account.policies.push(policy);
      return { status: 201, result: policy };
    }
    case "PUT policies/:id": {
      const index = account.policies.findIndex((policy) => policy.id === id);
      const existing = account.policies[index];
      if (existing === undefined) return { status: 404 };
      const policy = { ...(body as AccessPolicy), id: existing.id };
      account.policies[index] = policy;
      return { status: 200, result: policy };
    }
    case "DELETE policies/:id": {
      if (account.apps.some((app) => app.policies?.some((link) => link.id === id))) {
        return { status: 400 };
      }
      if (!account.policies.some((policy) => policy.id === id)) return { status: 404 };
      account.policies = account.policies.filter((policy) => policy.id !== id);
      return { status: 202, result: { id } };
    }
    default:
      return { status: 404 };
  }
}

function respond(response: ServerResponse, { status, result }: Answer): void {
  const success = status < 400;
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(
    JSON.stringify({
      success,
      errors: success
        ? []
        : [{ code: 10000 + status, message: `stand-in refused with ${String(status)}` }],
      messages: [],
      result: result ?? null,
    }),
  );
}

async function bodyOf(request: IncomingMessage): Promise<unknown> {
  let text = "";
  for await (const chunk of request) text += String(chunk);
  return text === "" ? undefined : JSON.parse(text);
}
