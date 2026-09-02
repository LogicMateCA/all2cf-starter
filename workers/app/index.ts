import { Hono, type Context } from "hono";
import { isAPIError } from "better-auth/api";
import { withRequestAuth, type AuthRuntimeEnv } from "./auth-runtime";
import { socialProviderMethods } from "../../scripts/lib/social-providers.mjs";
import { workerCapabilityRoutePaths } from "./generated/capability-routes";
import { selectedWorkerFeatures } from "./generated/worker-features";
import { selectedWorkerEvents } from "./generated/worker-events";
import { collectOperationsHealth } from "./operations-health";
import { createDatabaseClient } from "./database-runtime";
export * from "./generated/workflow-exports";
export * from "./generated/durable-object-exports";

type AppVariables = {
  requestId: string;
};

type AppBindings = Omit<AuthRuntimeEnv, "APP_ENV"> & {
  APP_ENV: string;
  ASSETS: Env["ASSETS"];
};

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();
type StarterContext = Context<{
  Bindings: AppBindings;
  Variables: AppVariables;
}>;

const supportKinds = new Set(["support", "bug"]);
const supportStatuses = new Set(["open", "in_progress", "resolved", "closed"]);
const supportPriorities = new Set(["low", "normal", "high"]);
const supportVisibilities = new Set(["public", "internal"]);

function boundedQueryValue(value: string | undefined, maximum: number) {
  const normalized = value?.trim();
  return normalized && normalized.length <= maximum ? normalized : undefined;
}

function validAuditDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

function parseAuditCursor(value: string | undefined) {
  if (!value) return undefined;
  const separator = value.lastIndexOf("|");
  if (separator <= 0 || separator === value.length - 1) return null;
  const createdAt = validAuditDate(value.slice(0, separator));
  const id = boundedQueryValue(value.slice(separator + 1), 128);
  return createdAt && id ? { createdAt, id } : null;
}

for (const feature of selectedWorkerFeatures) app.route("/", feature);

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

app.use("*", async (c, next) => {
  c.set("requestId", crypto.randomUUID());
  await next();
});

app.on(["GET", "POST"], "/api/auth/*", (c) =>
  withRequestAuth(c.env, c.executionCtx, (auth) => auth.handler(c.req.raw)),
);

app.get("/api/auth-methods", (c) => {
  return c.json(
    {
      methods: socialProviderMethods(c.env),
      antiAbuse: {
        provider: c.env.TURNSTILE_PROVIDER === "turnstile" ? "turnstile" : "none",
        siteKey: c.env.TURNSTILE_PROVIDER === "turnstile" ? c.env.TURNSTILE_SITE_KEY || "" : "",
      },
    },
    200,
    { "Cache-Control": "no-store" },
  );
});

app.get("/api/session", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user)
      return c.json(
        {
          error: { code: "UNAUTHORIZED", message: "Authentication required." },
        },
        401,
        { "Cache-Control": "no-store" },
      );
    return c.json({ data: session }, 200, { "Cache-Control": "no-store" });
  }),
);

app.get("/api/preferences", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth) => {
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
      {
        data: {
          theme: session.user.theme || "system",
          locale: session.user.locale || "en",
        },
      },
      200,
      { "Cache-Control": "no-store" },
    );
  }),
);

app.put("/api/preferences", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth) => {
    const body = await c.req.json<{ theme?: string; locale?: string }>();
    if (!new Set(["system", "light", "dark"]).has(body.theme || ""))
      return c.json(
        {
          error: {
            code: "INVALID_THEME",
            message: "Theme must be system, light, or dark.",
          },
        },
        400,
      );
    if (!new Set(["en", "zh"]).has(body.locale || ""))
      return c.json(
        {
          error: {
            code: "INVALID_LOCALE",
            message: "Locale must be en or zh.",
          },
        },
        400,
      );
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user)
      return c.json(
        {
          error: { code: "UNAUTHORIZED", message: "Authentication required." },
        },
        401,
        { "Cache-Control": "no-store" },
      );
    await auth.api.updateUser({
      headers: c.req.raw.headers,
      body: { theme: body.theme, locale: body.locale },
    });
    return c.json({ data: { theme: body.theme, locale: body.locale } }, 200, {
      "Cache-Control": "no-store",
    });
  }),
);

app.get("/api/notifications", (c) =>
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
    const rawLimit = Number(c.req.query("limit") || 20);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(Math.floor(rawLimit), 1), 50)
      : 20;
    const result = await database.query(
      `select id, category, title, body, deep_link, read_at, created_at
       from app_notification where recipient_user_id = $1 order by created_at desc limit $2`,
      [session.user.id, limit],
    );
    const unread = await database.query<{ count: string }>(
      `select count(*)::text as count from app_notification where recipient_user_id = $1 and read_at is null`,
      [session.user.id],
    );
    return c.json(
      {
        data: {
          notifications: result.rows,
          unreadCount: Number(unread.rows[0]?.count || 0),
        },
      },
      200,
      { "Cache-Control": "no-store" },
    );
  }),
);

app.get("/api/notifications/unread-count", (c) =>
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
    const result = await database.query<{ count: string }>(
      `select count(*)::text as count from app_notification where recipient_user_id = $1 and read_at is null`,
      [session.user.id],
    );
    return c.json(
      { data: { unreadCount: Number(result.rows[0]?.count || 0) } },
      200,
      { "Cache-Control": "no-store" },
    );
  }),
);

app.patch("/api/notifications/:id/read", (c) =>
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
    const result = await database.query(
      `update app_notification set read_at = coalesce(read_at, current_timestamp)
       where id = $1 and recipient_user_id = $2
       returning id, category, title, body, deep_link, read_at, created_at`,
      [c.req.param("id"), session.user.id],
    );
    if (!result.rows[0])
      return c.json(
        { error: { code: "NOT_FOUND", message: "Notification not found." } },
        404,
        { "Cache-Control": "no-store" },
      );
    return c.json({ data: result.rows[0] }, 200, {
      "Cache-Control": "no-store",
    });
  }),
);

app.post("/api/notifications/read-all", (c) =>
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
    const result = await database.query<{ count: string }>(
      `with marked as (
         update app_notification set read_at = current_timestamp
         where recipient_user_id = $1 and read_at is null returning id
       ) select count(*)::text as count from marked`,
      [session.user.id],
    );
    return c.json(
      { data: { markedRead: Number(result.rows[0]?.count || 0) } },
      200,
      { "Cache-Control": "no-store" },
    );
  }),
);

app.get("/api/admin/announcements", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user)
      return c.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
        401,
        { "Cache-Control": "no-store" },
      );
    if (!isPlatformAdmin(session.user))
      return c.json(
        { error: { code: "FORBIDDEN", message: "Admin role required." } },
        403,
        { "Cache-Control": "no-store" },
      );
    const result = await database.query(
      `select id, title, body, deep_link, created_by_user_id, created_at
       from app_announcement order by created_at desc, id desc limit 50`,
    );
    return c.json({ data: result.rows }, 200, { "Cache-Control": "no-store" });
  }),
);

