import { Hono } from "hono";
import { type Pool, type PoolClient } from "pg";
import { withRequestAuth, type AuthRuntimeEnv } from "../auth-runtime";
import { createDatabasePool } from "../database-runtime";
import type { WorkerEventFeature } from "../worker-events";

type WebhookQueueMessage = {
  kind: "outgoing-webhook";
  deliveryId: string;
};

type ProductWebhookEvent = {
  ownerUserId: string;
  type: string;
  data: Record<string, unknown>;
};

type DeliveryRecord = {
  delivery_id: string;
  status: string;
  endpoint_id: string;
  url: string;
  enabled: boolean;
  archived_at: string | null;
  secret_version: number;
  event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  event_created_at: string;
};

const webhookFeature = new Hono<{ Bindings: AuthRuntimeEnv }>();
const eventTypePattern = /^[a-z0-9][a-z0-9._-]{2,99}$/u;
const retryDelays = [10, 60, 300, 1_800] as const;
const terminalAttempt = 5;

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

function isQueueMessage(value: unknown): value is WebhookQueueMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    value.kind === "outgoing-webhook" &&
    "deliveryId" in value &&
    typeof value.deliveryId === "string" &&
    /^[0-9a-f-]{36}$/u.test(value.deliveryId)
  );
}

function encodeBase64Url(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

async function hmac(key: string, value: string) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return encodeBase64Url(
    await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(value)),
  );
}

async function endpointSecret(env: AuthRuntimeEnv, endpointId: string, version: number) {
  if (!env.WEBHOOK_SIGNING_KEY)
    throw new Error("WEBHOOK_SIGNING_KEY is not configured");
  return `whsec_${await hmac(
    env.WEBHOOK_SIGNING_KEY,
    `endpoint:${endpointId}:v${version}`,
  )}`;
}

function normalizeEventTypes(value: unknown) {
  if (!Array.isArray(value)) throw new RangeError("eventTypes must be an array");
  const events = [...new Set(value.map((item) => String(item).trim()))].sort();
  if (!events.length || events.length > 20 || events.some((item) => !eventTypePattern.test(item)))
    throw new RangeError("eventTypes must contain 1-20 stable event keys");
  return events;
}

function rejectPrivateIPv4(hostname: string) {
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/u.test(part))) return false;
  const values = parts.map(Number);
  if (values.some((value) => value > 255)) return true;
  const [first = 999, second = 999] = values;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    first >= 224
  );
}

function normalizeEndpointURL(value: unknown, allowLocal = false) {
  const raw = String(value || "").trim();
  if (raw.length > 2_048) throw new RangeError("url is too long");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new RangeError("url must be an absolute HTTPS URL");
  }
  const hostname = url.hostname.toLowerCase();
  const localTarget =
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.includes(":") ||
    rejectPrivateIPv4(hostname);
  if (
    (!allowLocal && url.protocol !== "https:") ||
    (allowLocal && !new Set(["http:", "https:"]).has(url.protocol)) ||
    url.username ||
    url.password ||
    (!allowLocal && localTarget)
  )
    throw new RangeError("url must use public HTTPS without credentials");
  url.hash = "";
  return url.toString();
}

function validateEvent(event: ProductWebhookEvent) {
  if (!eventTypePattern.test(event.type))
    throw new RangeError("Webhook event type must contain 3-100 stable characters");
  const serialized = JSON.stringify(event.data);
  if (new TextEncoder().encode(serialized).byteLength > 64_000)
    throw new RangeError("Webhook event data must remain under 64KB serialized");
}

