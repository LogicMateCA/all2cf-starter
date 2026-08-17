import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv, renderEnv } from "./lib/env-profile.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(path.join(root, "starter.config.json"), "utf8"));
const providers = JSON.parse(await readFile(path.join(root, "profiles/providers.json"), "utf8"));
const profilePath = process.env.STARTER_DEV_PROFILE_PATH || providers.defaultPath;
const profile = parseEnv(await readFile(profilePath, "utf8"));
let existing = new Map();
try { existing = parseEnv(await readFile(path.join(root, ".dev.vars"), "utf8")); } catch {}
const values = new Map();

for (const name of providers.shared) values.set(name, profile.get(name) || existing.get(name) || "");
for (const name of providers.projectLocal || []) values.set(name, existing.get(name) || "");

for (const name of providers.generatedPerProject) {
  values.set(name, existing.get(name) || randomBytes(32).toString("base64url"));
}
values.set("APP_ENV", "development");

if (values.get("CLOUDFLARE_ACCOUNT_ID") && values.get("CLOUDFLARE_ACCOUNT_ID") !== config.cloudflare.accountId) throw new Error("Provider profile and starter.config.json use different Cloudflare accounts");
if (values.get("CLOUDFLARE_ZONE_ID") && values.get("CLOUDFLARE_ZONE_ID") !== config.cloudflare.zoneId) throw new Error("Provider profile and starter.config.json use different Cloudflare zones");

const developmentPassword = existing.get("POSTGRES_PASSWORD") || randomBytes(32).toString("base64url");
const productionPassword = (() => {
  try { return new URL(existing.get("STARTER_PRODUCTION_DATABASE_URL") || "").password; }
  catch { return ""; }
})() || randomBytes(32).toString("base64url");
const databaseUrl = (database, password) => {
  const url = new URL("postgresql://localhost");
  url.username = database.user;
  url.password = password;
  url.hostname = database.host;
  url.port = String(database.port);
  url.pathname = `/${database.database}`;
  url.searchParams.set("sslmode", "require");
  return url.toString();
};

const assertDatabaseIdentity = (name, rawUrl, database, strictNetwork) => {
  if (!rawUrl) return;
  const url = new URL(rawUrl);
  const port = Number(url.port || 5432);
  const developmentNetworkMatches = (url.hostname === database.container && port === 5432) || ([database.host, "localhost", "127.0.0.1"].includes(url.hostname) && port === database.port);
  const networkMatches = strictNetwork ? url.hostname === database.host && port === database.port : developmentNetworkMatches;
  if (decodeURIComponent(url.username) !== database.user || url.pathname.slice(1) !== database.database || !networkMatches) {
    throw new Error(`${name} does not match starter.config.json; remove the copied local environment file or provide the intended database URL`);
  }
};

assertDatabaseIdentity("DATABASE_URL", existing.get("DATABASE_URL"), config.development.database, false);
assertDatabaseIdentity("STARTER_PRODUCTION_DATABASE_URL", existing.get("STARTER_PRODUCTION_DATABASE_URL"), config.production.database, true);

values.set("POSTGRES_DB", config.development.database.database);
values.set("POSTGRES_USER", config.development.database.user);
values.set("POSTGRES_PASSWORD", developmentPassword);
values.set("DATABASE_URL", existing.get("DATABASE_URL") || databaseUrl(config.development.database, developmentPassword));
values.set("STARTER_PRODUCTION_DATABASE_URL", existing.get("STARTER_PRODUCTION_DATABASE_URL") || databaseUrl(config.production.database, productionPassword));
values.set("BETTER_AUTH_URL", `https://${config.development.domain}`);

const serverNames = [...providers.shared, ...(providers.projectLocal || []), ...providers.generatedPerProject, "APP_ENV", "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD", "DATABASE_URL", "STARTER_PRODUCTION_DATABASE_URL", "BETTER_AUTH_URL"];
await writeFile(path.join(root, ".dev.vars"), renderEnv(serverNames, values), { mode: 0o600 });

const webValues = new Map([
  ["VITE_API_BASE_URL", `https://${config.development.domain}`],
  ["VITE_STRIPE_PUBLISHABLE_KEY", values.get("STRIPE_PUBLISHABLE_KEY") || ""],
  ["VITE_GOOGLE_CLIENT_ID", values.get("GOOGLE_CLIENT_ID") || ""],
]);
await writeFile(path.join(root, "apps/web/.env.local"), renderEnv([...webValues.keys()], webValues), { mode: 0o600 });

const mobileRoot = path.join(root, "apps/mobile");
await mkdir(mobileRoot, { recursive: true });
const mobileValues = new Map([
  ["EXPO_PUBLIC_API_URL", `https://${config.development.domain}`],
  ["EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY", values.get("STRIPE_PUBLISHABLE_KEY") || ""],
  ["EXPO_PUBLIC_GOOGLE_CLIENT_ID", values.get("GOOGLE_CLIENT_ID") || ""],
]);
await writeFile(path.join(mobileRoot, ".env.local"), renderEnv([...mobileValues.keys()], mobileValues), { mode: 0o600 });

console.log(JSON.stringify({ ok: true, profilePath, serverVariables: serverNames.length, webVariables: webValues.size, mobileVariables: mobileValues.size }, null, 2));
