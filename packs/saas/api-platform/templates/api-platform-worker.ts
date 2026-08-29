import { Hono } from "hono";
import type { Pool } from "pg";
import { withRequestAuth, type AuthRuntimeEnv } from "../auth-runtime";
import { consumeUserUsage } from "./usage-worker";
import { enqueueOutgoingWebhook } from "./outgoing-webhooks-worker";

type VerifiedApiKey = {
  valid: boolean;
  error?: { message?: string };
  key?: { referenceId?: string };
};

function bearerKey(value: string | undefined) {
  const match = /^Bearer\s+([^\s]+)$/iu.exec(value || "");
  return match?.[1] || "";
}

async function emitApiEvent(
  database: Pool,
  env: AuthRuntimeEnv,
  userId: string,
  requestId: string,
) {
  const client = await database.connect();
  try {
    await client.query("begin");
    await enqueueOutgoingWebhook(client, env, {
      ownerUserId: userId,
      type: "api.request.completed",
      data: { path: "/api/v1/me", requestId },
    });
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export const apiPlatformFeature = new Hono<{ Bindings: AuthRuntimeEnv }>();

apiPlatformFeature.get("/api/v1/me", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const key =
      bearerKey(c.req.header("authorization")) || c.req.header("x-api-key") || "";
    if (!key)
      return c.json(
        { error: { code: "API_KEY_REQUIRED", message: "API key required." } },
        401,
        { "Cache-Control": "no-store" },
      );
    const verifyApiKey = (
      auth.api as unknown as {
        verifyApiKey: (input: { body: unknown }) => Promise<VerifiedApiKey>;
      }
    ).verifyApiKey;
    const verified = await verifyApiKey({
      body: { key, permissions: { product: ["read"] } },
    });
    const userId = verified.key?.referenceId;
    if (!verified.valid || !userId)
      return c.json(
        {
          error: {
            code: "INVALID_API_KEY",
            message: verified.error?.message || "API key is invalid.",
          },
        },
        401,
        { "Cache-Control": "no-store" },
      );
    const idempotencyKey = c.req.header("idempotency-key")?.trim() || "";
    if (idempotencyKey.length < 8 || idempotencyKey.length > 200)
      return c.json(
        {
          error: {
            code: "IDEMPOTENCY_KEY_REQUIRED",
            message: "Idempotency-Key must contain 8-200 characters.",
          },
        },
        400,
        { "Cache-Control": "no-store" },
      );
    const usage = await consumeUserUsage(database, {
      userId,
      metricKey: "api.requests",
      amount: 1,
      idempotencyKey,
      metadata: { path: "/api/v1/me" },
    });
    if (usage.status === "not_entitled")
      return c.json(
        { error: { code: "API_NOT_ENTITLED", message: "API access is not enabled." } },
        403,
        { "Cache-Control": "no-store" },
      );
    if (usage.status === "limit_exceeded")
      return c.json(
        { error: { code: "API_QUOTA_EXCEEDED", message: "Monthly API quota exceeded." }, usage },
        429,
        { "Cache-Control": "no-store" },
      );
    const user = await database.query<{
      id: string;
      name: string;
      email: string;
      created_at: string;
    }>(
      "select id, name, email, created_at from app_user where id = $1 limit 1",
      [userId],
    );
    if (!user.rows[0])
      return c.json(
        { error: { code: "OWNER_NOT_FOUND", message: "API key owner not found." } },
        401,
        { "Cache-Control": "no-store" },
      );
    if (usage.status === "recorded")
      await emitApiEvent(database, c.env, userId, idempotencyKey);
    return c.json(
      { data: { user: user.rows[0], usage }, requestId: idempotencyKey },
      200,
      { "Cache-Control": "no-store" },
    );
  }),
);
