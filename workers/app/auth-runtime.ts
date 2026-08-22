import { Pool } from "pg";
import { createStarterAuth, type AuthEmail, type StarterAuth } from "./auth-config";
import { AuthEmailProviderError, sendAuthEmail } from "./auth-email-provider";
import { selectedSocialProviders } from "../../scripts/lib/social-providers.mjs";
import { createDatabasePool } from "./database-runtime";

export type AuthRuntimeEnv = {
  APP_ENV: string;
  DATABASE_PROVIDER?: string;
  HYPERDRIVE?: { connectionString: string };
  SERVICE_NAME: string;
  APP_NAME: string;
  AUTH_CANONICAL_ORIGIN: string;
  AUTH_EMAIL_PROVIDER: string;
  AUTH_SOCIAL_PROVIDERS?: string;
  MOBILE_DEEP_LINK_SCHEMES: string;
  AUTH_REQUIRE_EMAIL_VERIFICATION: string;
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  APPLE_CLIENT_ID?: string;
  APPLE_TEAM_ID?: string;
  APPLE_KEY_ID?: string;
  APPLE_PRIVATE_KEY_BASE64?: string;
  APPLE_APP_BUNDLE_IDENTIFIER?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_PRO?: string;
  CFSEND_API_URL?: string;
  CFSEND_API_KEY?: string;
  CFSEND_FROM?: string;
  RESEND_API_URL?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  CLOUDFLARE_EMAIL_FROM?: string;
  EMAIL?: Env extends { EMAIL: infer EmailBinding } ? EmailBinding : never;
  OUTGOING_WEBHOOK_QUEUE?: Queue<unknown>;
  WEBHOOK_SIGNING_KEY?: string;
  OBJECTS?: R2Bucket;
  STORAGE_PROVIDER?: string;
  STORAGE_BUCKET?: string;
  STORAGE_ACCESS?: string;
  STORAGE_MAX_UPLOAD_BYTES?: string;
  STORAGE_PUBLIC_DOMAIN?: string;
  S3_ENDPOINT?: string;
  S3_REGION?: string;
  S3_FORCE_PATH_STYLE?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  TURNSTILE_PROVIDER?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  AI?: Ai;
  AI_PROVIDER?: string;
  AI_MODEL?: string;
  AI_GATEWAY_ID?: string;
  VECTOR_INDEX?: VectorizeIndex;
  SEARCH_PROVIDER?: string;
  VECTORIZE_INDEX_NAME?: string;
  VECTORIZE_DIMENSIONS?: string;
  VECTORIZE_METRIC?: string;
  PUSH_PROVIDER?: string;
  EXPO_PUSH_PROJECT_ID?: string;
  EXPO_PUSH_ACCESS_TOKEN_REQUIRED?: string;
  EXPO_PUSH_ACCESS_TOKEN?: string;
  SMS_PROVIDER?: string;
  TWILIO_API_BASE_URL?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_API_KEY?: string;
  TWILIO_API_SECRET?: string;
  TWILIO_FROM?: string;
  IMAGES?: ImagesBinding;
  IMAGES_PROVIDER?: string;
  IMAGES_MAX_INPUT_BYTES?: string;
  IMAGES_DEFAULT_FORMAT?: string;
  STREAM_PROVIDER?: string;
  STREAM_API_BASE_URL?: string;
  STREAM_ACCOUNT_ID?: string;
  STREAM_MAX_DURATION_SECONDS?: string;
  STREAM_ALLOWED_ORIGINS?: string;
  CLOUDFLARE_STREAM_TOKEN?: string;
  STREAM_WEBHOOK_SECRET?: string;
  CRON_PROVIDER?: string;
  CRON_EXPRESSION?: string;
};

type RequestExecutionContext = Pick<ExecutionContext, "waitUntil">;

function mobileSchemes(env: AuthRuntimeEnv) {
  return env.MOBILE_DEEP_LINK_SCHEMES.split(",").map((value) => value.trim()).filter(Boolean);
}

export async function withRequestAuth<T>(env: AuthRuntimeEnv, ctx: RequestExecutionContext, operation: (auth: StarterAuth, database: Pool) => Promise<T>): Promise<T> {
  const pool = createDatabasePool(env, `${env.SERVICE_NAME}-auth`);
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
    appEnvironment: env.APP_ENV,
    secret: env.BETTER_AUTH_SECRET,
    database: pool,
    socialProviders: selectedSocialProviders(env),
    googleClientId: env.GOOGLE_CLIENT_ID,
    googleClientSecret: env.GOOGLE_CLIENT_SECRET,
    githubClientId: env.GITHUB_CLIENT_ID,
    githubClientSecret: env.GITHUB_CLIENT_SECRET,
    appleClientId: env.APPLE_CLIENT_ID,
    appleTeamId: env.APPLE_TEAM_ID,
    appleKeyId: env.APPLE_KEY_ID,
    applePrivateKeyBase64: env.APPLE_PRIVATE_KEY_BASE64,
    appleAppBundleIdentifier: env.APPLE_APP_BUNDLE_IDENTIFIER,
    mobileSchemes: mobileSchemes(env),
    requireEmailVerification: env.AUTH_REQUIRE_EMAIL_VERIFICATION === "true",
    enqueueEmail,
    stripeSecretKey: env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
    stripePricePro: env.STRIPE_PRICE_PRO,
    turnstileSecretKey: env.TURNSTILE_SECRET_KEY,
  });

  try {
    return await operation(auth, pool);
  } finally {
    await pool.end();
  }
}