app.post("/api/admin/announcements", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user)
      return c.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
        401,
        { "Cache-Control": "no-store" },
      );
    if (!isPlatformAdmin(session.user))
      return c.json(
        { error: { code: "FORBIDDEN", message: "Admin role required." } },
        403,
        { "Cache-Control": "no-store" },
      );
    const body = await c.req.json<{
      title?: unknown;
      body?: unknown;
      deepLink?: unknown;
    }>();
    const title = String(body.title || "").trim();
    const message = String(body.body || "").trim();
    const deepLink = String(body.deepLink || "/app/notifications").trim();
    if (title.length < 3 || title.length > 160)
      return c.json(
        { error: { code: "INVALID_TITLE", message: "Title must contain 3-160 characters." } },
        400,
      );
    if (message.length < 10 || message.length > 2000)
      return c.json(
        { error: { code: "INVALID_BODY", message: "Body must contain 10-2000 characters." } },
        400,
      );
    if (!deepLink.startsWith("/") || deepLink.startsWith("//") || deepLink.length > 500)
      return c.json(
        { error: { code: "INVALID_DEEP_LINK", message: "Deep link must be a same-origin path." } },
        400,
      );
    const client = await database.connect();
    try {
      await client.query("begin");
      const recent = await client.query<{ count: string }>(
        `select count(*)::text as count from app_announcement
         where created_by_user_id = $1 and created_at > current_timestamp - interval '1 hour'`,
        [session.user.id],
      );
      if (Number(recent.rows[0]?.count || 0) >= 10) {
        await client.query("rollback");
        return c.json(
          { error: { code: "ANNOUNCEMENT_RATE_LIMIT", message: "At most 10 announcements may be published per hour." } },
          429,
        );
      }
      const announcementId = crypto.randomUUID();
      await client.query(
        `insert into app_announcement
         (id, title, body, deep_link, created_by_user_id)
         values ($1, $2, $3, $4, $5)`,
        [announcementId, title, message, deepLink, session.user.id],
      );
      const delivered = await client.query<{ count: string }>(
        `with inserted as (
           insert into app_notification
             (id, recipient_user_id, category, title, body, deep_link)
           select $1 || ':' || id, id, 'announcement', $2, $3, $4
           from app_user
           where email_verified = true and coalesce(banned, false) = false
           returning id
         ) select count(*)::text as count from inserted`,
        [announcementId, title, message, deepLink],
      );
      await client.query(
        `insert into app_admin_audit_event
         (id, actor_user_id, action, target_type, target_id, metadata)
         values ($1, $2, 'announcement.published', 'announcement', $3,
                 jsonb_build_object('recipientCount', $4::int, 'deepLink', $5::text))`,
        [
          crypto.randomUUID(),
          session.user.id,
          announcementId,
          Number(delivered.rows[0]?.count || 0),
          deepLink,
        ],
      );
      await client.query("commit");
      return c.json(
        {
          data: {
            id: announcementId,
            title,
            body: message,
            deep_link: deepLink,
            recipientCount: Number(delivered.rows[0]?.count || 0),
          },
        },
        201,
        { "Cache-Control": "no-store" },
      );
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }),
);

app.post("/api/auth-flow/check-email", async (c) => {
  const body = await c.req.json<{ email?: string }>();
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email))
    return c.json(
      {
        error: {
          code: "INVALID_EMAIL",
          message: "Enter a valid email address.",
        },
      },
      400,
    );
  const client = createDatabaseClient(c.env, `${c.env.SERVICE_NAME}-admin`);
  try {
    await client.connect();
    const result = await client.query<{
      id: string;
      name: string;
      email_verified: boolean;
      has_password: boolean;
      linked_providers: string[] | null;
    }>(
      `select u.id, u.name, u.email_verified,
        exists(select 1 from app_account a where a.user_id = u.id and a.provider_id = 'credential' and a.password is not null) as has_password,
        array_remove(array_agg(a.provider_id) filter (where a.provider_id <> 'credential'), null) as linked_providers
       from app_user u left join app_account a on a.user_id = u.id
       where u.email = $1
       group by u.id, u.name, u.email_verified
       limit 1`,
      [email],
    );
    const user = result.rows[0];
    return c.json(
      {
        data: user
          ? {
              exists: true,
              name: user.name,
              emailVerified: user.email_verified,
              hasPassword: user.has_password,
              linkedProviders: user.linked_providers || [],
            }
          : { exists: false },
      },
      200,
      { "Cache-Control": "no-store" },
    );
  } finally {
    await client.end().catch(() => undefined);
  }
});

app.post("/api/auth-flow/register", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth) => {
    const body = await c.req.json<{
      email?: string;
      password?: string;
      confirmPassword?: string;
      name?: string;
    }>();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");
    const confirmPassword = String(body.confirmPassword || "");
    const name =
      String(body.name || "").trim() || email.split("@")[0] || "user";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email))
      return c.json(
        {
          error: {
            code: "INVALID_EMAIL",
            message: "Enter a valid email address.",
          },
        },
        400,
      );
    if (password.length < 8 || password.length > 128)
      return c.json(
        {
          error: {
            code: "INVALID_PASSWORD",
            message: "Password must be between 8 and 128 characters.",
          },
        },
        400,
      );
    if (password !== confirmPassword)
      return c.json(
        {
          error: {
            code: "PASSWORD_MISMATCH",
            message: "Passwords do not match.",
          },
        },
        400,
      );

    try {
      await auth.api.signUpEmail({
        headers: c.req.raw.headers,
        body: {
          email,
          password,
          name,
          callbackURL: `${c.env.AUTH_CANONICAL_ORIGIN}/login?verified=1`,
        },
      });
    } catch (error) {
      if (!isAPIError(error) || error.statusCode >= 500) throw error;
      console.info(
        JSON.stringify({
          event: "auth_registration_not_accepted",
          requestId: c.var.requestId,
          status: error.statusCode,
        }),
      );
    }
    return c.json(
      {
        data: {
          accepted: true,
          message:
            "If this email can be registered, verification instructions will be sent.",
        },
      },
      202,
      { "Cache-Control": "no-store" },
    );
  }),
);

app.get("/api/support/tickets", (c) =>
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
    const result = await database.query(
      `select id, kind, subject, body, status, priority, assigned_to_user_id, created_at, updated_at, resolved_at
       from app_support_ticket where created_by_user_id = $1 order by created_at desc limit 50`,
      [session.user.id],
    );
    return c.json({ data: result.rows }, 200, { "Cache-Control": "no-store" });
  }),
);

