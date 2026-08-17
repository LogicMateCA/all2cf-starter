import { Pool } from "pg";
import { createStarterAuth, type AuthEmail, type StarterAuth } from "./auth-config";

export type AuthRuntimeEnv = {
  HYPERDRIVE: Env["HYPERDRIVE"];
  SERVICE_NAME: string;
  APP_NAME: string;
  AUTH_CANONICAL_ORIGIN: string;
  AUTH_EMAIL_MODE: string;
  MOBILE_DEEP_LINK_SCHEMES: string;
  AUTH_REQUIRE_EMAIL_VERIFICATION: string;
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  CFSEND_API_URL?: string;
  CFSEND_API_KEY?: string;
  CFSEND_FROM?: string;
};

type RequestExecutionContext = Pick<ExecutionContext, "waitUntil">;

function mobileSchemes(env: AuthRuntimeEnv) {
  return env.MOBILE_DEEP_LINK_SCHEMES.split(",").map((value) => value.trim()).filter(Boolean);
}

export async function withRequestAuth<T>(env: AuthRuntimeEnv, ctx: RequestExecutionContext, operation: (auth: StarterAuth) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: env.HYPERDRIVE.connectionString, max: 2, application_name: `${env.SERVICE_NAME}-auth` });
  const emailTasks: Promise<unknown>[] = [];
  const enqueueEmail = (email: AuthEmail) => {
    const id = crypto.randomUUID();
    const task = pool.query(
      `insert into app_auth_email_outbox (id, kind, recipient, subject, text_body, action_url, delivery_mode, status, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, 'pending', now())`,
      [id, email.kind, email.to, email.subject, email.text, email.url, env.AUTH_EMAIL_MODE],
    ).then(async () => {
      if (env.AUTH_EMAIL_MODE !== "cfsend") return;
      if (!env.CFSEND_API_URL || !env.CFSEND_API_KEY || !env.CFSEND_FROM) throw new Error("CFsend delivery is not configured");
      const response = await fetch(`${env.CFSEND_API_URL.replace(/\/$/u, "")}/emails`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.CFSEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `auth-${id}`,
        },
        body: JSON.stringify({ from: env.CFSEND_FROM, to: email.to, subject: email.subject, text: email.text }),
      });
      if (!response.ok) throw new Error(`CFsend returned HTTP ${response.status}`);
      await pool.query("update app_auth_email_outbox set status = 'sent', attempt_count = attempt_count + 1, sent_at = now() where id = $1", [id]);
    }).catch(async (error) => {
      await pool.query("update app_auth_email_outbox set status = 'failed', attempt_count = attempt_count + 1, last_error = $2 where id = $1", [id, error instanceof Error ? error.message.slice(0, 500) : "Unknown email delivery error"]).catch(() => undefined);
      throw error;
    });
    emailTasks.push(task);
  };
  const auth = createStarterAuth({
    appName: env.APP_NAME,
    baseURL: env.AUTH_CANONICAL_ORIGIN,
    secret: env.BETTER_AUTH_SECRET,
    database: pool,
    googleClientId: env.GOOGLE_CLIENT_ID,
    googleClientSecret: env.GOOGLE_CLIENT_SECRET,
    mobileSchemes: mobileSchemes(env),
    requireEmailVerification: env.AUTH_REQUIRE_EMAIL_VERIFICATION === "true",
    enqueueEmail,
  });

  try {
    const result = await operation(auth);
    if (emailTasks.length) ctx.waitUntil(Promise.all(emailTasks).finally(() => pool.end()));
    else await pool.end();
    return result;
  } catch (error) {
    await Promise.allSettled(emailTasks);
    await pool.end();
    throw error;
  }
}
