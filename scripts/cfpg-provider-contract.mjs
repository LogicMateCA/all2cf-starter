import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CFPG_CONNECTOR_PACKAGE,
  CFPG_CONNECTOR_VERSION,
  configureDatabaseRuntime,
  parseCfpgConnectCommand,
  resolveCfpgConnectCommand,
  validateCfpgConnection,
} from "./lib/cfpg.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const blueprint = JSON.parse(await readFile(path.join(root, "starter.blueprint.json"), "utf8"));
const saved = blueprint.providers.database.cfpg.development;

assert.equal(blueprint.providers.database.provider, "native-postgresql");
assert.deepEqual(validateCfpgConnection(saved, "development"), []);
assert.deepEqual(parseCfpgConnectCommand(saved.connectCommand), {
  command: saved.connectCommand,
  databaseId: saved.databaseId,
  version: CFPG_CONNECTOR_VERSION,
});
assert.throws(
  () => parseCfpgConnectCommand("npx @all2cf/database-connect@latest db_bad"),
  /exact npx/u,
);

const resolved = await resolveCfpgConnectCommand(saved.connectCommand, async () => ({
  ok: true,
  status: 200,
  json: async () => ({
    descriptor: {
      schemaVersion: 2,
      databaseId: saved.databaseId,
      databaseWorker: { name: saved.databaseWorker, entrypoint: "All2CFDatabase" },
      binding: { binding: "ALL2CF_DATABASE", service: saved.databaseWorker, entrypoint: "All2CFDatabase", remote: true },
      client: { package: CFPG_CONNECTOR_PACKAGE, version: CFPG_CONNECTOR_VERSION, sha256: saved.sha256, alias: `${CFPG_CONNECTOR_PACKAGE}/pg` },
    },
  }),
}));
assert.deepEqual(resolved, saved);

const nativeHyperdrive = [{ binding: "HYPERDRIVE", id: "development-hyperdrive" }];
const model = { vars: {}, hyperdrive: structuredClone(nativeHyperdrive) };
const receipt = configureDatabaseRuntime(model, {
  provider: "cfpg",
  environment: "development",
  connection: saved,
  label: "development",
});
assert.equal(model.vars.DATABASE_PROVIDER, "cfpg");
assert.equal(model.alias.pg, `${CFPG_CONNECTOR_PACKAGE}/pg`);
assert.equal(model.services[0].binding, "ALL2CF_DATABASE");
assert.equal(model.services[0].service, saved.databaseWorker);
assert.equal(model.hyperdrive, undefined);
assert.deepEqual(receipt.hyperdrive, nativeHyperdrive);

const nativeReceipt = configureDatabaseRuntime(model, {
  provider: "native-postgresql",
  environment: "development",
  connection: null,
  previous: receipt,
  label: "development",
});
assert.equal(model.vars.DATABASE_PROVIDER, "native-postgresql");
assert.equal(model.alias, undefined);
assert.equal(model.services, undefined);
assert.deepEqual(model.hyperdrive, nativeHyperdrive);
assert.deepEqual(nativeReceipt, { provider: "native-postgresql" });

console.log(JSON.stringify({
  ok: true,
  providerChoices: ["native-postgresql", "cfpg"],
  connector: `${CFPG_CONNECTOR_PACKAGE}@${CFPG_CONNECTOR_VERSION}`,
  databaseId: saved.databaseId,
  serviceBinding: "ALL2CF_DATABASE",
  nativeRestoreVerified: true,
}, null, 2));
