import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CFPG_CONNECTOR_PACKAGE,
  CFPG_CONNECTOR_VERSION,
  configureDatabaseRuntime,
  databaseProviderForEnvironment,
  parseCfpgConnectCommand,
  resolveCfpgConnectCommand,
  validateCfpgConnection,
} from "./lib/cfpg.mjs";
import { validateAssemblyContracts } from "./lib/assembly.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const blueprint = JSON.parse(await readFile(path.join(root, "starter.blueprint.json"), "utf8"));
const manifest = JSON.parse(await readFile(path.join(root, "starter.manifest.json"), "utf8"));
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const nativeMigrationSource = await readFile(path.join(root, "scripts/database-migrate.mjs"), "utf8");
const catalog = JSON.parse(await readFile(path.join(root, "catalog/catalog.json"), "utf8"));
const designCatalog = JSON.parse(await readFile(path.join(root, "design/catalog.json"), "utf8"));
const pageCatalog = JSON.parse(await readFile(path.join(root, "pages/catalog.json"), "utf8"));
const stylekit = JSON.parse(await readFile(path.join(root, "design/stylekit", blueprint.stylekit.slug, "snapshot.json"), "utf8"));
const saved = blueprint.providers.database.cfpg.development;

assert.equal(packageJson.scripts["db:migrate:status"], "node scripts/database-migrate.mjs --environment=development");
assert.equal(packageJson.scripts["db:migrate:dev"], "node scripts/database-migrate.mjs --environment=development --apply");
assert.equal(packageJson.scripts["db:migrate:production:status"], "node scripts/database-migrate.mjs --environment=production");
assert.equal(packageJson.scripts["db:migrate:production"], "node scripts/database-migrate.mjs --environment=production --apply");
assert.match(nativeMigrationSource, /import \{ Client \} from "pg"/u);
assert.doesNotMatch(nativeMigrationSource, /all2cf\/database-connect|ALL2CF_DATABASE|cfpg/iu);

const assemblyFailures = (database, options = {}) => validateAssemblyContracts(
  manifest,
  { ...structuredClone(blueprint), providers: { ...structuredClone(blueprint.providers), database } },
  catalog,
  designCatalog,
  pageCatalog,
  stylekit,
  options,
);

assert.equal(blueprint.providers.database.provider, "native-postgresql");
assert.deepEqual(blueprint.providers.database.transports, {
  development: "native-postgresql",
  production: "native-postgresql",
});
assert.equal(databaseProviderForEnvironment(blueprint.providers.database, "development"), "native-postgresql");
assert.equal(databaseProviderForEnvironment({ provider: "cfpg" }, "production"), "cfpg");
assert.equal(databaseProviderForEnvironment({ provider: "cfpg", transports: { development: "native-postgresql" } }, "development"), "native-postgresql");
assert.equal(databaseProviderForEnvironment({ provider: "cfpg", transports: { development: "native-postgresql" } }, "production"), "cfpg");
assert.throws(
  () => databaseProviderForEnvironment({ transports: { development: "invalid" } }, "development"),
  /invalid/u,
);
assert.match(
  assemblyFailures({ ...structuredClone(blueprint.providers.database), transports: { development: "invalid", production: "native-postgresql" } }).join("\n"),
  /development is invalid/u,
);
assert.deepEqual(assemblyFailures({ ...structuredClone(blueprint.providers.database), transports: { development: "native-postgresql", production: "native-postgresql" } }), []);
assert.deepEqual(assemblyFailures({ ...structuredClone(blueprint.providers.database), transports: { development: "cfpg", production: "native-postgresql" } }), []);
const deferredDevelopment = { ...structuredClone(blueprint.providers.database), transports: { development: "cfpg", production: "native-postgresql" }, cfpg: { development: null, production: null } };
assert.match(assemblyFailures(deferredDevelopment).join("\n"), /requires its connection descriptor/u);
assert.deepEqual(assemblyFailures(deferredDevelopment, { allowDeferredCfpg: true }), []);
const distinctProduction = {
  ...structuredClone(saved),
  connectCommand: saved.connectCommand.replace(saved.databaseId, "db_11111111111111111111111111111111"),
  databaseId: "db_11111111111111111111111111111111",
  databaseWorker: "database-worker-production",
};
assert.deepEqual(assemblyFailures({ ...structuredClone(blueprint.providers.database), transports: { development: "cfpg", production: "cfpg" }, cfpg: { development: saved, production: distinctProduction } }), []);
assert.match(
  assemblyFailures({ ...structuredClone(blueprint.providers.database), transports: { development: "cfpg", production: "cfpg" }, cfpg: { development: saved, production: saved } }).join("\n"),
  /must be different/u,
);
const legacyDatabase = structuredClone(blueprint.providers.database);
delete legacyDatabase.transports;
legacyDatabase.provider = "native-postgresql";
assert.deepEqual(assemblyFailures(legacyDatabase), []);
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
  environmentIsolationVerified: true,
  nativePostgresCommandsLocked: true,
}, null, 2));
