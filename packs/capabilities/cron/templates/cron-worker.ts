import { Hono } from "hono";
import { withRequestAuth, type AuthRuntimeEnv } from "../auth-runtime";
import { createDatabasePool } from "../database-runtime";
import type { WorkerEventFeature } from "../worker-events";

export const cronEvents: WorkerEventFeature = {
  async scheduled(controller, env) {
    const database = createDatabasePool(env, `${env.SERVICE_NAME}-cron`);
    try {
      await database.query(
        `insert into app_cron_heartbeat (cron_expression, last_scheduled_at)
         values ($1, to_timestamp($2 / 1000.0))
         on conflict (cron_expression) do update set
           last_scheduled_at = excluded.last_scheduled_at,
           last_run_at = current_timestamp,
           run_count = app_cron_heartbeat.run_count + 1,
           updated_at = current_timestamp`,
        [controller.cron, controller.scheduledTime],
      );
    } finally { await database.end(); }
  },
};

const feature = new Hono<{ Bindings: AuthRuntimeEnv }>();
feature.get("/api/admin/cron", (c) => withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const roles = String(session?.user?.role || "").split(",").map((role) => role.trim());
  if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
  if (!roles.includes("admin")) return c.json({ error: { code: "FORBIDDEN", message: "Admin role required." } }, 403);
  const result = await database.query(`select cron_expression, last_scheduled_at, last_run_at, run_count::text from app_cron_heartbeat order by cron_expression limit 20`);
  return c.json({ data: { schedules: result.rows } }, 200, { "Cache-Control": "no-store" });
}));
export const cronFeature = feature;
