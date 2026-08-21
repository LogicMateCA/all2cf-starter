import { Hono } from "hono";
import type { Pool } from "pg";
import { withRequestAuth, type AuthRuntimeEnv } from "../auth-runtime";

type EntitlementRow = {
  feature_key: string;
  enabled: boolean;
  limit_value: string | null;
  metadata: Record<string, unknown>;
};

function isPlatformAdmin(user: unknown) {
  const role =
    typeof user === "object" && user && "role" in user
      ? String(user.role || "")
      : "";
  return role
    .split(",")
    .map((value) => value.trim())
    .includes("admin");
}

type EntitlementDatabase = Pick<Pool, "query">;

export async function resolveUserEntitlements(
  database: EntitlementDatabase,
  userId: string,
) {
  const subscription = await database.query<{ plan: string }>(
    `select plan from app_subscription
     where reference_id = $1
       and status in ('active', 'trialing')
       and (period_end is null or period_end > current_timestamp)
     order by case when status = 'active' then 0 else 1 end, period_end desc nulls first
     limit 1`,
    [userId],
  );
  const requestedPlan = subscription.rows[0]?.plan || "free";
  const plan = await database.query<{ id: string; name: string }>(
    `select id, name from app_billing_plan where id = $1 and active = true`,
    [requestedPlan],
  );
  const resolvedPlan =
    plan.rows[0] ||
    (
      await database.query<{ id: string; name: string }>(
        `select id, name from app_billing_plan where id = 'free' and active = true`,
      )
    ).rows[0];
  if (!resolvedPlan)
    throw new Error("The required free entitlement plan is missing");
  const entitlements = await database.query<EntitlementRow>(
    `select feature_key, enabled, limit_value::text, metadata
     from app_billing_plan_entitlement where plan_id = $1 order by feature_key`,
    [resolvedPlan.id],
  );
  return {
    plan: resolvedPlan,
    entitlements: entitlements.rows.map((item) => ({
      key: item.feature_key,
      enabled: item.enabled,
      limit: item.limit_value === null ? null : Number(item.limit_value),
      metadata: item.metadata,
    })),
  };
}

export const entitlementsFeature = new Hono<{ Bindings: AuthRuntimeEnv }>();

entitlementsFeature.get("/api/entitlements/me", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user)
      return c.json(
        {
          error: { code: "UNAUTHORIZED", message: "Authentication required." },
        },
        401,
        { "Cache-Control": "no-store" },
      );
    return c.json(
      { data: await resolveUserEntitlements(database, session.user.id) },
      200,
      { "Cache-Control": "no-store" },
    );
  }),
);

entitlementsFeature.get("/api/admin/entitlements/:userId", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user)
      return c.json(
        {
          error: { code: "UNAUTHORIZED", message: "Authentication required." },
        },
        401,
        { "Cache-Control": "no-store" },
      );
    if (!isPlatformAdmin(session.user))
      return c.json(
        { error: { code: "FORBIDDEN", message: "Admin role required." } },
        403,
        { "Cache-Control": "no-store" },
      );
    const user = await database.query<{ id: string }>(
      `select id from app_user where id = $1`,
      [c.req.param("userId")],
    );
    if (!user.rows[0])
      return c.json(
        { error: { code: "NOT_FOUND", message: "User not found." } },
        404,
        { "Cache-Control": "no-store" },
      );
    return c.json(
      { data: await resolveUserEntitlements(database, user.rows[0].id) },
      200,
      { "Cache-Control": "no-store" },
    );
  }),
);