export async function enqueueOutgoingWebhook(
  client: PoolClient,
  env: AuthRuntimeEnv,
  event: ProductWebhookEvent,
) {
  validateEvent(event);
  if (!env.OUTGOING_WEBHOOK_QUEUE)
    throw new Error("OUTGOING_WEBHOOK_QUEUE is not configured");
  const endpoints = await client.query<{ id: string; secret_version: number }>(
    `select id, secret_version from app_webhook_endpoint
     where owner_user_id = $1 and enabled = true and archived_at is null and $2 = any(event_types)
     order by created_at asc limit 20`,
    [event.ownerUserId, event.type],
  );
  if (!endpoints.rowCount) return { eventId: null, deliveryIds: [] as string[] };
  const eventId = crypto.randomUUID();
  await client.query(
    `insert into app_webhook_event (id, owner_user_id, event_type, payload)
     values ($1, $2, $3, $4::jsonb)`,
    [eventId, event.ownerUserId, event.type, JSON.stringify(event.data)],
  );
  const deliveryIds: string[] = [];
  for (const endpoint of endpoints.rows) {
    const deliveryId = crypto.randomUUID();
    deliveryIds.push(deliveryId);
    await client.query(
      `insert into app_webhook_delivery (id, event_id, endpoint_id, secret_version)
       values ($1, $2, $3, $4)`,
      [deliveryId, eventId, endpoint.id, endpoint.secret_version],
    );
  }
  await env.OUTGOING_WEBHOOK_QUEUE.sendBatch(
    deliveryIds.map((deliveryId) => ({
      body: { kind: "outgoing-webhook", deliveryId } satisfies WebhookQueueMessage,
      contentType: "json" as const,
    })),
  );
  return { eventId, deliveryIds };
}

async function createTestDelivery(
  database: Pool,
  env: AuthRuntimeEnv,
  userId: string,
) {
  const client = await database.connect();
  try {
    await client.query("begin");
    const result = await enqueueOutgoingWebhook(client, env, {
      ownerUserId: userId,
      type: "starter.webhook.test",
      data: { message: "Starter signed webhook test" },
    });
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

webhookFeature.get("/api/webhooks", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
    const endpoints = await database.query(
      `select id, url, description, event_types, enabled, secret_version, created_at, updated_at
       from app_webhook_endpoint where owner_user_id = $1 and archived_at is null
       order by created_at desc limit 20`,
      [session.user.id],
    );
    const deliveries = await database.query(
      `select d.id, d.status, d.attempt_count, d.response_status, d.last_error,
              d.delivered_at, d.created_at, e.event_type, p.url
       from app_webhook_delivery d
       join app_webhook_event e on e.id = d.event_id
       join app_webhook_endpoint p on p.id = d.endpoint_id
       where e.owner_user_id = $1 order by d.created_at desc limit 50`,
      [session.user.id],
    );
    return c.json({ data: { endpoints: endpoints.rows, deliveries: deliveries.rows } }, 200, { "Cache-Control": "no-store" });
  }),
);

webhookFeature.post("/api/webhooks/endpoints", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
    const body = await c.req.json<{ url?: unknown; description?: unknown; eventTypes?: unknown }>();
    try {
      const count = await database.query<{ count: string }>(
        `select count(*)::text as count from app_webhook_endpoint where owner_user_id = $1 and archived_at is null`,
        [session.user.id],
      );
      if (Number(count.rows[0]?.count || 0) >= 20)
        return c.json({ error: { code: "ENDPOINT_LIMIT", message: "A user may own at most 20 active endpoints." } }, 409);
      const id = crypto.randomUUID();
      const url = normalizeEndpointURL(body.url, c.env.APP_ENV === "test");
      const description = String(body.description || "").trim().slice(0, 200);
      const eventTypes = normalizeEventTypes(body.eventTypes);
      const secret = await endpointSecret(c.env, id, 1);
      const result = await database.query(
        `insert into app_webhook_endpoint (id, owner_user_id, url, description, event_types)
         values ($1, $2, $3, $4, $5::text[])
         returning id, url, description, event_types, enabled, secret_version, created_at`,
        [id, session.user.id, url, description, eventTypes],
      );
      return c.json({ data: { endpoint: result.rows[0], secret } }, 201, { "Cache-Control": "no-store" });
    } catch (error) {
      if (error instanceof RangeError)
        return c.json({ error: { code: "INVALID_ENDPOINT", message: error.message } }, 400);
      if (typeof error === "object" && error && "code" in error && error.code === "23505")
        return c.json({ error: { code: "DUPLICATE_ENDPOINT", message: "This endpoint already exists." } }, 409);
      throw error;
    }
  }),
);

