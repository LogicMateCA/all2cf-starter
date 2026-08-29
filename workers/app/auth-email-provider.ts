export type AuthEmailProvider = "cfsend" | "resend" | "cloudflare-email";

export type ProviderEmail = {
  id: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type AuthEmailProviderEnv = {
  AUTH_EMAIL_PROVIDER?: string;
  CFSEND_API_URL?: string;
  CFSEND_API_KEY?: string;
  CFSEND_FROM?: string;
  RESEND_API_URL?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  CLOUDFLARE_EMAIL_FROM?: string;
  EMAIL?: { send(message: { from: string; to: string[]; subject: string; text: string; html: string }): Promise<{ messageId?: string } | void> };
};

export class AuthEmailProviderError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly attempts: number;
  readonly status: number | null;

  constructor(message: string, options: { code: string; retryable: boolean; attempts: number; status?: number | null; cause?: unknown }) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "AuthEmailProviderError";
    this.code = options.code;
    this.retryable = options.retryable;
    this.attempts = options.attempts;
    this.status = options.status ?? null;
  }
}

function providerFrom(env: AuthEmailProviderEnv): AuthEmailProvider {
  const provider = String(env.AUTH_EMAIL_PROVIDER || "cfsend").trim().toLowerCase();
  if (provider !== "cfsend" && provider !== "resend" && provider !== "cloudflare-email") throw new AuthEmailProviderError(`Unsupported authentication email provider: ${provider}`, { code: "provider_unsupported", retryable: false, attempts: 0 });
  return provider;
}

function required(value: string | undefined, name: string) {
  if (!value?.trim()) throw new AuthEmailProviderError(`${name} is required`, { code: "provider_not_configured", retryable: false, attempts: 0 });
  return value.trim();
}

function providerConfiguration(env: AuthEmailProviderEnv) {
  const provider = providerFrom(env);
  if (provider === "cloudflare-email") return {
    provider,
    endpoint: null,
    apiKey: null,
    from: required(env.CLOUDFLARE_EMAIL_FROM, "CLOUDFLARE_EMAIL_FROM"),
  };
  if (provider === "cfsend") return {
    provider,
    endpoint: `${required(env.CFSEND_API_URL, "CFSEND_API_URL").replace(/\/$/u, "")}/emails`,
    apiKey: required(env.CFSEND_API_KEY, "CFSEND_API_KEY"),
    from: required(env.CFSEND_FROM, "CFSEND_FROM"),
  };
  return {
    provider,
    endpoint: `${String(env.RESEND_API_URL || "https://api.resend.com").replace(/\/$/u, "")}/emails`,
    apiKey: required(env.RESEND_API_KEY, "RESEND_API_KEY"),
    from: required(env.RESEND_FROM, "RESEND_FROM"),
  };
}

function retryableStatus(status: number) {
  return status === 429 || status >= 500;
}

async function responseBody(response: Response) {
  const text = await response.text();
  if (!text) return {} as Record<string, unknown>;
  try { return JSON.parse(text) as Record<string, unknown>; }
  catch { return { raw: text.slice(0, 300) }; }
}

export async function sendAuthEmail(
  env: AuthEmailProviderEnv,
  email: ProviderEmail,
  options: { request?: typeof fetch; pause?: (milliseconds: number) => Promise<void>; maxAttempts?: number } = {},
) {
  const config = providerConfiguration(env);
  const request = options.request || fetch;
  const pause = options.pause || ((milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const maxAttempts = options.maxAttempts ?? 3;
  const idempotencyKey = `auth-${email.id}`;
  const payload = { from: config.from, to: [email.to], subject: email.subject, text: email.text, html: email.html };

  if (config.provider === "cloudflare-email") {
    if (!env.EMAIL) throw new AuthEmailProviderError("EMAIL binding is required", { code: "provider_not_configured", retryable: false, attempts: 0 });
    try {
      const response = await env.EMAIL.send(payload);
      return { provider: config.provider, providerMessageId: response?.messageId || email.id, idempotencyKey, attempts: 1 };
    } catch (error) {
      throw new AuthEmailProviderError("Cloudflare Email Service request failed", { code: "cloudflare_email_error", retryable: true, attempts: 1, cause: error });
    }
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response: Response;
    try {
      response = await request(config.endpoint as string, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey as string}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      if (attempt < maxAttempts) {
        await pause(attempt * 250);
        continue;
      }
      throw new AuthEmailProviderError(`${config.provider} email request failed`, { code: `${config.provider}_network_error`, retryable: true, attempts: attempt, cause: error });
    }

    const body = await responseBody(response);
    if (response.ok) {
      const messageId = body.id || body.message_id;
      if (typeof messageId !== "string" || !messageId) throw new AuthEmailProviderError(`${config.provider} returned no message ID`, { code: `${config.provider}_invalid_response`, retryable: false, attempts: attempt, status: response.status });
      return { provider: config.provider, providerMessageId: messageId, idempotencyKey, attempts: attempt };
    }

    const retryable = retryableStatus(response.status);
    if (retryable && attempt < maxAttempts) {
      await pause(attempt * 250);
      continue;
    }
    throw new AuthEmailProviderError(`${config.provider} returned HTTP ${response.status}`, { code: `${config.provider}_http_${response.status}`, retryable, attempts: attempt, status: response.status });
  }

  throw new AuthEmailProviderError("Authentication email delivery failed", { code: "provider_unknown_error", retryable: false, attempts: maxAttempts });
}
