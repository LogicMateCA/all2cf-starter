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
  "saas.account-security-2fa",
  "saas.auth-hibp",
  "saas.auth-last-login",
  "saas.auth-multi-session",
  "saas.auth-passkey",
  "saas.auth-magic-link",
  "saas.auth-sso",
  "saas.auth-scim",
  "saas.auth-generic-oauth",
  "saas.auth-jwt",
  "saas.auth-bearer",
  "saas.auth-oauth-provider",
  "saas.auth-mcp",
  "saas.auth-agent",
  "saas.auth-device-authorization",
  "saas.auth-openapi",
  "saas.auth-phone",
  "saas.auth-anonymous",
  "saas.auth-google-one-tap",
];
const deferred = [
  "saas.auth-username",
  "saas.auth-ethereum",
  "saas.billing-creem",
  "saas.billing-dodo",
  "saas.billing-commet",
];
const catalogById = new Map(catalog.packs.map((pack) => [pack.id, pack]));
const selections = new Map(
  blueprint.selections.saas.map((selection) => [selection.id, selection]),
);

assert.match(setup, /"saas\.auth-i18n"/u);
assert.match(setup, /const requiredPacks[\s\S]*"saas\.auth-i18n"/u);
assert.equal(selections.get("saas.auth-i18n")?.lifecycle.selected, true);
for (const id of advanced) {
  assert.ok(catalogById.has(id), `${id} missing from catalog`);
  assert.ok(selections.has(id), `${id} missing from blueprint`);
  assert.match(setup, new RegExp(`"${id.replaceAll(".", "\\.")}"`, "u"));
  const directory = id.replace(/^saas\./u, "");
  assert.ok(
    existsSync(path.join(root, "packs/saas", directory, "pack.json")),
    `${id} Pack missing`,
  );
}
for (const id of deferred) {
  assert.ok(!catalogById.has(id), `${id} must remain deferred`);
  assert.ok(!selections.has(id), `${id} must not enter the Blueprint`);
}
function assertEntryContains(blockName, key, values) {
  const block =
    setup.match(
      new RegExp(`const ${blockName}[^=]*= \\{([\\s\\S]*?)\\n\\};`, "u"),
    )?.[1] || "";
  const entry =
    block.match(
      new RegExp(`"${key.replaceAll(".", "\\.")}": \\[([^\\]]*)\\]`, "u"),
    )?.[1] || "";
  for (const value of values)
    assert.match(entry, new RegExp(`"${value.replaceAll(".", "\\.")}"`, "u"));
}
assertEntryContains("identityPackDependencies", "saas.auth-oauth-provider", [
  "saas.auth-jwt",
]);
assertEntryContains(
  "identityPackDependencies",
  "saas.auth-device-authorization",
  ["saas.auth-jwt", "saas.auth-oauth-provider"],
);
assertEntryContains("identityPackDependencies", "saas.auth-mcp", [
  "saas.auth-jwt",
]);
assertEntryContains("identityPackDependencies", "saas.auth-phone", [
  "capability.twilio-sms",
]);
assertEntryContains("identityPackConflicts", "saas.auth-oauth-provider", [
  "saas.auth-mcp",
]);
const apiKeyPlugin = await read(
  "packs/saas/api-keys/templates/api-key-auth-plugin.ts",
);
assert.match(
  apiKeyPlugin,
  /configId:\s*"org-keys"[\s\S]{0,100}references:\s*"organization"/u,
);
assert.match(
  apiKeyPlugin,
  /apiKey\([\s\S]*\],\s*\{ schema \},?\s*\)/u,
  "Multiple API-key configurations must pass schema as the plugin-wide second argument",
);
assert.doesNotMatch(
  await read("packs/saas/api-keys/templates/0007_api_keys.sql"),
  /reference_id[^\n]+references\s+"app_user"/u,
);
const apiKeyOwnershipMigration = await read(
  "packs/saas/api-keys/templates/0008_api_key_reference_ownership.sql",
);
assert.match(
  apiKeyOwnershipMigration,
  /config_id = 'user-keys'[\s\S]*config_id = 'org-keys'/u,
);
assert.match(
  await read(
    "packs/saas/team-organizations/templates/organization-auth-plugin.ts",
  ),
  /apiKey:\s*\[\s*"create",\s*"read",\s*"update",\s*"delete",?\s*\]/u,
);
assert.match(
  await read("packs/saas/auth-magic-link/templates/magic-link-auth-plugin.ts"),
  /escapeHtml\(url\)/u,
);
assert.equal(catalogById.get("saas.auth-agent")?.status, "experimental");
const oauthProviderPack = await json(
  "packs/saas/auth-oauth-provider/pack.json",
);
const devicePack = await json("packs/saas/auth-device-authorization/pack.json");
const mcpPack = await json("packs/saas/auth-mcp/pack.json");
const phonePack = await json("packs/saas/auth-phone/pack.json");
assert.deepEqual(oauthProviderPack.requiresPacks, ["saas.auth-jwt"]);
assert.deepEqual(oauthProviderPack.conflictsPacks, ["saas.auth-mcp"]);
assert.deepEqual(devicePack.requiresPacks, [
  "saas.auth-jwt",
  "saas.auth-oauth-provider",
]);
assert.deepEqual(mcpPack.requiresPacks, ["saas.auth-jwt"]);
assert.deepEqual(mcpPack.conflictsPacks, ["saas.auth-oauth-provider"]);
assert.deepEqual(phonePack.requiresPacks, ["capability.twilio-sms"]);
const agentPlugin = await read(
  "packs/saas/auth-agent/templates/agent-auth-plugin.ts",
);
assert.match(agentPlugin, /jtiCacheStorage:\s*"secondary-storage"/u);
assert.match(agentPlugin, /jwksCacheStorage:\s*"secondary-storage"/u);
assert.ok(
  existsSync(
    path.join(
      root,
      "packs/saas/auth-agent/templates/0002_agent_secondary_storage.sql",
    ),
  ),
);

console.log(
  JSON.stringify(
    {
      ok: true,
      betterAuth: "1.7.2",
      requiredFoundation: ["saas.auth-i18n"],
      optionalAdvancedPacks: advanced.length,
      deferred,
    },
    null,
    2,
  ),
);
