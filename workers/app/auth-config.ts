import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { createAuthMiddleware, isAPIError } from "better-auth/api";
import { admin } from "better-auth/plugins";
import type { Pool } from "pg";
import { createSelectedAuthPlugins } from "./generated/auth-plugins";

export type AuthEmail = {
  kind: "email-verification" | "password-reset" | "organization-invitation";
  to: string;
  subject: string;
  text: string;
  html: string;
  url: string;
};

type StarterAuthInput = {
  appName: string;
  baseURL: string;
  appEnvironment: string;
  secret: string;
  database: Pool;
  googleClientId: string;
  googleClientSecret: string;
  mobileSchemes: string[];
  requireEmailVerification: boolean;
  enqueueEmail: (email: AuthEmail) => Promise<void>;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  stripePricePro?: string;
};

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/gu,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] || character,
  );
}

function authEmailHtml(
  title: string,
  message: string,
  action: string,
  url: string,
) {
  return `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#111827"><div style="max-width:560px;margin:40px auto;background:#fff;border:1px solid #dbe3ee;border-radius:16px;padding:32px"><h1 style="font-size:24px;margin:0 0 14px">${escapeHtml(title)}</h1><p style="line-height:1.65;color:#475569">${escapeHtml(message)}</p><a href="${escapeHtml(url)}" style="display:inline-block;margin-top:10px;padding:12px 18px;border-radius:9px;background:#172033;color:#fff;text-decoration:none;font-weight:700">${escapeHtml(action)}</a></div></body></html>`;
}

