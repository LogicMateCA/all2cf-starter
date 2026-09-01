import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFile(path.join(root, file), "utf8");
const json = async (file) => JSON.parse(await read(file));
const catalog = await json("catalog/catalog.json");
const blueprint = await json("starter.blueprint.json");
const setup = await read("apps/web/src/components/setup-page.tsx");

const advanced = [
  "saas.account-security-2fa", "saas.auth-hibp", "saas.auth-last-login",
  "saas.auth-multi-session", "saas.auth-passkey", "saas.auth-magic-link",
  "saas.auth-sso", "saas.auth-scim", "saas.auth-generic-oauth", "saas.auth-jwt",
  "saas.auth-bearer", "saas.auth-oauth-provider", "saas.auth-mcp", "saas.auth-agent",
  "saas.auth-device-authorization", "saas.auth-openapi", "saas.auth-phone",
  "saas.auth-anonymous", "saas.auth-google-one-tap",
];
const deferred = ["saas.auth-username", "saas.auth-ethereum", "saas.billing-creem", "saas.billing-dodo", "saas.billing-commet"];
const catalogById = new Map(catalog.packs.map((pack) => [pack.id, pack]));
const selections = new Map(blueprint.selections.saas.map((selection) => [selection.id, selection]));

assert.match(setup, /"saas\.auth-i18n"/u);
assert.match(setup, /const requiredPacks[\s\S]*"saas\.auth-i18n"/u);
assert.equal(selections.get("saas.auth-i18n")?.lifecycle.selected, true);
for (const id of advanced) {
  assert.ok(catalogById.has(id), `${id} missing from catalog`);
  assert.ok(selections.has(id), `${id} missing from blueprint`);
  assert.match(setup, new RegExp(`"${id.replaceAll(".", "\\.")}"`, "u"));
  const directory = id.replace(/^saas\./u, "");
  assert.ok(existsSync(path.join(root, "packs/saas", directory, "pack.json")), `${id} Pack missing`);
}
for (const id of deferred) {
  assert.ok(!catalogById.has(id), `${id} must remain deferred`);
  assert.ok(!selections.has(id), `${id} must not enter the Blueprint`);
}
assert.match(setup, /"saas\.auth-oauth-provider": \["saas\.auth-jwt"\]/u);
assert.match(setup, /"saas\.auth-device-authorization": \["saas\.auth-jwt", "saas\.auth-oauth-provider"\]/u);
assert.match(setup, /"saas\.auth-mcp": \["saas\.auth-jwt"\]/u);
assert.match(setup, /"saas\.auth-phone": \["capability\.twilio-sms"\]/u);
assert.match(setup, /"saas\.auth-oauth-provider": \["saas\.auth-mcp"\]/u);
const apiKeyPlugin = await read("packs/saas/api-keys/templates/api-key-auth-plugin.ts");
assert.match(apiKeyPlugin, /configId: "org-keys", references: "organization"/u);
assert.match(apiKeyPlugin, /apiKey\(\[[\s\S]*\], \{ schema \}\)/u, "Multiple API-key configurations must pass schema as the plugin-wide second argument");
assert.match(await read("packs/saas/team-organizations/templates/organization-auth-plugin.ts"), /apiKey: \["create", "read", "update", "delete"\]/u);
assert.match(await read("packs/saas/auth-magic-link/templates/magic-link-auth-plugin.ts"), /escapeHtml\(url\)/u);
assert.equal(catalogById.get("saas.auth-agent")?.status, "experimental");

console.log(JSON.stringify({ ok: true, betterAuth: "1.7.2", requiredFoundation: ["saas.auth-i18n"], optionalAdvancedPacks: advanced.length, deferred }, null, 2));