webhookFeature.patch("/api/webhooks/endpoints/:id", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
    const body = await c.req.json<{ description?: unknown; eventTypes?: unknown; enabled?: unknown }>();
    try {
      const description = String(body.description || "").trim().slice(0, 200);
      const eventTypes = normalizeEventTypes(body.eventTypes);
      if (typeof body.enabled !== "boolean") throw new RangeError("enabled must be boolean");
      const result = await database.query(
        `update app_webhook_endpoint set description = $3, event_types = $4::text[], enabled = $5, updated_at = current_timestamp
         where id = $1 and owner_user_id = $2 and archived_at is null
         returning id, url, description, event_types, enabled, secret_version, updated_at`,
        [c.req.param("id"), session.user.id, description, eventTypes, body.enabled],
      );
      if (!result.rows[0]) return c.json({ error: { code: "NOT_FOUND", message: "Endpoint not found." } }, 404);
      return c.json({ data: result.rows[0] });
    } catch (error) {
      if (error instanceof RangeError)
        return c.json({ error: { code: "INVALID_ENDPOINT", message: error.message } }, 400);
      throw error;
    }
  }),
);

webhookFeature.post("/api/webhooks/endpoints/:id/rotate", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
    const result = await database.query<{ id: string; secret_version: number }>(
      `update app_webhook_endpoint set secret_version = secret_version + 1, updated_at = current_timestamp
       where id = $1 and owner_user_id = $2 and archived_at is null
       returning id, secret_version`,
      [c.req.param("id"), session.user.id],
    );
    const endpoint = result.rows[0];
    if (!endpoint) return c.json({ error: { code: "NOT_FOUND", message: "Endpoint not found." } }, 404);
    return c.json({ data: { id: endpoint.id, secretVersion: endpoint.secret_version, secret: await endpointSecret(c.env, endpoint.id, endpoint.secret_version) } }, 200, { "Cache-Control": "no-store" });
  }),
);

webhookFeature.delete("/api/webhooks/endpoints/:id", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
    const result = await database.query(
      `update app_webhook_endpoint set enabled = false, archived_at = current_timestamp, updated_at = current_timestamp
       where id = $1 and owner_user_id = $2 and archived_at is null returning id`,
      [c.req.param("id"), session.user.id],
    );
    if (!result.rows[0]) return c.json({ error: { code: "NOT_FOUND", message: "Endpoint not found." } }, 404);
    return c.body(null, 204);
  }),
);

webhookFeature.post("/api/webhooks/test", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
    const result = await createTestDelivery(database, c.env, session.user.id);
    if (!result.deliveryIds.length)
      return c.json({ error: { code: "NO_SUBSCRIBER", message: "No enabled endpoint subscribes to starter.webhook.test." } }, 409);
    return c.json({ data: result }, 202);
  }),
);

webhookFeature.get("/api/admin/webhooks", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
    if (!isPlatformAdmin(session.user)) return c.json({ error: { code: "FORBIDDEN", message: "Platform Admin access required." } }, 403);
    const deliveries = await database.query(
      `select d.id, d.status, d.attempt_count, d.response_status, d.last_error, d.delivered_at, d.created_at,
              e.owner_user_id, e.event_type, p.url
       from app_webhook_delivery d
       join app_webhook_event e on e.id = d.event_id
       join app_webhook_endpoint p on p.id = d.endpoint_id
       order by d.created_at desc limit 100`,
    );
    return c.json({ data: deliveries.rows }, 200, { "Cache-Control": "no-store" });
  }),
);

