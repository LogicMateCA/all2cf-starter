import { DurableObject } from "cloudflare:workers";
import { Hono } from "hono";
import { withRequestAuth, type AuthRuntimeEnv } from "../auth-runtime";

type RealtimeEnv = AuthRuntimeEnv & { STARTER_REALTIME: DurableObjectNamespace<StarterRealtimeRoom> };
type SocketAttachment = { userId: string };
type RoomMessage = { sequence: number; text: string; userId: string; sentAt: string };

const roomPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/u;

export class StarterRealtimeRoom extends DurableObject<AuthRuntimeEnv> {
  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/reset" && request.headers.get("x-starter-admin-test") === "1") {
      await this.ctx.storage.deleteAll();
      return Response.json({ ok: true });
    }
    if (request.method === "GET" && url.pathname === "/state") {
      const [sequence, lastMessage] = await Promise.all([
        this.ctx.storage.get<number>("sequence"),
        this.ctx.storage.get<RoomMessage>("lastMessage"),
      ]);
      return Response.json({ sequence: sequence || 0, lastMessage: lastMessage || null, connections: this.ctx.getWebSockets().length });
    }
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return new Response("WebSocket upgrade required.", { status: 426 });
    const userId = request.headers.get("x-starter-user-id") || "";
    if (!userId) return new Response("Authenticated user required.", { status: 401 });
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.serializeAttachment({ userId } satisfies SocketAttachment);
    this.ctx.acceptWebSocket(server, ["member"]);
    server.send(JSON.stringify({ type: "ready", connections: this.ctx.getWebSockets("member").length }));
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer) {
    const attachment = socket.deserializeAttachment() as SocketAttachment | null;
    if (!attachment?.userId || typeof raw !== "string") {
      socket.send(JSON.stringify({ type: "error", code: "INVALID_MESSAGE" }));
      return;
    }
    let text = "";
    try {
      const payload = JSON.parse(raw) as { type?: string; text?: string };
      if (payload.type === "message") text = String(payload.text || "").trim();
    } catch {
      // Invalid JSON is handled by the bounded error below.
    }
    if (!text || text.length > 1000) {
      socket.send(JSON.stringify({ type: "error", code: "INVALID_MESSAGE" }));
      return;
    }
    const message = await this.ctx.storage.transaction(async (transaction) => {
      const sequence = (await transaction.get<number>("sequence") || 0) + 1;
      const next: RoomMessage = { sequence, text, userId: attachment.userId, sentAt: new Date().toISOString() };
      await transaction.put({ sequence, lastMessage: next });
      return next;
    });
    const encoded = JSON.stringify({ type: "message", ...message });
    for (const peer of this.ctx.getWebSockets("member")) peer.send(encoded);
  }

  override webSocketClose(socket: WebSocket, code: number, reason: string) {
    socket.close(code, reason);
  }
}

function socketMessage(socket: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Realtime room WebSocket timed out.")), 3000);
    socket.addEventListener("message", (event) => {
      clearTimeout(timeout);
      resolve(String(event.data));
    }, { once: true });
  });
}

const feature = new Hono<{ Bindings: AuthRuntimeEnv }>();

feature.all("/api/realtime/rooms/:roomId", (c) => withRequestAuth(c.env, c.executionCtx, async (auth) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
  const roomId = c.req.param("roomId");
  if (!roomPattern.test(roomId)) return c.json({ error: { code: "INVALID_ROOM", message: "Room ID must be 1-64 safe characters." } }, 400);
  const headers = new Headers(c.req.raw.headers);
  headers.set("x-starter-user-id", session.user.id);
  return (c.env as RealtimeEnv).STARTER_REALTIME.getByName(roomId).fetch(new Request(c.req.raw, { headers }));
}));

feature.post("/api/admin/realtime/test", (c) => withRequestAuth(c.env, c.executionCtx, async (auth) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const roles = String(session?.user?.role || "").split(",").map((role) => role.trim());
  if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
  if (!roles.includes("admin")) return c.json({ error: { code: "FORBIDDEN", message: "Admin role required." } }, 403);
  const stub = (c.env as RealtimeEnv).STARTER_REALTIME.getByName("starter-admin-test");
  await stub.fetch("https://realtime.internal/reset", { method: "POST", headers: { "x-starter-admin-test": "1" } });
  const upgrade = await stub.fetch("https://realtime.internal/socket", { headers: { Upgrade: "websocket", "x-starter-user-id": session.user.id } });
  const socket = upgrade.webSocket;
  if (!socket) throw new Error("Durable Object did not return a WebSocket.");
  socket.accept();
  const ready = JSON.parse(await socketMessage(socket)) as { type?: string };
  socket.send(JSON.stringify({ type: "message", text: "STARTER_REALTIME_OK" }));
  const message = JSON.parse(await socketMessage(socket)) as { type?: string; sequence?: number; text?: string; userId?: string };
  socket.close(1000, "test complete");
  const state = await (await stub.fetch("https://realtime.internal/state")).json<{
    sequence: number;
    lastMessage: RoomMessage | null;
  }>();
  return c.json({ data: { ready, message, state } }, 200, { "Cache-Control": "no-store" });
}));

export const realtimeRoomFeature = feature;
