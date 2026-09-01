import { Hono } from "hono";
import type { Pool } from "pg";
import { withRequestAuth, type AuthRuntimeEnv } from "../auth-runtime";

export type TwilioSmsEnv = Pick<
  AuthRuntimeEnv,
  | "TWILIO_API_BASE_URL"
  | "TWILIO_ACCOUNT_SID"
  | "TWILIO_API_KEY"
  | "TWILIO_API_SECRET"
  | "TWILIO_FROM"
> & {
  TWILIO_API_BASE_URL: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_API_KEY: string;
  TWILIO_API_SECRET: string;
  TWILIO_FROM: string;
};

const e164 = /^\+[1-9][0-9]{7,14}$/u;
const accountSid = /^AC[0-9a-f]{32}$/iu;
const apiKeySid = /^SK[0-9a-f]{32}$/iu;

async function recipientHash(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function sendTwilioSms(
  database: Pool,
  env: TwilioSmsEnv,
  input: {
    to: string;
    body: string;
    kind: string;
    idempotencyKey: string;
    actorUserId?: string | null;
  },
) {
  const to = input.to.trim();
  const body = input.body.trim();
  const kind = input.kind.trim();
  const idempotencyKey = input.idempotencyKey.trim();
  if (!e164.test(to) || !e164.test(env.TWILIO_FROM))
    throw new RangeError("Twilio numbers must use E.164 format.");
  if (!body || body.length > 1_000)
    throw new RangeError("SMS body must contain 1-1000 characters.");
  if (
    !kind ||
    kind.length > 64 ||
    !idempotencyKey ||
    idempotencyKey.length > 128
  )
    throw new RangeError("SMS kind or idempotency key is invalid.");
  if (
    !accountSid.test(env.TWILIO_ACCOUNT_SID) ||
    !apiKeySid.test(env.TWILIO_API_KEY) ||
    !env.TWILIO_API_SECRET
  )
    throw new Error("Twilio API credentials are incomplete.");
  const id = crypto.randomUUID();
  const inserted = await database.query(
    `insert into app_sms_delivery
      (id, idempotency_key, actor_user_id, kind, recipient_hash, recipient_last4, status)
     values ($1, $2, $3, $4, $5, $6, 'pending')
     on conflict (idempotency_key) do nothing returning id`,
    [
      id,
      idempotencyKey,
      input.actorUserId || null,
      kind,
      await recipientHash(to),
      to.slice(-4),
    ],
  );
  if (!inserted.rows[0]) {
    const existing = await database.query(
      `select id, provider_sid, status, error_code from app_sms_delivery where idempotency_key = $1`,
      [idempotencyKey],
    );
    return { duplicate: true, ...existing.rows[0] };
  }
  const form = new URLSearchParams({
    To: to,
    From: env.TWILIO_FROM,
    Body: body,
  });
  const endpoint = `${env.TWILIO_API_BASE_URL.replace(/\/$/u, "")}/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${env.TWILIO_API_KEY}:${env.TWILIO_API_SECRET}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const payload = (await response.json()) as {
    sid?: string;
    status?: string;
    code?: number;
    message?: string;
  };
  const accepted =
    response.ok &&
    Boolean(payload.sid) &&
    new Set(["queued", "accepted", "sending", "sent"]).has(
      String(payload.status),
    );
  const status = accepted ? String(payload.status) : "failed";
  await database.query(
    `update app_sms_delivery set provider_sid = $2, status = $3, error_code = $4, updated_at = current_timestamp where id = $1`,
    [
      id,
      payload.sid || null,
      status,
      payload.code ? String(payload.code) : null,
    ],
  );
  if (!accepted)
    throw new Error(
      payload.message || `Twilio returned HTTP ${response.status}`,
    );
  return { duplicate: false, id, providerSid: payload.sid!, status };
}

const feature = new Hono<{ Bindings: AuthRuntimeEnv }>();

feature.post("/api/admin/sms/test", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const roles = String(session?.user?.role || "")
      .split(",")
      .map((role) => role.trim());
    if (!session?.user)
      return c.json(
        {
          error: { code: "UNAUTHORIZED", message: "Authentication required." },
        },
        401,
      );
    if (!roles.includes("admin"))
      return c.json(
        { error: { code: "FORBIDDEN", message: "Admin role required." } },
        403,
      );
    const body = await c.req.json<{ to?: string }>();
    try {
      const result = await sendTwilioSms(database, c.env as TwilioSmsEnv, {
        to: String(body.to || ""),
        body: "Starter Twilio SMS delivery is configured.",
        kind: "starter-admin-test",
        idempotencyKey: `starter-admin-test-${crypto.randomUUID()}`,
        actorUserId: session.user.id,
      });
      return c.json({ data: result }, 200, { "Cache-Control": "no-store" });
    } catch (error) {
      if (error instanceof RangeError)
        return c.json(
          { error: { code: "INVALID_SMS", message: error.message } },
          422,
        );
      throw error;
    }
  }),
);

export const twilioSmsFeature = feature;