app.post("/api/support/tickets", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user || !session.user.emailVerified)
      return c.json(
        {
          error: {
            code: "VERIFIED_ACCOUNT_REQUIRED",
            message: "A verified account is required.",
          },
        },
        401,
        { "Cache-Control": "no-store" },
      );
    const body = await c.req.json<{
      kind?: string;
      subject?: string;
      body?: string;
    }>();
    const kind = String(body.kind || "").trim();
    const subject = String(body.subject || "").trim();
    const description = String(body.body || "").trim();
    if (!supportKinds.has(kind))
      return c.json(
        {
          error: {
            code: "INVALID_KIND",
            message: "Kind must be support or bug.",
          },
        },
        400,
      );
    if (subject.length < 3 || subject.length > 160)
      return c.json(
        {
          error: {
            code: "INVALID_SUBJECT",
            message: "Subject must be between 3 and 160 characters.",
          },
        },
        400,
      );
    if (description.length < 10 || description.length > 5000)
      return c.json(
        {
          error: {
            code: "INVALID_BODY",
            message: "Description must be between 10 and 5000 characters.",
          },
        },
        400,
      );
    const recent = await database.query<{ count: string }>(
      "select count(*)::text as count from app_support_ticket where created_by_user_id = $1 and created_at > now() - interval '1 hour'",
      [session.user.id],
    );
    if (Number(recent.rows[0]?.count || 0) >= 5)
      return c.json(
        {
          error: { code: "RATE_LIMITED", message: "Too many recent tickets." },
        },
        429,
      );
    const id = crypto.randomUUID();
    const client = await database.connect();
    try {
      await client.query("begin");
      const result = await client.query(
        `insert into app_support_ticket (id, created_by_user_id, contact_email, kind, subject, body)
         values ($1, $2, $3, $4, $5, $6)
         returning id, kind, subject, body, status, priority, assigned_to_user_id, created_at, updated_at, resolved_at`,
        [id, session.user.id, session.user.email, kind, subject, description],
      );
      await client.query(
        `insert into app_notification (id, recipient_user_id, category, title, body, deep_link)
         select gen_random_uuid()::text, id, 'support', 'New support ticket', $1, '/admin'
         from app_user where 'admin' = any(string_to_array(replace(coalesce(role, ''), ' ', ''), ','))`,
        [subject],
      );
      await client.query("commit");
      return c.json({ data: result.rows[0] }, 201, {
        "Cache-Control": "no-store",
      });
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }),
);

app.get("/api/support/tickets/:id", (c) =>
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
    const ticketId = c.req.param("id");
    const ticket = await database.query(
      `select id, kind, subject, body, status, priority, assigned_to_user_id, created_at, updated_at, resolved_at
       from app_support_ticket where id = $1 and created_by_user_id = $2`,
      [ticketId, session.user.id],
    );
    if (!ticket.rows[0])
      return c.json(
        { error: { code: "NOT_FOUND", message: "Ticket not found." } },
        404,
        { "Cache-Control": "no-store" },
      );
    const messages = await database.query(
      `select id, author_role, visibility, body, created_at
       from app_support_message where ticket_id = $1 and visibility = 'public' order by created_at asc limit 200`,
      [ticketId],
    );
    return c.json(
      { data: { ticket: ticket.rows[0], messages: messages.rows } },
      200,
      { "Cache-Control": "no-store" },
    );
  }),
);

app.post("/api/support/tickets/:id/messages", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user || !session.user.emailVerified)
      return c.json(
        {
          error: {
            code: "VERIFIED_ACCOUNT_REQUIRED",
            message: "A verified account is required.",
          },
        },
        401,
        { "Cache-Control": "no-store" },
      );
    const body = await c.req.json<{ body?: string }>();
    const message = String(body.body || "").trim();
    if (message.length < 1 || message.length > 5000)
      return c.json(
        {
          error: {
            code: "INVALID_BODY",
            message: "Reply must be between 1 and 5000 characters.",
          },
        },
        400,
      );
    const ticketId = c.req.param("id");
    const client = await database.connect();
    try {
      await client.query("begin");
      const ticket = await client.query<{ subject: string; status: string }>(
        `select subject, status from app_support_ticket where id = $1 and created_by_user_id = $2 for update`,
        [ticketId, session.user.id],
      );
      if (!ticket.rows[0]) {
        await client.query("rollback");
        return c.json(
          { error: { code: "NOT_FOUND", message: "Ticket not found." } },
          404,
        );
      }
      if (ticket.rows[0].status === "closed") {
        await client.query("rollback");
        return c.json(
          {
            error: {
              code: "TICKET_CLOSED",
              message: "Closed tickets cannot receive replies.",
            },
          },
          409,
        );
      }
      const recent = await client.query<{ count: string }>(
        `select count(*)::text as count from app_support_message where author_user_id = $1 and created_at > now() - interval '1 hour'`,
        [session.user.id],
      );
      if (Number(recent.rows[0]?.count || 0) >= 20) {
        await client.query("rollback");
        return c.json(
          {
            error: {
              code: "RATE_LIMITED",
              message: "Too many recent replies.",
            },
          },
          429,
        );
      }
      const messageId = crypto.randomUUID();
      const result = await client.query(
        `insert into app_support_message (id, ticket_id, author_user_id, author_role, visibility, body)
         values ($1, $2, $3, 'customer', 'public', $4)
         returning id, author_role, visibility, body, created_at`,
        [messageId, ticketId, session.user.id, message],
      );
      await client.query(
        `update app_support_ticket set status = case when status = 'resolved' then 'open' else status end, updated_at = now(), resolved_at = null where id = $1`,
        [ticketId],
      );
      await client.query(
        `insert into app_notification (id, recipient_user_id, category, title, body, deep_link)
         select gen_random_uuid()::text, id, 'support', 'Customer replied', $1, '/admin'
         from app_user where 'admin' = any(string_to_array(replace(coalesce(role, ''), ' ', ''), ','))`,
        [ticket.rows[0].subject],
      );
      await client.query("commit");
      return c.json({ data: result.rows[0] }, 201, {
        "Cache-Control": "no-store",
      });
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }),
);

app.get("/api/admin/support/tickets", (c) =>
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
    const requestedStatus = c.req.query("status");
    if (requestedStatus && !supportStatuses.has(requestedStatus))
      return c.json(
        {
          error: { code: "INVALID_STATUS", message: "Unknown ticket status." },
        },
        400,
      );
    const result = await database.query(
      `select id, created_by_user_id, contact_email, kind, subject, body, status, priority, assigned_to_user_id, created_at, updated_at, resolved_at
       from app_support_ticket where ($1::text is null or status = $1) order by updated_at desc limit 100`,
      [requestedStatus || null],
    );
    return c.json({ data: result.rows }, 200, { "Cache-Control": "no-store" });
  }),
);

app.get("/api/admin/support/tickets/:id", (c) =>
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
    const ticketId = c.req.param("id");
    const [ticket, messages, attachments] = await Promise.all([
      database.query(
        `select id, created_by_user_id, contact_email, kind, subject, body, status, priority, assigned_to_user_id, created_at, updated_at, resolved_at from app_support_ticket where id = $1`,
        [ticketId],
      ),
      database.query(
        `select id, author_user_id, author_role, visibility, body, created_at from app_support_message where ticket_id = $1 order by created_at asc limit 300`,
        [ticketId],
      ),
      database.query(
        `select id, message_id, file_name, media_type, byte_size, status, created_at from app_support_attachment where ticket_id = $1 order by created_at asc limit 100`,
        [ticketId],
      ),
    ]);
    if (!ticket.rows[0])
      return c.json(
        { error: { code: "NOT_FOUND", message: "Ticket not found." } },
        404,
        { "Cache-Control": "no-store" },
      );
    return c.json(
      {
        data: {
          ticket: ticket.rows[0],
          messages: messages.rows,
          attachments: attachments.rows,
        },
      },
      200,
      { "Cache-Control": "no-store" },
    );
  }),
);

