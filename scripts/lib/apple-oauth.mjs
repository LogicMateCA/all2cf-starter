import { importPKCS8, SignJWT } from "jose";

function decodePrivateKey(value) {
  if (value.includes("BEGIN PRIVATE KEY")) return value;
  const bytes = Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function generateAppleClientSecret({ clientId, teamId, keyId, privateKeyBase64, now = Math.floor(Date.now() / 1000) }) {
  const key = await importPKCS8(decodePrivateKey(privateKeyBase64), "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setSubject(clientId)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt(now)
    .setExpirationTime(now + 180 * 24 * 60 * 60)
    .sign(key);
}
