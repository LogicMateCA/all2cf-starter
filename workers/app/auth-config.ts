import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import type { Pool } from "pg";

export type AuthEmail = {
  kind: "email-verification" | "password-reset";
  to: string;
  subject: string;
  text: string;
  html: string;
  url: string;
};

type StarterAuthInput = {
  appName: string;
  baseURL: string;
  secret: string;
  database: Pool;
  googleClientId: string;
  googleClientSecret: string;
  mobileSchemes: string[];
  requireEmailVerification: boolean;
  enqueueEmail: (email: AuthEmail) => Promise<void>;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
}

function authEmailHtml(title: string, message: string, action: string, url: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#111827"><div style="max-width:560px;margin:40px auto;background:#fff;border:1px solid #dbe3ee;border-radius:16px;padding:32px"><h1 style="font-size:24px;margin:0 0 14px">${escapeHtml(title)}</h1><p style="line-height:1.65;color:#475569">${escapeHtml(message)}</p><a href="${escapeHtml(url)}" style="display:inline-block;margin-top:10px;padding:12px 18px;border-radius:9px;background:#172033;color:#fff;text-decoration:none;font-weight:700">${escapeHtml(action)}</a></div></body></html>`;
}

export function createStarterAuth(input: StarterAuthInput) {
  const secure = input.baseURL.startsWith("https://");
  const cookiePrefix = input.appName.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "") || "starter";

  return betterAuth({
    appName: input.appName,
    baseURL: input.baseURL,
    basePath: "/api/auth",
    secret: input.secret,
    trustedOrigins: [input.baseURL, ...input.mobileSchemes],
    plugins: [expo()],
    trustHost: false,
    database: input.database,
    user: {
      modelName: "app_user",
      fields: { emailVerified: "email_verified", createdAt: "created_at", updatedAt: "updated_at" },
      additionalFields: {
        theme: { type: "string", required: false, defaultValue: "system", fieldName: "theme" },
        locale: { type: "string", required: false, defaultValue: "en", fieldName: "locale" },
        platformRole: { type: "string", required: false, defaultValue: "user", input: false, fieldName: "platform_role" },
      },
    },
    session: {
      modelName: "app_session",
      fields: { expiresAt: "expires_at", createdAt: "created_at", updatedAt: "updated_at", ipAddress: "ip_address", userAgent: "user_agent", userId: "user_id" },
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    account: {
      modelName: "app_account",
      fields: {
        issuer: "issuer",
        accountId: "account_id",
        providerId: "provider_id",
        userId: "user_id",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        idToken: "id_token",
        accessTokenExpiresAt: "access_token_expires_at",
        refreshTokenExpiresAt: "refresh_token_expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
      storeStateStrategy: "cookie",
      accountLinking: { enabled: true },
    },
    verification: { modelName: "app_verification", fields: { expiresAt: "expires_at", createdAt: "created_at", updatedAt: "updated_at" } },
    socialProviders: {
      google: { clientId: input.googleClientId, clientSecret: input.googleClientSecret },
    },
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      requireEmailVerification: input.requireEmailVerification,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      async sendResetPassword({ user, url }) {
        await input.enqueueEmail({ kind: "password-reset", to: user.email, subject: `Reset your ${input.appName} password`, text: `Reset your password: ${url}`, html: authEmailHtml("Reset your password", `Use this secure link to choose a new ${input.appName} password.`, "Reset password", url), url });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: input.requireEmailVerification,
      autoSignInAfterVerification: false,
      async sendVerificationEmail({ user, url }) {
        await input.enqueueEmail({ kind: "email-verification", to: user.email, subject: `Verify your ${input.appName} email`, text: `Verify your email: ${url}`, html: authEmailHtml("Verify your email", `Confirm this address to finish creating your ${input.appName} account.`, "Verify email", url), url });
      },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "app_auth_rate_limit",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 10, max: 3 },
        "/sign-up/email": { window: 60, max: 5 },
        "/request-password-reset": { window: 60, max: 3 },
      },
    },
    advanced: {
      cookiePrefix,
      useSecureCookies: secure,
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
      crossSubDomainCookies: { enabled: false },
      cookies: {
        state: {
          name: `${cookiePrefix}.state`,
          attributes: { httpOnly: true, sameSite: "lax", path: "/", secure, maxAge: 600 },
        },
        pkce_code_verifier: {
          name: `${cookiePrefix}.pkce`,
          attributes: { httpOnly: true, sameSite: "lax", path: "/", secure, maxAge: 600 },
        },
      },
    },
  });
}

export type StarterAuth = ReturnType<typeof createStarterAuth>;
