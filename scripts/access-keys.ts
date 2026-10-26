import { rs256, type AccessKeys } from "./access-token.ts";

export async function createAccessKeys(kid: string): Promise<AccessKeys> {
  const pair = await crypto.subtle.generateKey(
    { ...rs256, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
    true,
    ["sign", "verify"],
  );
  return {
    kid,
    privateKey: await crypto.subtle.exportKey("jwk", pair.privateKey),
    publicKey: await crypto.subtle.exportKey("jwk", pair.publicKey),
  };
}

export function accessCerts({ kid, publicKey }: AccessKeys): {
  keys: (JsonWebKey & { kid: string })[];
} {
  return { keys: [{ ...publicKey, kid }] };
}