async function responseExcerpt(response: Response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let output = "";
  try {
    while (output.length < 1_024) {
      const chunk = await reader.read();
      if (chunk.done) break;
      output += decoder.decode(chunk.value, { stream: true });
    }
    output += decoder.decode();
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return output.slice(0, 1_024);
}

async function deliverMessage(
  message: Message<unknown>,
  env: AuthRuntimeEnv,
  database: Pool,
) {
  if (!isQueueMessage(message.body)) {
    console.error(JSON.stringify({ event: "webhook_queue_invalid_message", messageId: message.id }));
    message.ack();
    return;
  }
  const result = await database.query<DeliveryRecord>(
    `select d.id as delivery_id, d.status, p.id as endpoint_id, p.url, p.enabled, p.archived_at,
            d.secret_version, e.id as event_id, e.event_type, e.payload, e.created_at::text as event_created_at
     from app_webhook_delivery d
     join app_webhook_endpoint p on p.id = d.endpoint_id
     join app_webhook_event e on e.id = d.event_id
     where d.id = $1`,
    [message.body.deliveryId],
  );
  const delivery = result.rows[0];
  if (!delivery) {
    if (message.attempts < 3) message.retry({ delaySeconds: 1 });
    else message.ack();
    return;
  }
  if (["succeeded", "failed"].includes(delivery.status)) {
    message.ack();
    return;
  }
  if (!delivery.enabled || delivery.archived_at) {
    await database.query(
      `update app_webhook_delivery set status = 'failed', attempt_count = $2, last_error = 'Endpoint is disabled', last_attempt_at = current_timestamp, updated_at = current_timestamp where id = $1`,
      [delivery.delivery_id, message.attempts],
    );
    message.ack();
    return;
  }
  const body = JSON.stringify({
    id: delivery.event_id,
    type: delivery.event_type,
    data: delivery.payload,
    createdAt: delivery.event_created_at,
  });
  const timestamp = Math.floor(Date.now() / 1_000).toString();
  const secret = await endpointSecret(env, delivery.endpoint_id, delivery.secret_version);
  const signature = await hmac(secret, `${delivery.delivery_id}.${timestamp}.${body}`);
  await database.query(
    `update app_webhook_delivery set status = 'delivering', attempt_count = $2, last_attempt_at = current_timestamp, updated_at = current_timestamp where id = $1`,
    [delivery.delivery_id, message.attempts],
  );
  try {
    const response = await fetch(delivery.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Logicm8-Starter-Webhooks/1.0",
        "Webhook-Id": delivery.delivery_id,
        "Webhook-Timestamp": timestamp,
        "Webhook-Signature": `v1,${signature}`,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    const excerpt = await responseExcerpt(response);
    if (response.ok) {
      await database.query(
        `update app_webhook_delivery set status = 'succeeded', response_status = $2, response_excerpt = $3,
                last_error = null, delivered_at = current_timestamp, updated_at = current_timestamp where id = $1`,
        [delivery.delivery_id, response.status, excerpt],
      );
      message.ack();
      return;
    }
    await database.query(
      `update app_webhook_delivery set response_status = $2, response_excerpt = $3, updated_at = current_timestamp where id = $1`,
      [delivery.delivery_id, response.status, excerpt],
    );
    throw new Error(`Receiver returned HTTP ${response.status}`);
  } catch (error) {
    const detail = (error instanceof Error ? error.message : String(error)).slice(0, 500);
    const terminal = message.attempts >= terminalAttempt;
    await database.query(
      `update app_webhook_delivery set status = $2, last_error = $3, last_attempt_at = current_timestamp, updated_at = current_timestamp where id = $1`,
      [delivery.delivery_id, terminal ? "failed" : "retrying", detail],
    );
    console.error(JSON.stringify({ event: "webhook_delivery_failed", deliveryId: delivery.delivery_id, attempt: message.attempts, terminal, error: detail }));
    if (terminal) message.ack();
    else
      message.retry({
        delaySeconds:
          env.APP_ENV === "test"
            ? 1
            : (retryDelays[
                Math.min(message.attempts - 1, retryDelays.length - 1)
              ] ?? 1_800),
      });
  }
}

export const outgoingWebhooksEvents: WorkerEventFeature = {
  async queue(batch, env) {
    if (!batch.queue.endsWith("-outgoing-webhooks")) return;
    const database = createDatabasePool(
      env,
      `${env.SERVICE_NAME}-outgoing-webhooks`,
    );
    try {
      for (const message of batch.messages)
        await deliverMessage(message, env, database);
    } finally {
      await database.end();
    }
  },
};

export const outgoingWebhooksFeature = webhookFeature;
