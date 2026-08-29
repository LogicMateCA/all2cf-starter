import { Client, Pool } from "pg";

export type RuntimeDatabaseEnv = {
  DATABASE_PROVIDER?: string;
  HYPERDRIVE?: { connectionString: string };
};

function connectionOptions(env: RuntimeDatabaseEnv, applicationName: string) {
  if (env.DATABASE_PROVIDER === "cfpg")
    return { application_name: applicationName };
  if (!env.HYPERDRIVE?.connectionString)
    throw new Error("Native PostgreSQL requires the HYPERDRIVE binding.");
  return {
    connectionString: env.HYPERDRIVE.connectionString,
    application_name: applicationName,
  };
}

export function createDatabasePool(
  env: RuntimeDatabaseEnv,
  applicationName: string,
  max = 2,
) {
  return new Pool({ ...connectionOptions(env, applicationName), max });
}

export function createDatabaseClient(
  env: RuntimeDatabaseEnv,
  applicationName: string,
) {
  return new Client(connectionOptions(env, applicationName));
}
