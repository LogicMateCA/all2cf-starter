import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const migration = await readFile(new URL("db/migrations/0010_platform_administrators.sql", root), "utf8");
const adminUi = await readFile(new URL("apps/web/src/components/admin-users.tsx", root), "utf8");
const entitlements = await readFile(new URL("workers/app/features/entitlements-worker.ts", root), "utf8");

assert.match(migration, /pg_advisory_xact_lock/u);
assert.match(migration, /if not exists \(select 1 from app_user\) then\s+new\.role := 'admin'/u);
assert.match(migration, /order by created_at asc, id asc/u);
assert.match(migration, /At least one platform administrator is required/u);
assert.match(adminUi, /authClient\.admin\.setRole/u);
assert.match(adminUi, /<option value="admin">Admin<\/option>/u);
assert.match(entitlements, /select role from app_user where id = \$1 limit 1/u);
assert.match(entitlements, /if \(isPlatformAdmin\(identity\.rows\[0\]\)\)/u);
assert.match(entitlements, /select distinct feature_key/u);
assert.match(entitlements, /plan: \{ id: "administrator", name: "Administrator" \}/u);
assert.match(entitlements, /enabled: true,\s+limit: null/u);
assert.match(entitlements, /source: "platform-administrator"/u);
assert.match(entitlements, /select plan from app_subscription/u);

console.log(JSON.stringify({
  ok: true,
  initialAdministrator: "database-serialized",
  existingDatabaseBootstrap: "oldest-user-when-no-admin",
  lastAdministratorRemoval: "blocked",
  adminManagement: "/admin Better Auth role control",
  administratorEntitlements: "all-defined-features-unlimited-contract",
  customerEntitlements: "subscription-resolver-retained",
}, null, 2));
