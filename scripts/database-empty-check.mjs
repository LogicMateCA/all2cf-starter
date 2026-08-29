import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { parseEnv } from "./lib/env-profile.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(path.join(root, "starter.config.json"), "utf8"));
const values = parseEnv(await readFile(path.join(root, ".dev.vars"), "utf8"));
const requested = process.argv.find((value) => value.startsWith("--environment="))?.split("=", 2)[1] || "all";
const environments = requested === "all" ? ["development", "production"] : [requested];
if (environments.some((environment) => !new Set(["development", "production"]).has(environment))) throw new Error("environment must be development, production, or all");

const productTables = ["app_user", "app_session", "app_account", "app_verification", "app_auth_rate_limit", "app_auth_email_outbox"];
const results = [];

for (const environment of environments) {
  const source = new URL(values.get(environment === "production" ? "STARTER_PRODUCTION_DATABASE_URL" : "DATABASE_URL") || "");
  const target = config[environment].database;
  const client = new Client({
    host: target.host,
    port: target.port,
    user: decodeURIComponent(source.username),
    password: decodeURIComponent(source.password),
    database: target.database,
    ssl: { rejectUnauthorized: false },
    application_name: `${config.project.slug}-${environment}-empty-check`,
  });
  await client.connect();
  try {
    const counts = {};
    for (const table of productTables) {
      const exists = (await client.query("select to_regclass($1) is not null as exists", [`public.${table}`])).rows[0]?.exists;
      counts[table] = exists ? Number((await client.query(`select count(*)::int as count from "${table}"`)).rows[0]?.count || 0) : 0;
    }
    const totalRows = Object.values(counts).reduce((sum, count) => sum + count, 0);
    results.push({ environment, database: target.database, empty: totalRows === 0, totalRows, counts });
  } finally {
    await client.end();
  }
}

const ok = results.every(({ empty }) => empty);
console.log(JSON.stringify({ ok, results }, null, 2));
if (!ok) process.exitCode = 1;
