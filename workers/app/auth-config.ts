import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { createAuthMiddleware, isAPIError } from "better-auth/api";
import { admin, emailOTP } from "better-auth/plugins";
import type { Pool } from "pg";
import { createSelectedAuthPlugins } from "./generated/auth-plugins";
import { generateAppleClientSecret } from "../../scripts/lib/apple-oauth.mjs";

export type AuthEmail = {
  kind: "email-verification" | "password-reset" | "email-otp" | "organization-invitation" | "magic-link";
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
  socialProviders: string[];
  googleClientId?: string;
  googleClientSecret?: string;
  githubClientId?: string;
  githubClientSecret?: string;
  appleClientId?: string;
  appleTeamId?: string;
  appleKeyId?: string;
  applePrivateKeyBase64?: string;
  appleAppBundleIdentifier?: string;
  microsoftClientId?: string;
  microsoftClientSecret?: string;
  discordClientId?: string;
  discordClientSecret?: string;
  facebookClientId?: string;
  facebookClientSecret?: string;
  linkedinClientId?: string;
  linkedinClientSecret?: string;
  mobileSchemes: string[];
  requireEmailVerification: boolean;
  enqueueEmail: (email: AuthEmail) => Promise<void>;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  stripePricePro?: string;
  polarAccessToken?: string;
  polarWebhookSecret?: string;
  polarProductPro?: string;
  autumnSecretKey?: string;
  turnstileSecretKey?: string;
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

function authOtpHtml(appName: string, otp: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#111827"><div style="max-width:560px;margin:40px auto;background:#fff;border:1px solid #dbe3ee;border-radius:16px;padding:32px"><h1 style="font-size:24px;margin:0 0 14px">Confirm your email</h1><p style="line-height:1.65;color:#475569">Enter this code in ${escapeHtml(appName)} to confirm that this email belongs to you.</p><div style="margin:24px 0;border:2px solid #172033;border-radius:14px;background:#f8fafc;padding:22px;text-align:center;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:38px;font-weight:800;letter-spacing:10px">${escapeHtml(otp)}</div><p style="color:#64748b;font-size:13px">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p></div></body></html>`;
}

export function createStarterAuth(input: StarterAuthInput) {
  const secure = input.baseURL.startsWith("https://");
  const selectedSocialProviders = new Set(input.socialProviders);
  const googleReady = selectedSocialProviders.has("google") && input.googleClientId && input.googleClientSecret;
  const githubReady = selectedSocialProviders.has("github") && input.githubClientId && input.githubClientSecret;
  const appleReady =
    selectedSocialProviders.has("apple") &&
    input.appleClientId &&
    input.appleTeamId &&
    input.appleKeyId &&
    input.applePrivateKeyBase64 &&
    input.appleAppBundleIdentifier;
  const microsoftReady = selectedSocialProviders.has("microsoft") && input.microsoftClientId && input.microsoftClientSecret;
  const discordReady = selectedSocialProviders.has("discord") && input.discordClientId && input.discordClientSecret;
  const facebookReady = selectedSocialProviders.has("facebook") && input.facebookClientId && input.facebookClientSecret;
  const linkedinReady = selectedSocialProviders.has("linkedin") && input.linkedinClientId && input.linkedinClientSecret;
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
    trustedOrigins: [
      input.baseURL,
      ...input.mobileSchemes,
      ...(selectedSocialProviders.has("apple") ? ["https://appleid.apple.com"] : []),
    ],
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
      emailOTP({
        disableSignUp: true,
        storeOTP: "hashed",
        expiresIn: 10 * 60,
        allowedAttempts: 5,
        async sendVerificationOTP({ email, otp }) {
          await input.enqueueEmail({
            kind: "email-otp",
            to: email,
            subject: `Confirm your ${input.appName} email`,
            text: `Your ${input.appName} verification code is ${otp}. It expires in 10 minutes.`,
            html: authOtpHtml(input.appName, otp),
            url: "",
          });
        },
      }),
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
        polarAccessToken: input.polarAccessToken,
        polarWebhookSecret: input.polarWebhookSecret,
        polarProductPro: input.polarProductPro,
        autumnSecretKey: input.autumnSecretKey,
        turnstileSecretKey: input.turnstileSecretKey,
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
      ...(googleReady
        ? { google: { clientId: input.googleClientId!, clientSecret: input.googleClientSecret! } }
        : {}),
      ...(githubReady
        ? { github: { clientId: input.githubClientId!, clientSecret: input.githubClientSecret!, scope: ["user:email"] } }
        : {}),
      ...(appleReady
        ? {
            apple: async () => ({
              clientId: input.appleClientId!,
              clientSecret: await generateAppleClientSecret({
                clientId: input.appleClientId!,
                teamId: input.appleTeamId!,
                keyId: input.appleKeyId!,
                privateKeyBase64: input.applePrivateKeyBase64!,
              }),
              appBundleIdentifier: input.appleAppBundleIdentifier!,
            }),
          }
        : {}),
      ...(microsoftReady ? { microsoft: { clientId: input.microsoftClientId!, clientSecret: input.microsoftClientSecret! } } : {}),
      ...(discordReady ? { discord: { clientId: input.discordClientId!, clientSecret: input.discordClientSecret! } } : {}),
      ...(facebookReady ? { facebook: { clientId: input.facebookClientId!, clientSecret: input.facebookClientSecret! } } : {}),
      ...(linkedinReady ? { linkedin: { clientId: input.linkedinClientId!, clientSecret: input.linkedinClientSecret! } } : {}),
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
        "/email-otp/request-password-reset": { window: 60, max: 3 },
        "/email-otp/reset-password": { window: 60, max: 5 },
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
