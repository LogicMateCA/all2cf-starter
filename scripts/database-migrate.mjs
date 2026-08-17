import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { parseEnv } from "./lib/env-profile.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apply = process.argv.includes("--apply");
const environmentArgument = process.argv.find((value) => value.startsWith("--environment="))?.split("=", 2)[1] || "development";
if (!new Set(["development", "production"]).has(environmentArgument)) throw new Error("migration environment must be development or production");
const environment = environmentArgument;
const config = JSON.parse(await readFile(path.join(root, "starter.config.json"), "utf8"));
const values = parseEnv(await readFile(path.join(root, ".dev.vars"), "utf8"));
const source = new URL(values.get(environment === "production" ? "STARTER_PRODUCTION_DATABASE_URL" : "DATABASE_URL") || "");
const target = config[environment].database;
const client = new Client({
  host: target.host,
  port: target.port,
  user: decodeURIComponent(source.username),
  password: decodeURIComponent(source.password),
  database: target.database,
  ssl: { rejectUnauthorized: false },
  application_name: `${config.project.slug}-${environment}-migration`,
});

const migrationRoot = path.join(root, "db/migrations");
const names = (await readdir(migrationRoot)).filter((name) => /^\d+.*\.sql$/u.test(name)).sort();
const migrations = await Promise.all(names.map(async (name) => {
  const sql = await readFile(path.join(migrationRoot, name), "utf8");
  return { name, sql, checksum: createHash("sha256").update(sql).digest("hex") };
}));

await client.connect();
try {
  await client.query("select pg_advisory_lock(hashtext($1))", [`${config.project.slug}:schema-migrations`]);
  await client.query(`create table if not exists app_schema_migration (file_name text primary key, checksum text not null, applied_at timestamptz not null default current_timestamp)`);
  const applied = new Map((await client.query("select file_name, checksum, applied_at from app_schema_migration order by file_name")).rows.map((row) => [row.file_name, row]));
  const pending = [];
  for (const migration of migrations) {
    const existing = applied.get(migration.name);
    if (existing && existing.checksum !== migration.checksum) throw new Error(`Applied migration ${migration.name} checksum changed`);
    if (!existing) pending.push(migration);
  }

  if (apply) {
    for (const migration of pending) {
      await client.query("begin");
      try {
        await client.query(migration.sql);
        await client.query("insert into app_schema_migration (file_name, checksum) values ($1, $2)", [migration.name, migration.checksum]);
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  }

  const status = (await client.query("select file_name, checksum, applied_at from app_schema_migration order by file_name")).rows;
  console.log(JSON.stringify({ ok: true, environment, database: target.database, mode: apply ? "apply" : "status", pending: apply ? [] : pending.map(({ name, checksum }) => ({ name, checksum })), applied: status }, null, 2));
} finally {
  await client.query("select pg_advisory_unlock(hashtext($1))", [`${config.project.slug}:schema-migrations`]).catch(() => undefined);
  await client.end();
}
