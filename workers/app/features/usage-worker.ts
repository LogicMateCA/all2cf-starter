import { Hono } from "hono";
import type { Pool } from "pg";
import { withRequestAuth, type AuthRuntimeEnv } from "../auth-runtime";
import { resolveUserEntitlements } from "./entitlements-worker";

type UsageInput = {
  userId: string;
  metricKey: string;
  amount: number;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

type UsageResult = {
  status: "recorded" | "duplicate" | "not_entitled" | "limit_exceeded";
  eventId: string | null;
  metricKey: string;
  amount: number;
  consumed: number;
  limit: number | null;
  periodStart: string;
  periodEnd: string;
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

function validateUsageInput(input: UsageInput) {
  if (!/^[a-z0-9][a-z0-9._-]{1,99}$/u.test(input.metricKey))
    throw new RangeError("metricKey must be a stable 2-100 character key");
  if (
    !Number.isSafeInteger(input.amount) ||
    input.amount <= 0 ||
    input.amount > 1_000_000_000
  )
    throw new RangeError(
      "amount must be a positive safe integer up to 1000000000",
    );
  if (input.idempotencyKey.length < 8 || input.idempotencyKey.length > 200)
    throw new RangeError("idempotencyKey must contain 8-200 characters");
  if (JSON.stringify(input.metadata || {}).length > 2_000)
    throw new RangeError(
      "metadata must remain under 2000 serialized characters",
    );
}

function safeInteger(value: string, field: string) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed))
    throw new Error(`${field} exceeds the safe integer range`);
  return parsed;
}