app.post("/api/admin/support/tickets/:id/messages", (c) =>
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
    const body = await c.req.json<{ body?: string; visibility?: string }>();
    const message = String(body.body || "").trim();
    const visibility = String(body.visibility || "public").trim();
    if (message.length < 1 || message.length > 5000)
      return c.json(
        {
          error: {
            code: "INVALID_BODY",
            message: "Reply must be between 1 and 5000 characters.",
          },
        },
        400,
      );
    if (!supportVisibilities.has(visibility))
      return c.json(
        {
          error: {
            code: "INVALID_VISIBILITY",
            message: "Visibility must be public or internal.",
          },
        },
        400,
      );
    const ticketId = c.req.param("id");
    const client = await database.connect();
    try {
      await client.query("begin");
      const ticket = await client.query<{
        created_by_user_id: string | null;
        subject: string;
      }>(
        `select created_by_user_id, subject from app_support_ticket where id = $1 for update`,
        [ticketId],
      );
      if (!ticket.rows[0]) {
        await client.query("rollback");
        return c.json(
          { error: { code: "NOT_FOUND", message: "Ticket not found." } },
          404,
        );
      }
      const messageId = crypto.randomUUID();
      const result = await client.query(
        `insert into app_support_message (id, ticket_id, author_user_id, author_role, visibility, body)
         values ($1, $2, $3, 'admin', $4, $5)
         returning id, author_user_id, author_role, visibility, body, created_at`,
        [messageId, ticketId, session.user.id, visibility, message],
      );
      await client.query(
        `update app_support_ticket set status = case when $2 = 'public' and status = 'open' then 'in_progress' else status end, updated_at = now() where id = $1`,
        [ticketId, visibility],
      );
      await client.query(
        `insert into app_admin_audit_event (id, actor_user_id, action, target_type, target_id, metadata)
         values ($1, $2, $3, 'support_ticket', $4, jsonb_build_object('messageId', $5::text, 'visibility', $6::text))`,
        [
          crypto.randomUUID(),
          session.user.id,
          visibility === "internal"
            ? "support.note.created"
            : "support.reply.created",
          ticketId,
          messageId,
          visibility,
        ],
      );
      if (visibility === "public" && ticket.rows[0].created_by_user_id)
        await client.query(
          `insert into app_notification (id, recipient_user_id, category, title, body, deep_link)
           values ($1, $2, 'support', 'Support replied', $3, $4)`,
          [
            crypto.randomUUID(),
            ticket.rows[0].created_by_user_id,
            ticket.rows[0].subject,
            `/support?ticket=${encodeURIComponent(ticketId)}`,
          ],
        );
      await client.query("commit");
      return c.json({ data: result.rows[0] }, 201, {
        "Cache-Control": "no-store",
      });
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }),
);

app.patch("/api/admin/support/tickets/:id", (c) =>
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
    const body = await c.req.json<{
      status?: string;
      priority?: string;
      assignedToUserId?: string | null;
    }>();
    const status = String(body.status || "").trim();
    const priority = String(body.priority || "normal").trim();
    if (!supportStatuses.has(status))
      return c.json(
        {
          error: { code: "INVALID_STATUS", message: "Unknown ticket status." },
        },
        400,
      );
    if (!supportPriorities.has(priority))
      return c.json(
        {
          error: {
            code: "INVALID_PRIORITY",
            message: "Unknown ticket priority.",
          },
        },
        400,
      );
    const assignedToUserId = body.assignedToUserId
      ? String(body.assignedToUserId)
      : null;
    const ticketId = c.req.param("id");
    const client = await database.connect();
    try {
      await client.query("begin");
      if (assignedToUserId) {
        const assignee = await client.query<{ role: string }>(
          `select role from app_user where id = $1`,
          [assignedToUserId],
        );
        const assigneeRoles = String(assignee.rows[0]?.role || "")
          .split(",")
          .map((value) => value.trim());
        if (!assigneeRoles.includes("admin")) {
          await client.query("rollback");
          return c.json(
            {
              error: {
                code: "INVALID_ASSIGNEE",
                message: "Assignee must be a platform admin.",
              },
            },
            400,
          );
        }
      }
      const result = await client.query(
        `update app_support_ticket set status = $2, priority = $3, assigned_to_user_id = $4, updated_at = now(), resolved_at = case when $2 in ('resolved', 'closed') then coalesce(resolved_at, now()) else null end
         where id = $1 returning id, kind, subject, body, status, priority, assigned_to_user_id, created_at, updated_at, resolved_at`,
        [ticketId, status, priority, assignedToUserId],
      );
      if (!result.rows[0]) {
        await client.query("rollback");
        return c.json(
          { error: { code: "NOT_FOUND", message: "Ticket not found." } },
          404,
        );
      }
      await client.query(
        `insert into app_admin_audit_event (id, actor_user_id, action, target_type, target_id, metadata)
         values ($1, $2, 'support.ticket.updated', 'support_ticket', $3, jsonb_build_object('status', $4::text, 'priority', $5::text, 'assignedToUserId', $6::text))`,
        [
          crypto.randomUUID(),
          session.user.id,
          ticketId,
          status,
          priority,
          assignedToUserId,
        ],
      );
      await client.query("commit");
      return c.json({ data: result.rows[0] }, 200, {
        "Cache-Control": "no-store",
      });
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }),
);

