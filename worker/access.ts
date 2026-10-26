interface AccessToken {
  header: { alg?: unknown; kid?: unknown };
  claims: Record<string, unknown>;
  signedPart: Uint8Array;
  signature: Uint8Array;
}

const rs256 = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };

// Verifies the token Cloudflare Access adds to every request it lets through, as Access's docs
// require of an origin: https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
export async function hasValidAccessToken(
  request: Request,
  { ACCESS_TEAM_DOMAIN, ACCESS_AUD }: Cloudflare.Env,
): Promise<boolean> {
  const token = parseToken(request.headers.get("Cf-Access-Jwt-Assertion"));
  const kid = token?.header.kid;
  if (token?.header.alg !== "RS256" || typeof kid !== "string") return false;
  const key = await signingKey(ACCESS_TEAM_DOMAIN, kid);
  if (key === undefined) return false;
  if (!(await crypto.subtle.verify(rs256, key, token.signature, token.signedPart))) return false;
  const { iss, aud, exp, nbf } = token.claims;
  const now = Date.now() / 1000;
  return (
    iss === ACCESS_TEAM_DOMAIN &&
    (Array.isArray(aud) ? aud.includes(ACCESS_AUD) : aud === ACCESS_AUD) &&
    typeof exp === "number" &&
    exp > now &&
    (nbf === undefined || (typeof nbf === "number" && nbf <= now))
  );
}

function parseToken(value: string | null): AccessToken | undefined {
  const parts = value?.split(".") ?? [];
  const [header, claims, signature] = parts;
  if (
    parts.length !== 3 ||
    header === undefined ||
    claims === undefined ||
    signature === undefined
  ) {
    return undefined;
  }
  try {
    return {
      header: jsonObject(base64urlDecode(header)),
      claims: jsonObject(base64urlDecode(claims)),
      signedPart: new TextEncoder().encode(`${header}.${claims}`),
      signature: base64urlDecode(signature),
    };
  } catch {
    return undefined;
  }
}

function base64urlDecode(text: string): Uint8Array {
  return Uint8Array.from(atob(text.replaceAll("-", "+").replaceAll("_", "/")), (character) =>
    character.charCodeAt(0),
  );
}

function jsonObject(bytes: Uint8Array): Record<string, unknown> {
  const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (typeof value !== "object" || value === null) throw new TypeError("not a JSON object");
  return value as Record<string, unknown>;
}

let cachedKeys: Promise<Map<string, CryptoKey>> | undefined;

// Access rotates its signing keys, so an unknown key ID fetches the team's keys again.
async function signingKey(teamDomain: string, kid: string): Promise<CryptoKey | undefined> {
  const known = await (cachedKeys ?? fetchSigningKeys(teamDomain));
  return known.get(kid) ?? (await fetchSigningKeys(teamDomain)).get(kid);
}

function fetchSigningKeys(teamDomain: string): Promise<Map<string, CryptoKey>> {
  cachedKeys = (async () => {
    const response = await fetch(`${teamDomain}/cdn-cgi/access/certs`);
    if (!response.ok) throw new Error(`Access certs answered ${String(response.status)}`);
    const { keys } = await response.json<{ keys: (JsonWebKey & { kid: string })[] }>();
    return new Map(
      await Promise.all(
        keys.map(
          async (jwk) =>
            [jwk.kid, await crypto.subtle.importKey("jwk", jwk, rs256, false, ["verify"])] as const,
        ),
      ),
    );
  })();
  cachedKeys.catch(() => {
    cachedKeys = undefined;
  });
  return cachedKeys;
}
