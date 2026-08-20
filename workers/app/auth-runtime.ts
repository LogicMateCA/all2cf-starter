import { Pool } from "pg";
import { createStarterAuth, type AuthEmail, type StarterAuth } from "./auth-config";
import { AuthEmailProviderError, sendAuthEmail } from "./auth-email-provider";

export type AuthRuntimeEnv = {
  HYPERDRIVE: Env["HYPERDRIVE"];
  SERVICE_NAME: string;
  APP_NAME: string;
  AUTH_CANONICAL_ORIGIN: string;
  AUTH_EMAIL_PROVIDER: string;
  MOBILE_DEEP_LINK_SCHEMES: string;
  AUTH_REQUIRE_EMAIL_VERIFICATION: string;
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  CFSEND_API_URL?: string;
  CFSEND_API_KEY?: string;
  CFSEND_FROM?: string;
  RESEND_API_URL?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  CLOUDFLARE_EMAIL_FROM?: string;
  EMAIL?: Env extends { EMAIL: infer EmailBinding } ? EmailBinding : never;
};

type RequestExecutionContext = Pick<ExecutionContext, "waitUntil">;

function mobileSchemes(env: AuthRuntimeEnv) {
  return env.MOBILE_DEEP_LINK_SCHEMES.split(",").map((value) => value.trim()).filter(Boolean);
}

export async function withRequestAuth<T>(env: AuthRuntimeEnv, ctx: RequestExecutionContext, operation: (auth: StarterAuth, database: Pool) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: env.HYPERDRIVE.connectionString, max: 2, application_name: `${env.SERVICE_NAME}-auth` });
  const enqueueEmail = async (email: AuthEmail) => {
    const id = crypto.randomUUID();
    const provider = String(env.AUTH_EMAIL_PROVIDER || "cfsend").trim().toLowerCase();
    await pool.query(
      `insert into app_auth_email_outbox (id, kind, recipient, subject, text_body, action_url, delivery_mode, status, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, 'pending', now())`,
      [id, email.kind, email.to, email.subject, email.text, email.url, provider],
    );
    await pool.query("update app_auth_email_outbox set status = 'sending' where id = $1", [id]);
    try {
      const result = await sendAuthEmail(env, { id, to: email.to, subject: email.subject, text: email.text, html: email.html });
      await pool.query("update app_auth_email_outbox set status = 'sent', attempt_count = $2, provider_message_id = $3, failure_code = null, last_error = null, sent_at = now() where id = $1", [id, result.attempts, result.providerMessageId]);
    } catch (error) {
      const providerError = error instanceof AuthEmailProviderError ? error : new AuthEmailProviderError("Authentication email delivery failed", { code: "provider_unknown_error", retryable: false, attempts: 1, cause: error });
      await pool.query("update app_auth_email_outbox set status = 'failed', attempt_count = $2, failure_code = $3, last_error = $4 where id = $1", [id, providerError.attempts, providerError.code, providerError.message.slice(0, 500)]).catch(() => undefined);
      throw providerError;
    }
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
    return await operation(auth, pool);
  } finally {
    await pool.end();
  }
}
