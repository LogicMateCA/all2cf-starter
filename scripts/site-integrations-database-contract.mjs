import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const connectionString = process.env.STARTER_SITE_INTEGRATIONS_DATABASE_URL?.trim();
if (!connectionString) throw new Error("STARTER_SITE_INTEGRATIONS_DATABASE_URL is required");
const client = new Client({ connectionString, ssl: false, application_name: "starter-site-integrations-contract" });
await client.connect();
try {
  const migrationRoot = path.join(root, "db/migrations");
  for (const name of (await readdir(migrationRoot)).filter((name) => /^\d+.*\.sql$/u.test(name)).sort())
    await client.query(await readFile(path.join(migrationRoot, name), "utf8"));
  const tables = await client.query(`select table_name from information_schema.tables where table_schema='public' and table_name in ('app_site_integration','app_site_integration_revision') order by table_name`);
  assert.deepEqual(tables.rows.map(({ table_name }) => table_name), ["app_site_integration", "app_site_integration_revision"]);
  const integrationId = crypto.randomUUID();
  await client.query("begin");
  try {
    const created = await client.query(`insert into app_site_integration (id,name,provider,status,environment,surfaces,config,csp_sources) values ($1,'Proof analytics','cloudflare-web-analytics','published','development',array['marketing','web'],jsonb_build_object('identifier','proof-token'),jsonb_build_object('scriptSrc',jsonb_build_array('https://static.cloudflareinsights.com'))) returning version,status`, [integrationId]);
    assert.equal(created.rows[0].version, 1);
    assert.equal(created.rows[0].status, "published");
    await client.query(`insert into app_site_integration_revision (id,integration_id,version,snapshot) values ($1,$2,1,jsonb_build_object('status','published'))`, [crypto.randomUUID(), integrationId]);
    const runtime = await client.query(`select provider,config from app_site_integration where status='published' and environment='development' and 'web'=any(surfaces)`);
    assert.equal(runtime.rows.length, 1);
    assert.equal(runtime.rows[0].provider, "cloudflare-web-analytics");
    await client.query("rollback");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
  console.log(JSON.stringify({ ok: true, migrations: "all", tables: 2, runtimeRows: 1 }));
} finally {
  await client.end();
}
