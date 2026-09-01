import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const connectionString = process.env.STARTER_ADMIN_DATABASE_URL?.trim();
if (!connectionString) throw new Error("STARTER_ADMIN_DATABASE_URL is required");
const client = new Client({ connectionString, ssl: false, application_name: "starter-admin-saas-contract" });
await client.connect();
try {
  for (const name of (await readdir(path.join(root, "db/migrations"))).filter((name) => /^\d+.*\.sql$/u.test(name)).sort()) await client.query(await readFile(path.join(root, "db/migrations", name), "utf8"));
  await client.query(await readFile(path.join(root, "packs/saas/api-keys/templates/0007_api_keys.sql"), "utf8"));
  const suffix = crypto.randomUUID(); const adminId = `admin-${suffix}`; const userId = `user-${suffix}`;
  await client.query("begin");
  try {
    await client.query(`insert into app_user(id,name,email,email_verified,role,created_at,updated_at) values ($1,'Admin',$2,true,'admin',now(),now()),($3,'User',$4,true,'user',now(),now())`, [adminId, `${adminId}@example.test`, userId, `${userId}@example.test`]);
    for (const product of ["starter", "analytics", "mail"]) await client.query(`insert into app_subscription(id,plan,reference_id,status,product_key,source) values ($1,'pro',$2,'active',$3,'manual')`, [crypto.randomUUID(), userId, product]);
    await client.query(`update app_subscription set status='paused' where reference_id=$1 and product_key='analytics'`, [userId]);
    await client.query(`update app_billing_plan_entitlement set enabled=false where plan_id='pro' and feature_key='product.read'`);
    const keyId = crypto.randomUUID(); await client.query(`insert into app_api_key(id,key,reference_id,name,prefix) values ($1,$2,$3,'Proof','pk')`, [keyId, crypto.randomUUID(), userId]); await client.query(`update app_api_key set enabled=false where id=$1`, [keyId]);
    const hookId = crypto.randomUUID(); await client.query(`insert into app_webhook_endpoint(id,owner_user_id,url,event_types) values ($1,$2,$3,array['test'])`, [hookId, userId, `https://example.test/${suffix}`]); await client.query(`update app_webhook_endpoint set enabled=false where id=$1`, [hookId]);
    await client.query(`insert into app_onboarding_progress(user_id,definition_version,completed_steps,completed_at) values ($1,1,array['one'],now())`, [userId]); await client.query(`update app_onboarding_progress set completed_steps='{}',completed_at=null where user_id=$1`, [userId]);
    await client.query(`insert into app_platform_setting(key,value,updated_by_user_id) values ('support_email',$1::jsonb,$2) on conflict(key) do update set value=excluded.value,updated_by_user_id=excluded.updated_by_user_id`, [JSON.stringify("support@example.test"), adminId]);
    const subscriptions = await client.query(`select product_key,status from app_subscription where reference_id=$1 order by product_key`, [userId]);
    assert.deepEqual(subscriptions.rows, [{ product_key: "analytics", status: "paused" }, { product_key: "mail", status: "active" }, { product_key: "starter", status: "active" }]);
    assert.equal((await client.query(`select enabled from app_billing_plan_entitlement where plan_id='pro' and feature_key='product.read'`)).rows[0].enabled, false);
    assert.equal((await client.query(`select enabled from app_api_key where id=$1`, [keyId])).rows[0].enabled, false);
    assert.equal((await client.query(`select enabled from app_webhook_endpoint where id=$1`, [hookId])).rows[0].enabled, false);
    assert.equal((await client.query(`select cardinality(completed_steps) count from app_onboarding_progress where user_id=$1`, [userId])).rows[0].count, 0);
    await client.query("rollback");
  } catch (error) { await client.query("rollback"); throw error; }
  console.log(JSON.stringify({ ok: true, postgresql: 18, selectedPack: "saas.api-keys", simultaneousProducts: 3, auditedAdminSurfaces: 5 }));
} finally { await client.end(); }