type SiteIntegrationProvider = "cloudflare-web-analytics" | "google-analytics" | "google-tag-manager" | "plausible" | "custom-external";
type SiteIntegrationInput = {
  name?: string;
  provider?: SiteIntegrationProvider;
  status?: "draft" | "published" | "disabled";
  environment?: "development" | "production";
  surfaces?: string[];
  config?: Record<string, unknown>;
};
const siteIntegrationProviders = new Set<SiteIntegrationProvider>(["cloudflare-web-analytics", "google-analytics", "google-tag-manager", "plausible", "custom-external"]);
const siteIntegrationSurfaces = new Set(["marketing", "web", "docs"]);
function normalizeSiteIntegration(input: SiteIntegrationInput) {
  const name = String(input.name || "").trim();
  const provider = String(input.provider || "") as SiteIntegrationProvider;
  const status = input.status === "published" || input.status === "disabled" ? input.status : "draft";
  const environment = input.environment === "production" ? "production" : "development";
  const surfaces = [...new Set((input.surfaces || []).map(String).filter((surface) => siteIntegrationSurfaces.has(surface)))];
  const config = input.config && typeof input.config === "object" ? input.config : {};
  if (name.length < 2 || name.length > 80) throw new Error("Integration name must be between 2 and 80 characters");
  if (!siteIntegrationProviders.has(provider)) throw new Error("Analytics provider is not supported");
  if (!surfaces.length) throw new Error("Select at least one site surface");
  const identifier = String(config.identifier || "").trim();
  if (["cloudflare-web-analytics", "google-analytics", "google-tag-manager"].includes(provider) && !identifier)
    throw new Error("This provider requires its public site identifier");
  if (provider === "plausible" && !String(config.domain || "").trim()) throw new Error("Plausible requires a tracked domain");
  if (provider === "custom-external") {
    const code = String(config.code || config.source || "").trim();
    const externalSources: string[] = [];
    const inlineParts: string[] = [];
    if (!code && (Array.isArray(config.externalSources) || typeof config.inlineCode === "string")) {
      for (const source of Array.isArray(config.externalSources) ? config.externalSources : []) {
        const url = new URL(String(source));
        if (url.protocol !== "https:") throw new Error("External script sources must use HTTPS");
        externalSources.push(url.toString());
      }
      if (String(config.inlineCode || "").trim()) inlineParts.push(String(config.inlineCode).trim());
    } else {
      if (!code || code.length > 50_000) throw new Error("Custom code must be between 1 and 50,000 characters");
      const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/giu;
      let matched = false;
      for (const match of code.matchAll(scriptPattern)) {
        matched = true;
        const source = (match[1] || "").match(/\bsrc\s*=\s*["']([^"']+)["']/iu)?.[1];
        if (source) {
          const url = new URL(source);
          if (url.protocol !== "https:") throw new Error("External script sources must use HTTPS");
          externalSources.push(url.toString());
        }
        if ((match[2] || "").trim()) inlineParts.push((match[2] || "").trim());
      }
      if (!matched) inlineParts.push(code);
    }
    if (inlineParts.join("\n\n").length > 50_000) throw new Error("Custom code must not exceed 50,000 characters");
    config.externalSources = [...new Set(externalSources)];
    config.inlineCode = inlineParts.join("\n\n");
    delete config.code;
    delete config.source;
  }
  const cspSources: { scriptSrc: string[]; connectSrc: string[]; imgSrc: string[] } = { scriptSrc: [], connectSrc: [], imgSrc: [] };
  if (provider === "cloudflare-web-analytics") {
    cspSources.scriptSrc.push("https://static.cloudflareinsights.com");
    cspSources.connectSrc.push("https://cloudflareinsights.com", "'self'");
  } else if (provider === "google-analytics" || provider === "google-tag-manager") {
    cspSources.scriptSrc.push("https://www.googletagmanager.com");
    cspSources.connectSrc.push("https://www.google-analytics.com", "https://region1.google-analytics.com");
    cspSources.imgSrc.push("https://www.google-analytics.com");
  } else if (provider === "plausible") {
    const source = new URL(String(config.source || "https://plausible.io/js/script.js"));
    cspSources.scriptSrc.push(source.origin);
    cspSources.connectSrc.push(source.origin);
    config.source = source.toString();
  } else if (provider === "custom-external") for (const source of config.externalSources as string[]) cspSources.scriptSrc.push(new URL(source).origin);
  return { name, provider, status, environment, surfaces, config, cspSources };
}

app.get("/api/public/site-integrations.js", async (c) => {
  const surface = String(c.req.query("surface") || "web");
  if (!siteIntegrationSurfaces.has(surface)) return c.text("/* Unknown site surface. */", 400, { "Content-Type": "application/javascript; charset=utf-8" });
  const environment = c.env.APP_ENV === "production" ? "production" : "development";
  const database = createDatabaseClient(c.env, `${c.env.SERVICE_NAME}-site-integrations`);
  try {
    await database.connect();
    const result = await database.query<{ id: string; provider: SiteIntegrationProvider; config: Record<string, unknown> }>(
      `select id, provider, config from app_site_integration
       where status = 'published' and environment = $1 and $2 = any(surfaces)
       order by created_at asc`,
      [environment, surface],
    );
    const integrations = JSON.stringify(result.rows).replaceAll("<", "\\u003c");
    const source = `(()=>{if(["/admin","/login","/setup","/factory","/maintenance","/update","/all2cf"].some(p=>location.pathname===p||location.pathname.startsWith(p+"/")))return;const items=${integrations};const add=(src,attrs={})=>{const s=document.createElement("script");s.src=src;s.async=true;for(const[k,v]of Object.entries(attrs))s.setAttribute(k,String(v));document.head.appendChild(s)};for(const item of items){const c=item.config||{};if(item.provider==="cloudflare-web-analytics")add("https://static.cloudflareinsights.com/beacon.min.js",{"type":"module","data-cf-beacon":JSON.stringify({token:c.identifier,spa:true})});else if(item.provider==="google-analytics"){self.dataLayer=self.dataLayer||[];self.gtag=self.gtag||function(){dataLayer.push(arguments)};gtag("js",new Date());gtag("config",c.identifier);add("https://www.googletagmanager.com/gtag/js?id="+encodeURIComponent(c.identifier))}else if(item.provider==="google-tag-manager"){self.dataLayer=self.dataLayer||[];dataLayer.push({"gtm.start":Date.now(),event:"gtm.js"});add("https://www.googletagmanager.com/gtm.js?id="+encodeURIComponent(c.identifier))}else if(item.provider==="plausible")add(c.source||"https://plausible.io/js/script.js",{"data-domain":c.domain});else if(item.provider==="custom-external"){for(const src of c.externalSources||[])add(src);if(c.inlineCode)add("/api/public/site-integrations/"+encodeURIComponent(item.id)+"/code.js")}}})();`;
    return c.text(source, 200, { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "public, max-age=60, stale-while-revalidate=300", "X-Content-Type-Options": "nosniff" });
  } catch (error) {
    console.error("site_integrations_loader_failed", error);
    return c.text("/* Site integrations are temporarily unavailable. */", 200, { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-store" });
  } finally {
    await database.end().catch(() => undefined);
  }
});

app.get("/api/public/site-integrations/:id/code.js", async (c) => {
  const environment = c.env.APP_ENV === "production" ? "production" : "development";
  const database = createDatabaseClient(c.env, `${c.env.SERVICE_NAME}-site-integration-code`);
  try {
    await database.connect();
    const result = await database.query<{ config: Record<string, unknown> }>(`select config from app_site_integration where id=$1 and provider='custom-external' and status='published' and environment=$2`, [c.req.param("id"), environment]);
    if (!result.rows[0]) return c.text("/* Integration unavailable. */", 404, { "Content-Type": "application/javascript; charset=utf-8" });
    return c.text(String(result.rows[0].config.inlineCode || ""), 200, { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "public, max-age=60", "X-Content-Type-Options": "nosniff" });
  } finally {
    await database.end().catch(() => undefined);
  }
});

app.get("/api/admin/site-integrations", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
    if (!isPlatformAdmin(session.user)) return c.json({ error: { code: "FORBIDDEN", message: "Admin role required." } }, 403);
    const result = await database.query(
      `select id, name, provider, status, environment, surfaces, config, csp_sources, version, published_at, created_at, updated_at
       from app_site_integration order by updated_at desc`,
    );
    return c.json({ data: result.rows }, 200, { "Cache-Control": "no-store" });
  }),
);

