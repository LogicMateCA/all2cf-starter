import { Hono } from "hono";
import type { Pool } from "pg";
import { withRequestAuth, type AuthRuntimeEnv } from "../auth-runtime";

type StreamEnv = AuthRuntimeEnv & {
  STREAM_API_BASE_URL: string;
  STREAM_ACCOUNT_ID: string;
  STREAM_MAX_DURATION_SECONDS: string;
  STREAM_ALLOWED_ORIGINS: string;
  CLOUDFLARE_STREAM_TOKEN: string;
  STREAM_WEBHOOK_SECRET: string;
};
const safeName = /^[^\u0000-\u001f/\\]{1,180}$/u;

async function streamRequest(env: StreamEnv, path: string, init: RequestInit = {}) {
  const response = await fetch(`${env.STREAM_API_BASE_URL.replace(/\/$/u, "")}/accounts/${env.STREAM_ACCOUNT_ID}/stream${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.CLOUDFLARE_STREAM_TOKEN}`, ...(init.body ? { "Content-Type": "application/json" } : {}), ...(init.headers || {}) },
  });
  const payload = await response.json().catch(() => null) as { success?: boolean; result?: Record<string, unknown>; errors?: Array<{ code?: number; message?: string }> } | null;
  if (!response.ok || payload?.success === false)
    throw new Error(payload?.errors?.map(({ code, message }) => `${code || "error"}: ${message || "unknown"}`).join("; ") || `Stream returned HTTP ${response.status}`);
  return payload?.result || {};
}

export async function createStreamDirectUpload(database: Pool, env: StreamEnv, userId: string, fileName: string) {
  const normalized = fileName.normalize("NFKC").trim();
  if (!safeName.test(normalized)) throw new RangeError("Video filename is invalid.");
  const recent = await database.query<{ count: string }>(`select count(*)::text as count from app_stream_asset where owner_user_id = $1 and created_at > now() - interval '1 hour'`, [userId]);
  if (Number(recent.rows[0]?.count || 0) >= 5) throw new RangeError("Video upload limit reached. Try again later.");
  const result = await streamRequest(env, "/direct_upload", {
    method: "POST",
    headers: { "Upload-Creator": userId },
    body: JSON.stringify({
      maxDurationSeconds: Number(env.STREAM_MAX_DURATION_SECONDS),
      allowedOrigins: JSON.parse(env.STREAM_ALLOWED_ORIGINS),
      creator: userId,
      expiry: new Date(Date.now() + 30 * 60_000).toISOString(),
      meta: { name: normalized },
      requireSignedURLs: false,
    }),
  });
  const uid = String(result.uid || "");
  const uploadURL = String(result.uploadURL || "");
  if (!/^[a-zA-Z0-9_-]{8,64}$/u.test(uid) || !uploadURL.startsWith("https://")) throw new Error("Stream returned an invalid direct upload identity.");
  const id = crypto.randomUUID();
  await database.query(`insert into app_stream_asset (id, owner_user_id, stream_uid, file_name, status) values ($1, $2, $3, $4, 'upload_pending')`, [id, userId, uid, normalized]);
  return { id, uid, uploadURL, expiresInSeconds: 1800 };
}

function parseSignature(value: string) {
  const parts = Object.fromEntries(value.split(",").map((part) => part.trim().split("=", 2)));
  return { time: Number(parts.time), signature: String(parts.sig1 || "") };
}
async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

const feature = new Hono<{ Bindings: AuthRuntimeEnv }>();

feature.post("/api/stream/uploads", (c) => withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
  const body = await c.req.json<{ fileName?: string }>();
  try { return c.json({ data: await createStreamDirectUpload(database, c.env as StreamEnv, session.user.id, String(body.fileName || "")) }, 201, { "Cache-Control": "no-store" }); }
  catch (error) { if (error instanceof RangeError) return c.json({ error: { code: "INVALID_UPLOAD", message: error.message } }, 422); throw error; }
}));

feature.get("/api/stream/assets", (c) => withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
  const result = await database.query(`select id, stream_uid, file_name, status, ready_to_stream, pct_complete, thumbnail_url, hls_url, dash_url, error_code, created_at from app_stream_asset where owner_user_id = $1 and deleted_at is null order by created_at desc limit 100`, [session.user.id]);
  return c.json({ data: { assets: result.rows } }, 200, { "Cache-Control": "no-store" });
}));

feature.delete("/api/stream/assets/:id", (c) => withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
  const owned = await database.query<{ stream_uid: string }>(`select stream_uid from app_stream_asset where id = $1 and owner_user_id = $2 and deleted_at is null`, [c.req.param("id"), session.user.id]);
  if (!owned.rows[0]) return c.json({ error: { code: "NOT_FOUND", message: "Stream asset not found." } }, 404);
  await streamRequest(c.env as StreamEnv, `/${encodeURIComponent(owned.rows[0].stream_uid)}`, { method: "DELETE" });
  await database.query(`update app_stream_asset set status = 'deleted', deleted_at = current_timestamp, updated_at = current_timestamp where id = $1`, [c.req.param("id")]);
  return c.body(null, 204);
}));

feature.post("/api/stream/webhook", async (c) => {
  const raw = await c.req.text();
  const signatureHeader = c.req.header("webhook-signature") || "";
  const parsed = parseSignature(signatureHeader);
  if (!Number.isFinite(parsed.time) || Math.abs(Date.now() / 1000 - parsed.time) > 300)
    return c.json({ error: { code: "INVALID_SIGNATURE", message: "Stream webhook signature is invalid." } }, 401);
  const expected = await hmacHex(String(c.env.STREAM_WEBHOOK_SECRET || ""), `${parsed.time}.${raw}`);
  if (!constantTimeEqual(expected, parsed.signature))
    return c.json({ error: { code: "INVALID_SIGNATURE", message: "Stream webhook signature is invalid." } }, 401);
  const payload = JSON.parse(raw) as { uid?: string; readyToStream?: boolean; status?: { state?: string; pctComplete?: string; errorReasonCode?: string; errorReasonText?: string }; thumbnail?: string; playback?: { hls?: string; dash?: string } };
  const uid = String(payload.uid || "");
  const database = (await import("../database-runtime")).createDatabasePool(c.env, `${c.env.SERVICE_NAME}-stream-webhook`);
  try {
    const inserted = await database.query(`insert into app_stream_webhook_event (signature, stream_uid) values ($1, $2) on conflict do nothing returning signature`, [signatureHeader, uid]);
    if (inserted.rows[0]) await database.query(`update app_stream_asset set status = $2, ready_to_stream = $3, pct_complete = nullif($4,'')::numeric, thumbnail_url = $5, hls_url = $6, dash_url = $7, error_code = nullif($8,''), error_text = nullif($9,''), updated_at = current_timestamp where stream_uid = $1 and deleted_at is null`, [uid, payload.status?.state || "error", Boolean(payload.readyToStream), payload.status?.pctComplete || "", payload.thumbnail || null, payload.playback?.hls || null, payload.playback?.dash || null, payload.status?.errorReasonCode || "", payload.status?.errorReasonText || ""]);
    return c.json({ data: { accepted: true, duplicate: !inserted.rows[0] } });
  } finally { await database.end(); }
});

export const cloudflareStreamFeature = feature;
