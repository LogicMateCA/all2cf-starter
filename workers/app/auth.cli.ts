import { Pool } from "pg";
import { createStarterAuth } from "./auth-config";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to generate the Better Auth schema");

export const auth = createStarterAuth({
  appName: "Starter schema generator",
  baseURL: "http://localhost:8787",
  appEnvironment: "schema",
  secret: process.env.BETTER_AUTH_SECRET || "schema-generation-secret-at-least-32-characters",
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  socialProviders: ["google"],
  googleClientId: "schema-google-client",
  googleClientSecret: "schema-google-secret",
  mobileSchemes: ["starter-schema://"],
  requireEmailVerification: true,
  enqueueEmail: async () => undefined,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "sk_test_schema_placeholder",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "whsec_schema_placeholder",
  stripePricePro: process.env.STRIPE_PRICE_PRO || "price_schema_placeholder",
});