export async function consumeUserUsage(
  database: Pool,
  input: UsageInput,
): Promise<UsageResult> {
  validateUsageInput(input);
  const client = await database.connect();
  try {
    await client.query("begin");
    const period = await client.query<{
      period_start: string;
      period_end: string;
    }>(
      `select date_trunc('month', current_timestamp)::text as period_start,
              (date_trunc('month', current_timestamp) + interval '1 month')::text as period_end`,
    );
    const currentPeriod = period.rows[0];
    if (!currentPeriod) throw new Error("Unable to resolve the usage period");
    const periodStart = currentPeriod.period_start;
    const periodEnd = currentPeriod.period_end;
    await client.query(
      `select pg_advisory_xact_lock(hashtextextended(jsonb_build_array($1::text, $2::text, $3::text)::text, 0))`,
      [input.userId, input.metricKey, periodStart],
    );
    const previous = await client.query<{
      id: string;
      amount: string;
    }>(
      `select id, amount::text from app_usage_event
       where subject_user_id = $1 and metric_key = $2 and period_start = $3::timestamptz and idempotency_key = $4`,
      [input.userId, input.metricKey, periodStart, input.idempotencyKey],
    );
    const access = await resolveUserEntitlements(client, input.userId);
    const entitlement = access.entitlements.find(
      (item) => item.key === input.metricKey && item.enabled,
    );
    const bucket = await client.query<{ consumed: string }>(
      `select consumed::text from app_usage_bucket
       where subject_user_id = $1 and metric_key = $2 and period_start = $3::timestamptz`,
      [input.userId, input.metricKey, periodStart],
    );
    const consumed = bucket.rows[0]
      ? safeInteger(bucket.rows[0].consumed, "usage consumed")
      : 0;
    const limit = entitlement?.limit ?? null;
    if (previous.rows[0]) {
      const previousAmount = safeInteger(
        previous.rows[0].amount,
        "usage amount",
      );
      if (previousAmount !== input.amount)
        throw new RangeError(
          "idempotencyKey was already used with a different amount",
        );
      await client.query("commit");
      return {
        status: "duplicate",
        eventId: previous.rows[0].id,
        metricKey: input.metricKey,
        amount: previousAmount,
        consumed,
        limit,
        periodStart,
        periodEnd,
      };
    }
    if (!entitlement) {
      await client.query("rollback");
      return {
        status: "not_entitled",
        eventId: null,
        metricKey: input.metricKey,
        amount: input.amount,
        consumed,
        limit: null,
        periodStart,
        periodEnd,
      };
    }
    if (limit !== null && consumed > limit - input.amount) {
      await client.query("rollback");
      return {
        status: "limit_exceeded",
        eventId: null,
        metricKey: input.metricKey,
        amount: input.amount,
        consumed,
        limit,
        periodStart,
        periodEnd,
      };
    }
    const eventId = crypto.randomUUID();
    await client.query(
      `insert into app_usage_event
       (id, subject_user_id, metric_key, period_start, period_end, amount, idempotency_key, metadata)
       values ($1, $2, $3, $4::timestamptz, $5::timestamptz, $6, $7, $8::jsonb)`,
      [
        eventId,
        input.userId,
        input.metricKey,
        periodStart,
        periodEnd,
        input.amount,
        input.idempotencyKey,
        JSON.stringify(input.metadata || {}),
      ],
    );
    const updated = await client.query<{ consumed: string }>(
      `insert into app_usage_bucket
       (subject_user_id, metric_key, period_start, period_end, consumed)
       values ($1, $2, $3::timestamptz, $4::timestamptz, $5)
       on conflict (subject_user_id, metric_key, period_start)
       do update set consumed = app_usage_bucket.consumed + excluded.consumed,
                     period_end = excluded.period_end,
                     updated_at = current_timestamp
       returning consumed::text`,
      [input.userId, input.metricKey, periodStart, periodEnd, input.amount],
    );
    const updatedBucket = updated.rows[0];
    if (!updatedBucket) throw new Error("Usage bucket update returned no row");
    const updatedConsumed = safeInteger(
      updatedBucket.consumed,
      "usage consumed",
    );
    await client.query("commit");
    return {
      status: "recorded",
      eventId,
      metricKey: input.metricKey,
      amount: input.amount,
      consumed: updatedConsumed,
      limit,
      periodStart,
      periodEnd,
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function readUserUsage(database: Pool, userId: string) {
  const access = await resolveUserEntitlements(database, userId);
  const meters = access.entitlements.filter(
    (item) => item.enabled && item.limit !== null,
  );
  if (!meters.length)
    return {
      plan: access.plan,
      periodStart: null,
      periodEnd: null,
      meters: [],
    };
  const result = await database.query<{
    metric_key: string | null;
    consumed: string | null;
    period_start: string;
    period_end: string;
  }>(
    `with period as (
       select date_trunc('month', current_timestamp) as period_start,
              date_trunc('month', current_timestamp) + interval '1 month' as period_end
     ), selected_buckets as (
       select bucket.metric_key, bucket.consumed
       from app_usage_bucket bucket, period
       where bucket.subject_user_id = $1
         and bucket.period_start = period.period_start
         and bucket.metric_key = any($2::text[])
     )
     select selected_buckets.metric_key,
            selected_buckets.consumed::text,
            period.period_start::text,
            period.period_end::text
     from period
     left join selected_buckets on true`,
    [userId, meters.map((item) => item.key)],
  );
  const currentPeriod = result.rows[0];
  if (!currentPeriod) throw new Error("Unable to resolve the usage period");
  const buckets = new Map<string, string>();
  for (const item of result.rows) {
    if (item.metric_key && item.consumed)
      buckets.set(item.metric_key, item.consumed);
  }
  return {
    plan: access.plan,
    periodStart: currentPeriod.period_start,
    periodEnd: currentPeriod.period_end,
    meters: meters.map((meter) => {
      const bucket = buckets.get(meter.key);
      const consumed = bucket ? safeInteger(bucket, "usage consumed") : 0;
      return {
        key: meter.key,
        consumed,
        limit: meter.limit,
        remaining: Math.max((meter.limit || 0) - consumed, 0),
      };
    }),
  };
}

export const usageFeature = new Hono<{ Bindings: AuthRuntimeEnv }>();

usageFeature.get("/api/usage/me", (c) =>
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
      { data: await readUserUsage(database, session.user.id) },
      200,
      { "Cache-Control": "no-store" },
    );
  }),
);

usageFeature.get("/api/admin/usage/:userId", (c) =>
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
      { data: await readUserUsage(database, user.rows[0].id) },
      200,
      { "Cache-Control": "no-store" },
    );
  }),
);