app.post("/api/admin/site-integrations", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
    if (!isPlatformAdmin(session.user)) return c.json({ error: { code: "FORBIDDEN", message: "Admin role required." } }, 403);
    try {
      const normalized = normalizeSiteIntegration(await c.req.json<SiteIntegrationInput>());
      const id = crypto.randomUUID();
      const client = await database.connect();
      try {
        await client.query("begin");
        const result = await client.query(
          `insert into app_site_integration (id, name, provider, status, environment, surfaces, config, csp_sources, created_by_user_id, updated_by_user_id, published_at)
           values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$9,case when $4='published' then now() else null end)
           returning id, name, provider, status, environment, surfaces, config, csp_sources, version, published_at, created_at, updated_at`,
          [id, normalized.name, normalized.provider, normalized.status, normalized.environment, normalized.surfaces, JSON.stringify(normalized.config), JSON.stringify(normalized.cspSources), session.user.id],
        );
        await client.query(`insert into app_site_integration_revision (id, integration_id, version, snapshot, created_by_user_id) values ($1,$2,1,$3::jsonb,$4)`, [crypto.randomUUID(), id, JSON.stringify(result.rows[0]), session.user.id]);
        await client.query(`insert into app_admin_audit_event (id, actor_user_id, action, target_type, target_id, metadata) values ($1,$2,'site.integration.created','site_integration',$3,jsonb_build_object('provider',$4::text,'status',$5::text))`, [crypto.randomUUID(), session.user.id, id, normalized.provider, normalized.status]);
        await client.query("commit");
        return c.json({ data: result.rows[0] }, 201, { "Cache-Control": "no-store" });
      } catch (error) {
        await client.query("rollback").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      return c.json({ error: { code: "INVALID_INTEGRATION", message: error instanceof Error ? error.message : "Unable to save integration." } }, 400);
    }
  }),
);

app.patch("/api/admin/site-integrations/:id", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
    if (!isPlatformAdmin(session.user)) return c.json({ error: { code: "FORBIDDEN", message: "Admin role required." } }, 403);
    const current = await database.query<SiteIntegrationInput>(`select name, provider, status, environment, surfaces, config from app_site_integration where id=$1`, [c.req.param("id")]);
    if (!current.rows[0]) return c.json({ error: { code: "NOT_FOUND", message: "Integration not found." } }, 404);
    try {
      const normalized = normalizeSiteIntegration({ ...current.rows[0], ...(await c.req.json<SiteIntegrationInput>()) });
      const client = await database.connect();
      try {
        await client.query("begin");
        const result = await client.query(
          `update app_site_integration set name=$2,provider=$3,status=$4,environment=$5,surfaces=$6,config=$7::jsonb,csp_sources=$8::jsonb,version=version+1,updated_by_user_id=$9,published_at=case when $4='published' then now() else published_at end,updated_at=now()
           where id=$1 returning id,name,provider,status,environment,surfaces,config,csp_sources,version,published_at,created_at,updated_at`,
          [c.req.param("id"), normalized.name, normalized.provider, normalized.status, normalized.environment, normalized.surfaces, JSON.stringify(normalized.config), JSON.stringify(normalized.cspSources), session.user.id],
        );
        const row = result.rows[0] as { version: number };
        await client.query(`insert into app_site_integration_revision (id,integration_id,version,snapshot,created_by_user_id) values ($1,$2,$3,$4::jsonb,$5)`, [crypto.randomUUID(), c.req.param("id"), row.version, JSON.stringify(row), session.user.id]);
        await client.query(`insert into app_admin_audit_event (id,actor_user_id,action,target_type,target_id,metadata) values ($1,$2,'site.integration.updated','site_integration',$3,jsonb_build_object('version',$4::int,'status',$5::text))`, [crypto.randomUUID(), session.user.id, c.req.param("id"), row.version, normalized.status]);
        await client.query("commit");
        return c.json({ data: row }, 200, { "Cache-Control": "no-store" });
      } catch (error) {
        await client.query("rollback").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      return c.json({ error: { code: "INVALID_INTEGRATION", message: error instanceof Error ? error.message : "Unable to update integration." } }, 400);
    }
  }),
);

app.get("/api/admin/overview", (c) =>
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
    const result = await database.query<{
      users: string;
      signups_24h: string;
      open_tickets: string;
      notifications_24h: string;
      audit_events_24h: string;
    }>(
      `select
        (select count(*)::text from app_user) as users,
        (select count(*)::text from app_user where created_at > now() - interval '24 hours') as signups_24h,
        (select count(*)::text from app_support_ticket where status in ('open', 'in_progress')) as open_tickets,
        (select count(*)::text from app_notification where created_at > now() - interval '24 hours') as notifications_24h,
        (select count(*)::text from app_admin_audit_event where created_at > now() - interval '24 hours') as audit_events_24h`,
    );
    const row = result.rows[0];
    const optionalTables = await database.query<{ subscriptions: boolean; integrations: boolean }>(`select to_regclass('app_subscription') is not null subscriptions,to_regclass('app_site_integration') is not null integrations`);
    const activeSubscriptions = optionalTables.rows[0]?.subscriptions ? Number((await database.query<{ count: string }>(`select count(*)::text count from app_subscription where status in ('active','trialing')`)).rows[0]?.count || 0) : 0;
    const publishedIntegrations = optionalTables.rows[0]?.integrations ? Number((await database.query<{ count: string }>(`select count(*)::text count from app_site_integration where status='published'`)).rows[0]?.count || 0) : 0;
    return c.json(
      {
        data: {
          users: Number(row?.users || 0),
          signups24h: Number(row?.signups_24h || 0),
          activeSubscriptions,
          publishedIntegrations,
          openTickets: Number(row?.open_tickets || 0),
          notifications24h: Number(row?.notifications_24h || 0),
          auditEvents24h: Number(row?.audit_events_24h || 0),
          database: "ok",
        },
      },
      200,
      { "Cache-Control": "no-store" },
    );
  }),
);

const platformSettingDefaults = { product_name: "Cloudflare AI Starter", support_email: "", default_locale: "en", signup_policy: "open" } as const;
app.get("/api/admin/platform-settings", (c) => withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
  if (!isPlatformAdmin(session.user)) return c.json({ error: { code: "FORBIDDEN", message: "Admin role required." } }, 403);
  const exists = await database.query<{ available: boolean }>(`select to_regclass('app_platform_setting') is not null available`);
  if (!exists.rows[0]?.available) return c.json({ data: platformSettingDefaults }, 200, { "Cache-Control": "no-store" });
  const result = await database.query<{ key: keyof typeof platformSettingDefaults; value: unknown }>(`select key,value from app_platform_setting`);
  return c.json({ data: Object.assign({}, platformSettingDefaults, Object.fromEntries(result.rows.map((row) => [row.key, row.value]))) }, 200, { "Cache-Control": "no-store" });
}));
app.patch("/api/admin/platform-settings", (c) => withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
  if (!isPlatformAdmin(session.user)) return c.json({ error: { code: "FORBIDDEN", message: "Admin role required." } }, 403);
  const input = await c.req.json<Record<string, unknown>>();
  const values = { product_name: String(input.product_name || "").trim(), support_email: String(input.support_email || "").trim(), default_locale: String(input.default_locale || "en"), signup_policy: String(input.signup_policy || "open") };
  if (values.product_name.length < 2 || values.product_name.length > 80 || (values.support_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(values.support_email)) || !["en","fr","zh-CN"].includes(values.default_locale) || !["open","invite-only"].includes(values.signup_policy)) return c.json({ error: { code: "INVALID_SETTINGS", message: "Platform settings are invalid." } }, 400);
  const client = await database.connect(); try { await client.query("begin"); for (const [key,value] of Object.entries(values)) await client.query(`insert into app_platform_setting(key,value,updated_by_user_id,updated_at) values ($1,$2::jsonb,$3,now()) on conflict(key) do update set value=excluded.value,updated_by_user_id=excluded.updated_by_user_id,updated_at=now()`, [key, JSON.stringify(value), session.user.id]); await client.query(`insert into app_admin_audit_event(id,actor_user_id,action,target_type,target_id,metadata) values($1,$2,'platform.settings.updated','platform_settings','global',jsonb_build_object('keys',$3::text[]))`, [crypto.randomUUID(),session.user.id,Object.keys(values)]); await client.query("commit"); return c.json({ data: values }, 200, { "Cache-Control": "no-store" }); } catch(error) { await client.query("rollback").catch(() => undefined); return c.json({ error: { code: "SETTINGS_FAILED", message: error instanceof Error ? error.message : "Unable to save settings." } }, 400); } finally { client.release(); }
}));

