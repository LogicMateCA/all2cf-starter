import { Hono } from "hono";
import { isAPIError } from "better-auth/api";
import { Client } from "pg";
import { withRequestAuth, type AuthRuntimeEnv } from "./auth-runtime";

type AppVariables = {
  requestId: string;
};

type AppBindings = Omit<AuthRuntimeEnv, "APP_ENV"> & {
  APP_ENV: string;
};

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

const supportKinds = new Set(["support", "bug"]);
const supportStatuses = new Set(["open", "in_progress", "resolved", "closed"]);

function isPlatformAdmin(user: unknown) {
  const role = typeof user === "object" && user && "role" in user ? String(user.role || "") : "";
  return role.split(",").map((value) => value.trim()).includes("admin");
}

app.use("*", async (c, next) => {
  c.set("requestId", crypto.randomUUID());
  await next();
});

app.on(["GET", "POST"], "/api/auth/*", (c) =>
  withRequestAuth(c.env, c.executionCtx, (auth) => auth.handler(c.req.raw)),
);

app.get("/api/auth-methods", (c) =>
  c.json({ methods: [{ key: "google", kind: "social", label: "Google", enabled: true }] }, 200, { "Cache-Control": "no-store" }),
);

app.get("/api/session", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401, { "Cache-Control": "no-store" });
    return c.json({ data: session }, 200, { "Cache-Control": "no-store" });
  }),
);

app.get("/api/preferences", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401, { "Cache-Control": "no-store" });
    return c.json({ data: { theme: session.user.theme || "system", locale: session.user.locale || "en" } }, 200, { "Cache-Control": "no-store" });
  }),
);

app.put("/api/preferences", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth) => {
    const body = await c.req.json<{ theme?: string; locale?: string }>();
    if (!new Set(["system", "light", "dark"]).has(body.theme || "")) return c.json({ error: { code: "INVALID_THEME", message: "Theme must be system, light, or dark." } }, 400);
    if (!new Set(["en", "zh"]).has(body.locale || "")) return c.json({ error: { code: "INVALID_LOCALE", message: "Locale must be en or zh." } }, 400);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401, { "Cache-Control": "no-store" });
    await auth.api.updateUser({ headers: c.req.raw.headers, body: { theme: body.theme, locale: body.locale } });
    return c.json({ data: { theme: body.theme, locale: body.locale } }, 200, { "Cache-Control": "no-store" });
  }),
);

app.post("/api/auth-flow/check-email", async (c) => {
  const body = await c.req.json<{ email?: string }>();
  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) return c.json({ error: { code: "INVALID_EMAIL", message: "Enter a valid email address." } }, 400);
  if (c.env.APP_ENV === "production") return c.json({ data: { publicLookupRestricted: true } }, 200, { "Cache-Control": "no-store" });

  const client = new Client({ connectionString: c.env.HYPERDRIVE.connectionString });
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
    return c.json({ data: user ? { exists: true, name: user.name, emailVerified: user.email_verified, hasPassword: user.has_password, linkedProviders: user.linked_providers || [] } : { exists: false } }, 200, { "Cache-Control": "no-store" });
  } finally {
    await client.end().catch(() => undefined);
  }
});

app.post("/api/auth-flow/register", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth) => {
    const body = await c.req.json<{ email?: string; password?: string; confirmPassword?: string; name?: string }>();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const confirmPassword = String(body.confirmPassword || "");
    const name = String(body.name || "").trim() || email.split("@")[0] || "user";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) return c.json({ error: { code: "INVALID_EMAIL", message: "Enter a valid email address." } }, 400);
    if (password.length < 8 || password.length > 128) return c.json({ error: { code: "INVALID_PASSWORD", message: "Password must be between 8 and 128 characters." } }, 400);
    if (password !== confirmPassword) return c.json({ error: { code: "PASSWORD_MISMATCH", message: "Passwords do not match." } }, 400);

    try {
      await auth.api.signUpEmail({ headers: c.req.raw.headers, body: { email, password, name, callbackURL: `${c.env.AUTH_CANONICAL_ORIGIN}/login?verified=1` } });
    } catch (error) {
      if (!isAPIError(error) || error.statusCode >= 500) throw error;
      console.info(JSON.stringify({ event: "auth_registration_not_accepted", requestId: c.var.requestId, status: error.statusCode }));
    }
    return c.json({ data: { accepted: true, message: "If this email can be registered, verification instructions will be sent." } }, 202, { "Cache-Control": "no-store" });
  }),
);

app.get("/api/support/tickets", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401, { "Cache-Control": "no-store" });
    const result = await database.query(
      `select id, kind, subject, body, status, priority, created_at, updated_at, resolved_at
       from app_support_ticket where created_by_user_id = $1 order by created_at desc limit 50`,
      [session.user.id],
    );
    return c.json({ data: result.rows }, 200, { "Cache-Control": "no-store" });
  }),
);

