import { Hono } from "hono";
import { Client } from "pg";

type AppVariables = {
  requestId: string;
};

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

app.use("*", async (c, next) => {
  c.set("requestId", crypto.randomUUID());
  await next();
});

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