const adminSaasDirectories = {
  organizations: { table: "app_organization", columns: ["id", "name", "slug", "owner", "members", "created_at"], sql: `select o.id,o.name,o.slug,coalesce(owner_user.email,'Unassigned') owner,count(m.user_id)::int members,o.created_at from app_organization o left join app_organization_member m on m.organization_id=o.id left join app_organization_member owner_member on owner_member.organization_id=o.id and owner_member.role='owner' left join app_user owner_user on owner_user.id=owner_member.user_id group by o.id,o.name,o.slug,owner_user.email,o.created_at order by o.created_at desc limit 500` },
  subscriptions: { table: "app_subscription", columns: ["id", "reference_id", "product_key", "plan", "status", "period_end"], sql: `select id,reference_id,coalesce(product_key,'default') product_key,plan,status,period_end from app_subscription order by created_at desc limit 500` },
  entitlements: { table: "app_billing_plan_entitlement", columns: ["plan_id", "feature_key", "enabled", "limit_value"], sql: `select plan_id,feature_key,enabled,limit_value from app_billing_plan_entitlement order by plan_id,feature_key limit 500` },
  usage: { table: "app_usage_bucket", columns: ["owner_user_id", "metric", "window_start", "quantity"], sql: `select owner_user_id,metric,window_start,quantity from app_usage_bucket order by window_start desc limit 500` },
  "api-keys": { table: "app_api_key", columns: ["id", "reference_id", "name", "prefix", "enabled", "request_count", "expires_at"], sql: `select id,reference_id,name,prefix,enabled,request_count,expires_at from app_api_key order by created_at desc limit 500` },
  webhooks: { table: "app_webhook_endpoint", columns: ["id", "owner_user_id", "url", "event_types", "enabled", "updated_at"], sql: `select id,owner_user_id,url,event_types,enabled,updated_at from app_webhook_endpoint where archived_at is null order by updated_at desc limit 500` },
  onboarding: { table: "app_onboarding_progress", columns: ["user_id", "definition_version", "completed_steps", "started_at", "completed_at"], sql: `select user_id,definition_version,completed_steps,started_at,completed_at from app_onboarding_progress order by updated_at desc limit 500` },
} as const;

app.get("/api/admin/saas-directory/:resource", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
    if (!isPlatformAdmin(session.user)) return c.json({ error: { code: "FORBIDDEN", message: "Admin role required." } }, 403);
    const resource = c.req.param("resource") as keyof typeof adminSaasDirectories;
    const definition = adminSaasDirectories[resource];
    if (!definition) return c.json({ error: { code: "NOT_FOUND", message: "Unknown SaaS Admin resource." } }, 404);
    const exists = await database.query<{ available: boolean }>(`select to_regclass($1) is not null available`, [definition.table]);
    if (!exists.rows[0]?.available) return c.json({ data: { available: false, columns: definition.columns, rows: [], total: 0 } }, 200, { "Cache-Control": "no-store" });
    const result = await database.query(definition.sql);
    return c.json({ data: { available: true, columns: definition.columns, rows: result.rows, total: result.rows.length } }, 200, { "Cache-Control": "no-store" });
  }),
);

app.patch("/api/admin/saas-directory/:resource/:id", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
    if (!isPlatformAdmin(session.user)) return c.json({ error: { code: "FORBIDDEN", message: "Admin role required." } }, 403);
    const resource = c.req.param("resource"); const id = c.req.param("id"); const body = await c.req.json<{ action?: string }>(); const action = String(body.action || "");
    const client = await database.connect();
    try {
      await client.query("begin");
      let result;
      if (resource === "subscriptions" && ["pause", "activate"].includes(action)) result = await client.query(`update app_subscription set status=$2 where id=$1 returning id`, [id, action === "pause" ? "paused" : "active"]);
      else if (resource === "entitlements" && ["enable", "disable"].includes(action)) { const [planId, featureKey] = id.split("|"); result = await client.query(`update app_billing_plan_entitlement set enabled=$3 where plan_id=$1 and feature_key=$2 returning plan_id`, [planId, featureKey, action === "enable"]); }
      else if (resource === "api-keys" && ["enable", "disable"].includes(action)) result = await client.query(`update app_api_key set enabled=$2,updated_at=now() where id=$1 returning id`, [id, action === "enable"]);
      else if (resource === "webhooks" && ["enable", "disable"].includes(action)) result = await client.query(`update app_webhook_endpoint set enabled=$2,updated_at=now() where id=$1 and archived_at is null returning id`, [id, action === "enable"]);
      else if (resource === "onboarding" && action === "reset") result = await client.query(`update app_onboarding_progress set completed_steps='{}'::text[],completed_at=null,started_at=now(),updated_at=now() where user_id=$1 returning user_id`, [id]);
      else { await client.query("rollback"); return c.json({ error: { code: "INVALID_ACTION", message: "This Admin action is not supported." } }, 400); }
      if (!result.rows[0]) { await client.query("rollback"); return c.json({ error: { code: "NOT_FOUND", message: "The SaaS record no longer exists." } }, 404); }
      await client.query(`insert into app_admin_audit_event (id,actor_user_id,action,target_type,target_id,metadata) values ($1,$2,$3,$4,$5,jsonb_build_object('resource',$4::text))`, [crypto.randomUUID(), session.user.id, `saas.${resource}.${action}`, resource, id]);
      await client.query("commit");
      return c.json({ data: { ok: true } }, 200, { "Cache-Control": "no-store" });
    } catch (error) { await client.query("rollback").catch(() => undefined); return c.json({ error: { code: "ADMIN_ACTION_FAILED", message: error instanceof Error ? error.message : "Unable to apply Admin action." } }, 400); }
    finally { client.release(); }
  }),
);

