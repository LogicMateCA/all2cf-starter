import { betterAuth } from "better-auth";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to generate the Better Auth schema");

export const auth = betterAuth({
  appName: "Starter schema generator",
  baseURL: "http://localhost:8787",
  secret: process.env.BETTER_AUTH_SECRET || "schema-generation-secret-at-least-32-characters",
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  user: {
    modelName: "app_user",
    fields: { emailVerified: "email_verified", createdAt: "created_at", updatedAt: "updated_at" },
    additionalFields: {
      theme: { type: "string", required: false, defaultValue: "system", fieldName: "theme" },
      locale: { type: "string", required: false, defaultValue: "en", fieldName: "locale" },
      platformRole: { type: "string", required: false, defaultValue: "user", input: false, fieldName: "platform_role" },
    },
  },
  session: { modelName: "app_session", fields: { expiresAt: "expires_at", createdAt: "created_at", updatedAt: "updated_at", ipAddress: "ip_address", userAgent: "user_agent", userId: "user_id" } },
  account: {
    modelName: "app_account",
    fields: {
      issuer: "issuer", accountId: "account_id", providerId: "provider_id", userId: "user_id", accessToken: "access_token", refreshToken: "refresh_token", idToken: "id_token",
      accessTokenExpiresAt: "access_token_expires_at", refreshTokenExpiresAt: "refresh_token_expires_at", createdAt: "created_at", updatedAt: "updated_at",
    },
  },
  verification: { modelName: "app_verification", fields: { expiresAt: "expires_at", createdAt: "created_at", updatedAt: "updated_at" } },
  emailAndPassword: { enabled: true, autoSignIn: false },
  rateLimit: { enabled: true, storage: "database", modelName: "app_auth_rate_limit" },
});
