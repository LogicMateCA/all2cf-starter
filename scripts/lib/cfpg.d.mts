export const CFPG_CONNECTOR_PACKAGE: "@all2cf/database-connect";
export const CFPG_CONNECTOR_VERSION: "0.2.0-rc.2";
export const CFPG_INSTALL_API: "https://app.all2cf.com";

export type CfpgConnection = {
  connectCommand: string;
  databaseId: string;
  databaseWorker: string;
  entrypoint: "All2CFDatabase";
  package: "@all2cf/database-connect";
  version: "0.2.0-rc.2";
  sha256: string;
  alias: "@all2cf/database-connect/pg";
};

export function parseCfpgConnectCommand(value: unknown): { command: string; databaseId: string; version: string } | null;
export function resolveCfpgConnectCommand(value: unknown, fetchImpl?: typeof fetch): Promise<CfpgConnection | null>;
export function validateCfpgConnection(connection: CfpgConnection | null | undefined, label: string): string[];
export function databaseProviderForEnvironment(databasePolicy: {
  provider?: "native-postgresql" | "cfpg";
  transports?: Partial<Record<"development" | "production", "native-postgresql" | "cfpg">>;
} | null | undefined, environment: "development" | "production"): "native-postgresql" | "cfpg";
export function configureDatabaseRuntime(model: Record<string, any>, input: {
  provider: "native-postgresql" | "cfpg";
  environment: "development" | "production";
  connection: CfpgConnection | null;
  previous?: Record<string, any> | null;
  label?: string;
}): Record<string, any>;
