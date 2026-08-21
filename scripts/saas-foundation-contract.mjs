import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relativePath) =>
  JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
const exists = async (relativePath) => {
  try {
    await access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
};

const [sources, sourceSchema, matrix, matrixSchema, catalog, blueprint] =
  await Promise.all([
    readJson("catalog/saas-sources.json"),
    readJson("schemas/saas-source-manifest.schema.json"),
    readJson("catalog/saas-capabilities.json"),
    readJson("schemas/saas-capability-matrix.schema.json"),
    readJson("catalog/catalog.json"),
    readJson("starter.blueprint.json"),
  ]);

const ajv = new Ajv2020({ allErrors: true, strict: false });
const failures = [];
for (const [name, schema, value] of [
  ["SaaS source manifest", sourceSchema, sources],
  ["SaaS capability matrix", matrixSchema, matrix],
]) {
  const validate = ajv.compile(schema);
  if (!validate(value))
    failures.push(
      `${name} schema failed: ${ajv.errorsText(validate.errors, { separator: "; " })}`,
    );
}

const expectedSources = {
  "open-saas": {
    revision: "cbd30162b05d798b3a3f955ab5781940b67bec89",
    licenseSha256:
      "0cb2467c329d270353b52ae04211305761553297369c85435a1a0b9ae5328fa8",
    auditRoot: "/tmp/open-saas-audit",
  },
  saasboard: {
    revision: "6cb1b4c84aec1adb8cfbc4df6e38b6717ca50382",
    licenseSha256:
      "0d6cff801da882cb58a2bbb732a1ec0b40c41dd3d31c3e19879c9b5059ab44f7",
    auditRoot: "/tmp/saasboard-audit",
  },
  lastsaas: {
    revision: "c692923ed98ee503f2de61180ff530a5b05f71a6",
    licenseSha256:
      "44e4d8cecd64c3f868d7ad84af4133bf05b741ca21cb7fb3a113989af0b91edc",
    auditRoot: "/tmp/lastsaas-audit",
  },
};
const sourceIds = new Set();
let externalSourcesVerified = 0;
for (const source of sources.sources) {
  if (sourceIds.has(source.id))
    failures.push(`Duplicate SaaS source ${source.id}`);
  sourceIds.add(source.id);
  const expected = expectedSources[source.id];
  if (!expected) failures.push(`Unexpected SaaS source ${source.id}`);
  else {
    if (source.revision !== expected.revision)
      failures.push(`${source.id} must pin revision ${expected.revision}`);
    if (source.licenseSha256 !== expected.licenseSha256)
      failures.push(`${source.id} license hash is not pinned`);
    try {
      const license = await readFile(path.join(expected.auditRoot, "LICENSE"));
      const hash = createHash("sha256").update(license).digest("hex");
      if (hash !== expected.licenseSha256)
        failures.push(`${source.id} external license hash changed`);
      for (const accepted of source.accepted)
        for (const sourcePath of accepted.sourcePaths)
          await access(path.join(expected.auditRoot, sourcePath));
      externalSourcesVerified += 1;
    } catch (error) {
      if (process.env.SAAS_DONOR_SOURCE_REQUIRED === "1")
        failures.push(
          `${source.id} pinned donor source unavailable: ${error.message}`,
        );
    }
  }
  for (const accepted of source.accepted)
    for (const targetPath of accepted.targetPaths)
      if (!(await exists(targetPath)))
        failures.push(`${source.id} target does not exist: ${targetPath}`);
}
for (const id of Object.keys(expectedSources))
  if (!sourceIds.has(id)) failures.push(`Missing SaaS source ${id}`);

const capabilityIds = new Set();
for (const capability of matrix.capabilities) {
  if (capabilityIds.has(capability.id))
    failures.push(`Duplicate SaaS capability ${capability.id}`);
  capabilityIds.add(capability.id);
  for (const sourceId of capability.sourceIds)
    if (!sourceIds.has(sourceId))
      failures.push(`${capability.id} references unknown source ${sourceId}`);
  if (capability.delivery === "planned" && capability.status !== "planned")
    failures.push(`${capability.id} planned delivery must remain planned`);
  if (capability.status === "planned" && capability.delivery !== "planned")
    failures.push(`${capability.id} planned status must use planned delivery`);
  if (
    [
      "implemented",
      "local-verified",
      "development-verified",
      "production-released",
    ].includes(capability.status) &&
    capability.verification.length === 0
  )
    failures.push(
      `${capability.id} implemented status needs verification evidence`,
    );
}

for (const required of [
  "identity.core",
  "shell.product",
  "account.settings",
  "notifications.inbox",
  "admin.framework",
  "support.tickets",
  "audit.platform",
  "docs.public",
])
  if (!capabilityIds.has(required))
    failures.push(`Missing baseline SaaS capability ${required}`);

const foundation = catalog.presets.find(({ id }) => id === "saas-foundation");
if (!foundation)
  failures.push("Catalog must provide the saas-foundation preset");
if (blueprint.preset !== "saas-foundation")
  failures.push("Starter Blueprint must begin from saas-foundation");
if (
  !blueprint.productIntent?.summary ||
  !blueprint.productIntent?.audiences?.length ||
  !blueprint.productIntent?.coreObjects?.length ||
  !blueprint.productIntent?.tenantModel ||
  !blueprint.productIntent?.chargingModel
)
  failures.push(
    "Starter Blueprint must record product summary, audiences, core objects, tenant model, and charging model",
  );

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      sourceCount: sources.sources.length,
      externalSourcesVerified,
      capabilityCount: matrix.capabilities.length,
      preset: blueprint.preset,
      productIntent: blueprint.productIntent,
      failures,
    },
    null,
    2,
  ),
);
if (failures.length) process.exitCode = 1;
