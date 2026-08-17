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
