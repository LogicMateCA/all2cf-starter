import assert from "node:assert/strict";
import { selectedSocialProviders, socialProviderMethods } from "./lib/social-providers.mjs";
import { decodeJwt, decodeProtectedHeader, exportPKCS8, generateKeyPair } from "jose";
import { generateAppleClientSecret } from "./lib/apple-oauth.mjs";
import { socialProviderHealthMatches } from "./lib/social-provider-health.mjs";
const base = {
  APP_ENV: "test",
  SERVICE_NAME: "starter",
  APP_NAME: "Starter",
  AUTH_CANONICAL_ORIGIN: "https://starter.example.test",
  AUTH_EMAIL_PROVIDER: "cfsend",
  AUTH_REQUIRE_EMAIL_VERIFICATION: "true",
  MOBILE_DEEP_LINK_SCHEMES: "starter://",
  BETTER_AUTH_SECRET: "social-provider-contract-secret-at-least-32-characters",
  GOOGLE_CLIENT_ID: "google-client",
  GOOGLE_CLIENT_SECRET: "google-secret",
  GITHUB_CLIENT_ID: "github-client",
  GITHUB_CLIENT_SECRET: "github-secret",
  APPLE_CLIENT_ID: "com.example.web",
  APPLE_TEAM_ID: "TEAM123",
  APPLE_KEY_ID: "KEY123",
  APPLE_PRIVATE_KEY_BASE64: "not-used-by-method-discovery",
  APPLE_APP_BUNDLE_IDENTIFIER: "com.example.app",
};

const all = socialProviderMethods({ ...base, AUTH_SOCIAL_PROVIDERS: "google,github,apple" });
assert.deepEqual(all.map(({ key }) => key), ["google", "github", "apple"]);
assert.ok(all.every(({ enabled }) => enabled));

const deferred = socialProviderMethods({
  ...base,
  AUTH_SOCIAL_PROVIDERS: "google,github,apple",
  GITHUB_CLIENT_SECRET: "",
  APPLE_PRIVATE_KEY_BASE64: "",
});
assert.equal(deferred.find(({ key }) => key === "google")?.enabled, true);
assert.equal(deferred.find(({ key }) => key === "github")?.enabled, false);
assert.equal(deferred.find(({ key }) => key === "apple")?.enabled, false);

assert.deepEqual(
  selectedSocialProviders({ ...base, AUTH_SOCIAL_PROVIDERS: "github,unknown,apple" }),
  ["github", "apple"],
);

const health = new Map([
  ["google", { status: "not-selected", details: { selected: false } }],
  ["github", { status: "ok", details: { selected: true, configured: true } }],
  ["apple", { status: "not-selected", details: { selected: false } }],
]);
assert.equal(socialProviderHealthMatches(new Set(["github"]), health), true);
assert.equal(socialProviderHealthMatches(new Set(["google"]), health), false);

const { privateKey } = await generateKeyPair("ES256", { extractable: true });
const privateKeyPem = await exportPKCS8(privateKey);
const appleSecret = await generateAppleClientSecret({
  clientId: "com.example.web",
  teamId: "TEAM123",
  keyId: "KEY123",
  privateKeyBase64: Buffer.from(privateKeyPem).toString("base64"),
  now: 1_700_000_000,
});
assert.deepEqual(decodeProtectedHeader(appleSecret), { alg: "ES256", kid: "KEY123" });
const appleClaims = decodeJwt(appleSecret);
assert.equal(appleClaims.iss, "TEAM123");
assert.equal(appleClaims.sub, "com.example.web");
assert.equal(appleClaims.aud, "https://appleid.apple.com");
assert.equal(appleClaims.exp - appleClaims.iat, 180 * 24 * 60 * 60);

console.log(JSON.stringify({ ok: true, providers: ["google", "github", "apple"], checks: ["selection", "configured", "deferred", "unknown-provider-rejection", "apple-es256-client-secret", "operations-health-selection"] }, null, 2));