app.get("/api/admin/audit", (c) =>
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
    const rawLimit = Number(c.req.query("limit") || 50);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(Math.floor(rawLimit), 1), 100)
      : 50;
    const search = boundedQueryValue(c.req.query("search"), 120);
    const action = boundedQueryValue(c.req.query("action"), 120);
    const targetType = boundedQueryValue(c.req.query("targetType"), 120);
    const actorUserId = boundedQueryValue(c.req.query("actorUserId"), 128);
    const from = validAuditDate(c.req.query("from"));
    const to = validAuditDate(c.req.query("to"));
    const cursor = parseAuditCursor(c.req.query("cursor"));
    if (from === null || to === null || cursor === null)
      return c.json(
        {
          error: {
            code: "INVALID_AUDIT_FILTER",
            message: "Audit dates or cursor are invalid.",
          },
        },
        400,
        { "Cache-Control": "no-store" },
      );
    const where: string[] = [];
    const values: unknown[] = [];
    const bind = (value: unknown) => {
      values.push(value);
      return `$${values.length}`;
    };
    if (search) {
      const parameter = bind(search.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_"));
      where.push(
        `(action ilike '%' || ${parameter} || '%' escape '\\' or target_type ilike '%' || ${parameter} || '%' escape '\\' or target_id ilike '%' || ${parameter} || '%' escape '\\')`,
      );
    }
    if (action) where.push(`action = ${bind(action)}`);
    if (targetType) where.push(`target_type = ${bind(targetType)}`);
    if (actorUserId) where.push(`actor_user_id = ${bind(actorUserId)}`);
    if (from) where.push(`created_at >= ${bind(from)}::timestamptz`);
    if (to) where.push(`created_at <= ${bind(to)}::timestamptz`);
    if (cursor) {
      const createdAt = bind(cursor.createdAt);
      const id = bind(cursor.id);
      where.push(
        `(created_at < ${createdAt}::timestamptz or (created_at = ${createdAt}::timestamptz and id < ${id}))`,
      );
    }
    const result = await database.query<{
      id: string;
      actor_user_id: string | null;
      action: string;
      target_type: string;
      target_id: string;
      metadata: Record<string, unknown>;
      created_at: string | Date;
    }>(
      `select id, actor_user_id, action, target_type, target_id, metadata, created_at
       from app_admin_audit_event${where.length ? ` where ${where.join(" and ")}` : ""}
       order by created_at desc, id desc limit ${bind(limit + 1)}`,
      values,
    );
    const hasMore = result.rows.length > limit;
    const events = result.rows.slice(0, limit);
    const last = events.at(-1);
    const nextCursor =
      hasMore && last
        ? `${new Date(last.created_at).toISOString()}|${last.id}`
        : null;
    return c.json(
      {
        data: {
          events,
          nextCursor,
          filters: { search, action, targetType, actorUserId, from, to },
        },
      },
      200,
      { "Cache-Control": "no-store" },
    );
  }),
);

app.get("/api/admin/health", (c) =>
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
    const data = await collectOperationsHealth(c.env, database);
    return c.json({ data }, 200, { "Cache-Control": "no-store" });
  }),
);

app.get("/api/health", (c) =>
  c.json({
    data: {
      status: "ok",
    },
    requestId: c.var.requestId,
  }),
);

app.get("/api/version", (c) =>
  c.json({
    data: {
      environment: c.env.APP_ENV,
      service: c.env.SERVICE_NAME,
    },
    requestId: c.var.requestId,
  }),
);

app.get("/api/health/database", async (c) => {
  const client = createDatabaseClient(c.env, `${c.env.SERVICE_NAME}-health`);
  try {
    await client.connect();
    const result = await client.query<{
      database: string;
      user_name: string;
      version: string;
    }>(
      `select current_database() as database, current_user as user_name, current_setting('server_version') as version`,
    );
    return c.json({
      data: { status: "ok", ...result.rows[0] },
      requestId: c.var.requestId,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "database_health_failed",
        requestId: c.var.requestId,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return c.json(
      {
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "Database health check failed.",
        },
        requestId: c.var.requestId,
      },
      503,
    );
  } finally {
    await client.end().catch(() => undefined);
  }
});

async function serveProductApplication(c: StarterContext) {
  const assetURL = new URL(c.req.url);
  assetURL.pathname = "/_app/index.html";
  assetURL.search = "";
  const response = await c.env.ASSETS.fetch(
    new Request(assetURL, { method: "GET", headers: c.req.raw.headers }),
  );
  if (c.req.path !== "/dp") return response;
  const headers = new Headers(response.headers);
  headers.append(
    "Link",
    "</dp/project.index.json>; rel=preload; as=fetch; crossorigin=use-credentials",
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

app.get("/login", serveProductApplication);
app.get("/dashboard", serveProductApplication);
app.get("/dashboard/*", serveProductApplication);
app.get("/app", serveProductApplication);
app.get("/app/*", serveProductApplication);
app.get("/support", serveProductApplication);
app.get("/support/*", serveProductApplication);
app.get("/admin", serveProductApplication);
app.get("/admin/*", serveProductApplication);
app.get("/dp", serveProductApplication);
for (const routePath of workerCapabilityRoutePaths)
  app.get(routePath, serveProductApplication);

app.all("/factory", (c) =>
  c.json(
    {
      error: {
        code: "LOCAL_ONLY",
        message: "Starter Factory is available only from the canonical local source repository.",
      },
    },
    404,
  ),
);
app.all("/factory/*", (c) =>
  c.json(
    {
      error: {
        code: "LOCAL_ONLY",
        message: "Starter Factory is available only from the canonical local source repository.",
      },
    },
    404,
  ),
);
app.all("/setup", (c) =>
  c.json(
    {
      error: {
        code: "LOCAL_ONLY",
        message:
          "Project setup is available only from the local development server.",
      },
    },
    404,
  ),
);
app.all("/setup/*", (c) =>
  c.json(
    {
      error: {
        code: "LOCAL_ONLY",
        message:
          "Project setup is available only from the local development server.",
      },
    },
    404,
  ),
);
app.all("/__starter/*", (c) =>
  c.json(
    {
      error: {
        code: "LOCAL_ONLY",
        message:
          "Starter configuration APIs are not available on deployed Workers.",
      },
    },
    404,
  ),
);

app.notFound((c) =>
  c.json(
    {
      error: {
        code: "NOT_FOUND",
        message: "The requested route was not found.",
      },
      requestId: c.var.requestId,
    },
    404,
  ),
);

app.onError((error, c) => {
  console.error("Unhandled request error", error);

  return c.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
      },
      requestId: c.var.requestId,
    },
    500,
  );
});

export default {
  fetch: app.fetch,
  async queue(
    batch: MessageBatch<unknown>,
    env: AppBindings,
    ctx: ExecutionContext,
  ) {
    for (const feature of selectedWorkerEvents)
      if (feature.queue) await feature.queue(batch, env, ctx);
  },
  async scheduled(
    controller: ScheduledController,
    env: AppBindings,
    ctx: ExecutionContext,
  ) {
    for (const feature of selectedWorkerEvents)
      if (feature.scheduled) await feature.scheduled(controller, env, ctx);
  },
} satisfies ExportedHandler<AppBindings, unknown>;
