export const CFPG_CONNECTOR_PACKAGE = "@all2cf/database-connect";
export const CFPG_CONNECTOR_VERSION = "0.2.0-rc.2";
export const CFPG_INSTALL_API = "https://app.all2cf.com";

const commandPattern = /^npx\s+@all2cf\/database-connect@([^\s]+)\s+(db_[a-f0-9]{32})$/u;

export function parseCfpgConnectCommand(value) {
  const command = String(value || "").trim().replaceAll(/\s+/gu, " ");
  if (!command) return null;
  const match = commandPattern.exec(command);
  if (!match)
    throw new Error(
      "CFPG requires the exact npx @all2cf/database-connect@<version> db_<id> command shown by All2CF Database.",
    );
  if (match[1] !== CFPG_CONNECTOR_VERSION)
    throw new Error(
      `CFPG command must use ${CFPG_CONNECTOR_PACKAGE}@${CFPG_CONNECTOR_VERSION}.`,
    );
  return {
    command: `npx ${CFPG_CONNECTOR_PACKAGE}@${match[1]} ${match[2]}`,
    databaseId: match[2],
    version: match[1],
  };
}

export async function resolveCfpgConnectCommand(value, fetchImpl = fetch) {
  const parsed = parseCfpgConnectCommand(value);
  if (!parsed) return null;
  const response = await fetchImpl(
    new URL(`/api/database/install/${encodeURIComponent(parsed.databaseId)}`, CFPG_INSTALL_API),
    { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(30_000) },
  );
  const body = await response.json().catch(() => ({}));
  const descriptor = body?.descriptor;
  if (!response.ok || !descriptor)
    throw new Error(body?.error || `CFPG install description returned HTTP ${response.status}.`);
  if (
    descriptor.schemaVersion !== 2 ||
    descriptor.databaseId !== parsed.databaseId ||
    descriptor.databaseWorker?.entrypoint !== "All2CFDatabase" ||
    descriptor.binding?.binding !== "ALL2CF_DATABASE" ||
    descriptor.binding?.service !== descriptor.databaseWorker?.name ||
    descriptor.binding?.entrypoint !== "All2CFDatabase" ||
    descriptor.binding?.remote !== true ||
    descriptor.client?.package !== CFPG_CONNECTOR_PACKAGE ||
    descriptor.client?.version !== parsed.version ||
    descriptor.client?.alias !== `${CFPG_CONNECTOR_PACKAGE}/pg` ||
    !/^[a-f0-9]{64}$/u.test(descriptor.client?.sha256 || "")
  )
    throw new Error("CFPG install description is invalid or incompatible with this Starter.");
  return {
    connectCommand: parsed.command,
    databaseId: parsed.databaseId,
    databaseWorker: descriptor.databaseWorker.name,
    entrypoint: descriptor.databaseWorker.entrypoint,
    package: descriptor.client.package,
    version: descriptor.client.version,
    sha256: descriptor.client.sha256,
    alias: descriptor.client.alias,
  };
}

export function validateCfpgConnection(connection, label) {
  if (connection === null) return [];
  const failures = [];
  let parsed;
  try {
    parsed = parseCfpgConnectCommand(connection?.connectCommand);
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
    return failures;
  }
  if (!parsed) return [`${label} must contain a CFPG connection command or null`];
  const expected = {
    databaseId: parsed.databaseId,
    package: CFPG_CONNECTOR_PACKAGE,
    version: CFPG_CONNECTOR_VERSION,
    alias: `${CFPG_CONNECTOR_PACKAGE}/pg`,
    entrypoint: "All2CFDatabase",
  };
  for (const [key, value] of Object.entries(expected))
    if (connection?.[key] !== value)
      failures.push(`${label}.${key} must be ${value}`);
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(connection?.databaseWorker || ""))
    failures.push(`${label}.databaseWorker is invalid`);
  if (!/^[a-f0-9]{64}$/u.test(connection?.sha256 || ""))
    failures.push(`${label}.sha256 is invalid`);
  return failures;
}

export function configureDatabaseRuntime(model, input) {
  const previous = input.previous || null;
  const label = input.label || "Wrangler configuration";
  if (previous?.provider === "cfpg") {
    if (model.alias?.pg !== previous.alias)
      throw new Error(`${label} changed the materializer-owned CFPG pg alias`);
    delete model.alias.pg;
    if (!Object.keys(model.alias).length) delete model.alias;
    const serviceIndex = (model.services || []).findIndex(
      (entry) => entry.binding === "ALL2CF_DATABASE",
    );
    const service = serviceIndex >= 0 ? model.services[serviceIndex] : null;
    if (!service || service.service !== previous.service || service.entrypoint !== "All2CFDatabase")
      throw new Error(`${label} changed the materializer-owned CFPG Service Binding`);
    model.services.splice(serviceIndex, 1);
    if (!model.services.length) delete model.services;
    if (previous.hyperdrive?.length) model.hyperdrive = structuredClone(previous.hyperdrive);
  }
  model.vars ||= {};
  const receipt = { provider: input.provider };
  if (input.provider === "cfpg") {
    const connection = input.connection;
    if (!connection) throw new Error(`CFPG ${input.environment} connection is missing`);
    if (model.alias?.pg && model.alias.pg !== connection.alias)
      throw new Error(`${label} already aliases pg to ${model.alias.pg}`);
    model.alias = { ...(model.alias || {}), pg: connection.alias };
    if ((model.services || []).some((entry) => entry.binding === "ALL2CF_DATABASE"))
      throw new Error(`${label} already owns ALL2CF_DATABASE`);
    model.services = [
      ...(model.services || []),
      {
        binding: "ALL2CF_DATABASE",
        service: connection.databaseWorker,
        entrypoint: connection.entrypoint,
        remote: true,
      },
    ];
    const hyperdrive = structuredClone(model.hyperdrive || []);
    delete model.hyperdrive;
    model.vars.DATABASE_PROVIDER = "cfpg";
    Object.assign(receipt, {
      alias: connection.alias,
      service: connection.databaseWorker,
      hyperdrive,
    });
  } else {
    model.vars.DATABASE_PROVIDER = "native-postgresql";
  }
  return receipt;
}