app.post("/api/support/tickets", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user || !session.user.emailVerified) return c.json({ error: { code: "VERIFIED_ACCOUNT_REQUIRED", message: "A verified account is required." } }, 401, { "Cache-Control": "no-store" });
    const body = await c.req.json<{ kind?: string; subject?: string; body?: string }>();
    const kind = String(body.kind || "").trim();
    const subject = String(body.subject || "").trim();
    const description = String(body.body || "").trim();
    if (!supportKinds.has(kind)) return c.json({ error: { code: "INVALID_KIND", message: "Kind must be support or bug." } }, 400);
    if (subject.length < 3 || subject.length > 160) return c.json({ error: { code: "INVALID_SUBJECT", message: "Subject must be between 3 and 160 characters." } }, 400);
    if (description.length < 10 || description.length > 5000) return c.json({ error: { code: "INVALID_BODY", message: "Description must be between 10 and 5000 characters." } }, 400);
    const recent = await database.query<{ count: string }>("select count(*)::text as count from app_support_ticket where created_by_user_id = $1 and created_at > now() - interval '1 hour'", [session.user.id]);
    if (Number(recent.rows[0]?.count || 0) >= 5) return c.json({ error: { code: "RATE_LIMITED", message: "Too many recent tickets." } }, 429);
    const id = crypto.randomUUID();
    const result = await database.query(
      `insert into app_support_ticket (id, created_by_user_id, contact_email, kind, subject, body)
       values ($1, $2, $3, $4, $5, $6)
       returning id, kind, subject, body, status, priority, created_at, updated_at, resolved_at`,
      [id, session.user.id, session.user.email, kind, subject, description],
    );
    return c.json({ data: result.rows[0] }, 201, { "Cache-Control": "no-store" });
  }),
);

app.get("/api/admin/support/tickets", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401, { "Cache-Control": "no-store" });
    if (!isPlatformAdmin(session.user)) return c.json({ error: { code: "FORBIDDEN", message: "Admin role required." } }, 403, { "Cache-Control": "no-store" });
    const requestedStatus = c.req.query("status");
    if (requestedStatus && !supportStatuses.has(requestedStatus)) return c.json({ error: { code: "INVALID_STATUS", message: "Unknown ticket status." } }, 400);
    const result = await database.query(
      `select id, created_by_user_id, contact_email, kind, subject, body, status, priority, created_at, updated_at, resolved_at
       from app_support_ticket where ($1::text is null or status = $1) order by updated_at desc limit 100`,
      [requestedStatus || null],
    );
    return c.json({ data: result.rows }, 200, { "Cache-Control": "no-store" });
  }),
);

app.patch("/api/admin/support/tickets/:id", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401, { "Cache-Control": "no-store" });
    if (!isPlatformAdmin(session.user)) return c.json({ error: { code: "FORBIDDEN", message: "Admin role required." } }, 403, { "Cache-Control": "no-store" });
    const body = await c.req.json<{ status?: string }>();
    const status = String(body.status || "").trim();
    if (!supportStatuses.has(status)) return c.json({ error: { code: "INVALID_STATUS", message: "Unknown ticket status." } }, 400);
    const ticketId = c.req.param("id");
    const client = await database.connect();
    try {
      await client.query("begin");
      const result = await client.query(
        `update app_support_ticket set status = $2, updated_at = now(), resolved_at = case when $2 in ('resolved', 'closed') then coalesce(resolved_at, now()) else null end
         where id = $1 returning id, kind, subject, body, status, priority, created_at, updated_at, resolved_at`,
        [ticketId, status],
      );
      if (!result.rows[0]) {
        await client.query("rollback");
        return c.json({ error: { code: "NOT_FOUND", message: "Ticket not found." } }, 404);
      }
      await client.query(
        `insert into app_admin_audit_event (id, actor_user_id, action, target_type, target_id, metadata)
         values ($1, $2, 'support.status.updated', 'support_ticket', $3, jsonb_build_object('status', $4::text))`,
        [crypto.randomUUID(), session.user.id, ticketId, status],
      );
      await client.query("commit");
      return c.json({ data: result.rows[0] }, 200, { "Cache-Control": "no-store" });
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
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
  const client = new Client({ connectionString: c.env.HYPERDRIVE.connectionString });
  try {
    await client.connect();
    const result = await client.query<{ database: string; user_name: string; version: string }>(
      `select current_database() as database, current_user as user_name, current_setting('server_version') as version`,
    );
    return c.json({ data: { status: "ok", ...result.rows[0] }, requestId: c.var.requestId });
  } catch (error) {
    console.error(JSON.stringify({ event: "database_health_failed", requestId: c.var.requestId, error: error instanceof Error ? error.message : String(error) }));
    return c.json({ error: { code: "DATABASE_UNAVAILABLE", message: "Database health check failed." }, requestId: c.var.requestId }, 503);
  } finally {
    await client.end().catch(() => undefined);
  }
});

app.all("/setup", (c) => c.json({ error: { code: "LOCAL_ONLY", message: "Project setup is available only from the local development server." } }, 404));
app.all("/setup/*", (c) => c.json({ error: { code: "LOCAL_ONLY", message: "Project setup is available only from the local development server." } }, 404));
app.all("/__starter/*", (c) => c.json({ error: { code: "LOCAL_ONLY", message: "Starter configuration APIs are not available on deployed Workers." } }, 404));

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

export default app;
