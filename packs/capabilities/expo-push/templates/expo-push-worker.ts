import { Hono } from "hono";
import type { Pool } from "pg";
import { withRequestAuth, type AuthRuntimeEnv } from "../auth-runtime";

type PushEnv = AuthRuntimeEnv & {
  EXPO_PUSH_PROJECT_ID: string;
  EXPO_PUSH_ACCESS_TOKEN?: string;
};
type PushDevice = { id: string; expo_push_token: string; platform: "ios" | "android" };
const expoToken = /^(?:Exponent|Expo)PushToken\[[A-Za-z0-9_-]{8,256}\]$/u;

async function sendExpoRequest(env: PushEnv, messages: unknown[]) {
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(env.EXPO_PUSH_ACCESS_TOKEN ? { Authorization: `Bearer ${env.EXPO_PUSH_ACCESS_TOKEN}` } : {}),
    },
    body: JSON.stringify(messages),
  });
  const payload = await response.json() as { data?: Array<{ status: "ok" | "error"; id?: string; message?: string; details?: { error?: string } }>; errors?: unknown };
  if (!response.ok || !Array.isArray(payload.data))
    throw new Error(`Expo Push returned HTTP ${response.status}`);
  return payload.data;
}

export async function sendExpoPushToUser(
  database: Pool,
  env: PushEnv,
  userId: string,
  message: { title: string; body: string; deepLink?: string },
) {
  const result = await database.query<PushDevice>(
    `select id, expo_push_token, platform from app_push_device
      where user_id = $1 and enabled = true order by updated_at desc limit 20`,
    [userId],
  );
  const devices = result.rows;
  if (!devices.length) return { accepted: 0, failed: 0, tickets: [] as string[] };
  const tickets = await sendExpoRequest(env, devices.map((device) => ({
    to: device.expo_push_token,
    title: message.title.slice(0, 120),
    body: message.body.slice(0, 500),
    sound: "default",
    channelId: "default",
    data: message.deepLink ? { deepLink: message.deepLink } : {},
  })));
  let accepted = 0;
  const ticketIds: string[] = [];
  for (let index = 0; index < devices.length; index += 1) {
    const device = devices[index];
    const ticket = tickets[index];
    if (!device) continue;
    const ok = ticket?.status === "ok" && Boolean(ticket.id);
    if (ok) { accepted += 1; ticketIds.push(ticket.id!); }
    await database.query(
      `insert into app_push_delivery (id, user_id, device_id, ticket_id, status, error_code)
       values ($1, $2, $3, $4, $5, $6)`,
      [crypto.randomUUID(), userId, device.id, ticket?.id || null, ok ? "accepted" : "error", ticket?.details?.error || null],
    );
    await database.query(
      `update app_push_device set last_ticket_id = $2, last_error = $3, updated_at = current_timestamp,
              enabled = case when $3 = 'DeviceNotRegistered' then false else enabled end
        where id = $1`,
      [device.id, ticket?.id || null, ticket?.details?.error || ticket?.message || null],
    );
  }
  return { accepted, failed: devices.length - accepted, tickets: ticketIds };
}

const feature = new Hono<{ Bindings: AuthRuntimeEnv }>();

feature.get("/api/push/devices", (c) => withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
  const result = await database.query(`select id, platform, enabled, last_seen_at, last_error, created_at from app_push_device where user_id = $1 order by updated_at desc limit 20`, [session.user.id]);
  return c.json({ data: { devices: result.rows } }, 200, { "Cache-Control": "no-store" });
}));

feature.post("/api/push/devices", (c) => withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
  const body = await c.req.json<{ token?: string; projectId?: string; platform?: string }>();
  const token = String(body.token || "").trim();
  const projectId = String(body.projectId || "").trim();
  const platform = String(body.platform || "");
  const env = c.env as PushEnv;
  if (!expoToken.test(token) || projectId !== env.EXPO_PUSH_PROJECT_ID || !new Set(["ios", "android"]).has(platform))
    return c.json({ error: { code: "INVALID_PUSH_DEVICE", message: "Push token, project or platform is invalid." } }, 422);
  const id = crypto.randomUUID();
  const result = await database.query(
    `insert into app_push_device (id, user_id, expo_push_token, project_id, platform)
     values ($1, $2, $3, $4, $5)
     on conflict (expo_push_token) do update set user_id = excluded.user_id, project_id = excluded.project_id,
       platform = excluded.platform, enabled = true, last_seen_at = current_timestamp,
       last_error = null, updated_at = current_timestamp
     returning id, platform, enabled, last_seen_at`,
    [id, session.user.id, token, projectId, platform],
  );
  return c.json({ data: result.rows[0] }, 200, { "Cache-Control": "no-store" });
}));

feature.delete("/api/push/devices/:id", (c) => withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
  const result = await database.query(`delete from app_push_device where id = $1 and user_id = $2 returning id`, [c.req.param("id"), session.user.id]);
  if (!result.rows[0]) return c.json({ error: { code: "NOT_FOUND", message: "Push device not found." } }, 404);
  return c.body(null, 204);
}));

feature.post("/api/admin/push/test", (c) => withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const roles = String(session?.user?.role || "").split(",").map((role) => role.trim());
  if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
  if (!roles.includes("admin")) return c.json({ error: { code: "FORBIDDEN", message: "Admin role required." } }, 403);
  const result = await sendExpoPushToUser(database, c.env as PushEnv, session.user.id, { title: "Starter push test", body: "Expo Push delivery is configured.", deepLink: "/app/notifications" });
  return c.json({ data: result }, 200, { "Cache-Control": "no-store" });
}));

export const expoPushFeature = feature;