export function createStarterAuth(input: StarterAuthInput) {
  const secure = input.baseURL.startsWith("https://");
  const cookiePrefix =
    input.appName
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-|-$/gu, "") || "starter";

  return betterAuth({
    appName: input.appName,
    baseURL: input.baseURL,
    basePath: "/api/auth",
    secret: input.secret,
    trustedOrigins: [input.baseURL, ...input.mobileSchemes],
    hooks: {
      after: createAuthMiddleware(async (context) => {
        const actions: Record<string, string> = {
          "/admin/set-role": "admin.user.role_set",
          "/admin/ban-user": "admin.user.banned",
          "/admin/unban-user": "admin.user.unbanned",
          "/admin/revoke-user-sessions": "admin.user.sessions_revoked",
          "/admin/impersonate-user": "admin.user.impersonated",
          "/admin/stop-impersonating": "admin.impersonation.stopped",
          "/two-factor/enable": "security.two_factor.setup_started",
          "/two-factor/generate-backup-codes":
            "security.two_factor.backup_codes_rotated",
          "/two-factor/disable": "security.two_factor.disabled",
        };
        const action = actions[context.path];
        if (!action || isAPIError(context.context.returned)) return;
        const body = (context.body || {}) as Record<string, unknown>;
        const activeSession = context.context.session;
        const actorId =
          context.path === "/admin/stop-impersonating"
            ? String(activeSession?.session.impersonatedBy || "")
            : String(activeSession?.user.id || "");
        const targetId = String(body.userId || activeSession?.user.id || "");
        if (!actorId || !targetId) return;
        const metadata =
          context.path === "/admin/set-role"
            ? { role: body.role }
            : context.path === "/admin/ban-user"
              ? {
                  banReason: body.banReason || null,
                  banExpiresIn: body.banExpiresIn || null,
                }
              : {};
        await input.database.query(
          `insert into app_admin_audit_event
           (id, actor_user_id, action, target_type, target_id, metadata)
           values ($1, $2, $3, 'user', $4, $5::jsonb)`,
          [
            crypto.randomUUID(),
            actorId,
            action,
            targetId,
            JSON.stringify(metadata),
          ],
        );
        const securityNotifications: Record<
          string,
          { title: string; body: string }
        > = {
          "admin.user.role_set": {
            title: "Account role changed",
            body: "A platform administrator changed your account role.",
          },
          "admin.user.banned": {
            title: "Account access suspended",
            body: "A platform administrator suspended access to your account.",
          },
          "admin.user.unbanned": {
            title: "Account access restored",
            body: "A platform administrator restored access to your account.",
          },
          "admin.user.sessions_revoked": {
            title: "Sessions revoked",
            body: "A platform administrator signed your account out on other devices.",
          },
          "admin.user.impersonated": {
            title: "Support access started",
            body: "A platform administrator started a temporary audited support session for your account.",
          },
          "security.two_factor.setup_started": {
            title: "Two-factor setup started",
            body: "Authenticator enrollment started for your account.",
          },
          "security.two_factor.backup_codes_rotated": {
            title: "Recovery codes replaced",
            body: "New two-factor recovery codes were generated for your account.",
          },
          "security.two_factor.disabled": {
            title: "Two-factor authentication disabled",
            body: "Two-factor authentication was disabled for your account.",
          },
        };
        const notification = securityNotifications[action];
        if (notification)
          await input.database.query(
            `insert into app_notification
             (id, recipient_user_id, category, title, body, deep_link)
             values ($1, $2, 'security', $3, $4, '/app/settings')`,
            [
              crypto.randomUUID(),
              targetId,
              notification.title,
              notification.body,
            ],
          );
      }),
    },
    plugins: [
      expo(),
      admin({
        defaultRole: "user",
        adminRoles: ["admin"],
        impersonationSessionDuration: 60 * 60,
        schema: {
          user: {
            fields: {
              role: "role",
              banned: "banned",
              banReason: "ban_reason",
              banExpires: "ban_expires",
            },
          },
          session: { fields: { impersonatedBy: "impersonated_by" } },
        },
      }),
      ...createSelectedAuthPlugins({
        appName: input.appName,
        baseURL: input.baseURL,
        appEnvironment: input.appEnvironment,
        database: input.database,
        enqueueEmail: input.enqueueEmail,
        stripeSecretKey: input.stripeSecretKey,
        stripeWebhookSecret: input.stripeWebhookSecret,
        stripePricePro: input.stripePricePro,
      }),
    ],
    trustHost: false,
    database: input.database,
    user: {
      modelName: "app_user",
      fields: {
        emailVerified: "email_verified",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
      additionalFields: {
        theme: {
          type: "string",
          required: false,
          defaultValue: "system",
          fieldName: "theme",
        },
        locale: {
          type: "string",
          required: false,
          defaultValue: "en",
          fieldName: "locale",
        },
      },
    },
    session: {
      modelName: "app_session",
      fields: {
        expiresAt: "expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
        ipAddress: "ip_address",
        userAgent: "user_agent",
        userId: "user_id",
      },
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
    verification: {
      modelName: "app_verification",
      fields: {
        expiresAt: "expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    socialProviders: {
      google: {
        clientId: input.googleClientId,
        clientSecret: input.googleClientSecret,
      },
    },
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      requireEmailVerification: input.requireEmailVerification,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      customSyntheticUser: ({ coreFields, additionalFields, id }) => ({
        ...coreFields,
        role: "user",
        banned: false,
        banReason: null,
        banExpires: null,
        ...additionalFields,
        id,
      }),
      async sendResetPassword({ user, url }) {
        await input.enqueueEmail({
          kind: "password-reset",
          to: user.email,
          subject: `Reset your ${input.appName} password`,
          text: `Reset your password: ${url}`,
          html: authEmailHtml(
            "Reset your password",
            `Use this secure link to choose a new ${input.appName} password.`,
            "Reset password",
            url,
          ),
          url,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: input.requireEmailVerification,
      autoSignInAfterVerification: false,
      async sendVerificationEmail({ user, url }) {
        await input.enqueueEmail({
          kind: "email-verification",
          to: user.email,
          subject: `Verify your ${input.appName} email`,
          text: `Verify your email: ${url}`,
          html: authEmailHtml(
            "Verify your email",
            `Confirm this address to finish creating your ${input.appName} account.`,
            "Verify email",
            url,
          ),
          url,
        });
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
          attributes: {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            secure,
            maxAge: 600,
          },
        },
        pkce_code_verifier: {
          name: `${cookiePrefix}.pkce`,
          attributes: {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            secure,
            maxAge: 600,
          },
        },
      },
    },
  });
}

export type StarterAuth = ReturnType<typeof createStarterAuth>;
