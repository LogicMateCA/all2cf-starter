import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "./lib/env-profile.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const providers = JSON.parse(await readFile(path.join(root, "profiles/providers.json"), "utf8"));
const profilePath = process.env.STARTER_DEV_PROFILE_PATH || providers.defaultPath;
let profile;
try {
  profile = parseEnv(await readFile(profilePath, "utf8"));
} catch {
  console.log(JSON.stringify({ profilePath, status: "profile-missing" }, null, 2));
  process.exitCode = 1;
  process.exit();
}
let project = new Map();
try { project = parseEnv(await readFile(path.join(root, ".dev.vars"), "utf8")); } catch {}
const value = (key) => profile.get(key) || project.get(key);
const requiredGroups = {
  cloudflare: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"],
  postgresql: ["DATABASE_URL", "STARTER_PRODUCTION_DATABASE_URL"],
};
const optionalGroups = {
  expoAccount: ["EXPO_TOKEN", "EXPO_OWNER"],
  expoProject: ["EXPO_PROJECT_ID"],
  expoPushDevelopment: ["EXPO_PUSH_ACCESS_TOKEN"],
  expoPushProduction: ["STARTER_PRODUCTION_EXPO_PUSH_ACCESS_TOKEN"],
  twilioDevelopment: ["TWILIO_ACCOUNT_SID", "TWILIO_API_KEY", "TWILIO_API_SECRET", "TWILIO_FROM"],
  twilioProduction: ["STARTER_PRODUCTION_TWILIO_ACCOUNT_SID", "STARTER_PRODUCTION_TWILIO_API_KEY", "STARTER_PRODUCTION_TWILIO_API_SECRET", "STARTER_PRODUCTION_TWILIO_FROM"],
  streamDevelopment: ["CLOUDFLARE_STREAM_TOKEN", "STREAM_WEBHOOK_SECRET"],
  streamProduction: ["STARTER_PRODUCTION_CLOUDFLARE_STREAM_TOKEN", "STARTER_PRODUCTION_STREAM_WEBHOOK_SECRET"],
  appleStore: ["APPLE_TEAM_ID", "ASC_KEY_ID", "ASC_ISSUER_ID", "ASC_API_KEY_BASE64", "ASC_APP_ID"],
  googlePlay: ["GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64", "GOOGLE_PLAY_PACKAGE_NAME"],
  googleOAuth: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  githubOAuth: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
  appleOAuth: ["APPLE_CLIENT_ID", "APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY_BASE64", "APPLE_APP_BUNDLE_IDENTIFIER"],
  googleAi: ["GOOGLE_AI_API_KEY"],
  github: ["GITHUB_TOKEN", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY_BASE64"],
  stripeTest: ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_PRICE_PRO"],
  stripeWebhook: ["STRIPE_WEBHOOK_SECRET"],
  stripeLive: ["STARTER_PRODUCTION_STRIPE_SECRET_KEY", "STARTER_PRODUCTION_STRIPE_PUBLISHABLE_KEY", "STARTER_PRODUCTION_STRIPE_WEBHOOK_SECRET", "STARTER_PRODUCTION_STRIPE_PRICE_PRO"],
  cfsend: ["CFSEND_API_URL", "CFSEND_API_KEY", "CFSEND_FROM"],
  cfsendSandbox: ["CFSEND_SANDBOX"],
  resend: ["RESEND_API_KEY", "RESEND_FROM"],
  cloudflareEmail: ["CLOUDFLARE_EMAIL_FROM"],
  s3Development: ["S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"],
  s3Production: ["STARTER_PRODUCTION_S3_ACCESS_KEY_ID", "STARTER_PRODUCTION_S3_SECRET_ACCESS_KEY"],
  turnstileDevelopment: ["TURNSTILE_SECRET_KEY"],
  turnstileProduction: ["STARTER_PRODUCTION_TURNSTILE_SECRET_KEY"],
};
const inspect = (groups) => Object.fromEntries(Object.entries(groups).map(([name, keys]) => [name, keys.every((key) => Boolean(value(key))) ? "ready" : "not-configured"]));
const required = inspect(requiredGroups);
const optional = inspect(optionalGroups);
console.log(JSON.stringify({ profilePath, required, optional }, null, 2));
if (Object.values(required).some((status) => status !== "ready")) process.exitCode = 1;
