export interface AccessKeys {
  kid: string;
  privateKey: JsonWebKey;
  publicKey: JsonWebKey;
}

export const rs256 = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };

export async function signAccessToken(
  { kid, privateKey }: AccessKeys,
  claims: Record<string, unknown>,
): Promise<string> {
  const key = await crypto.subtle.importKey("jwk", privateKey, rs256, false, ["sign"]);
  const signedPart = [{ alg: "RS256", kid, typ: "JWT" }, claims]
    .map((part) => base64url(new TextEncoder().encode(JSON.stringify(part))))
    .join(".");
  const signature = await crypto.subtle.sign(rs256, key, new TextEncoder().encode(signedPart));
  return `${signedPart}.${base64url(new Uint8Array(signature))}`;
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
