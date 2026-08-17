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
  expo: ["EXPO_TOKEN", "EXPO_OWNER"],
  googleOAuth: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  googleAi: ["GOOGLE_AI_API_KEY"],
  github: ["GITHUB_TOKEN", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
  stripeTest: ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY"],
  stripeWebhook: ["STRIPE_WEBHOOK_SECRET"],
  cfsendSandbox: ["CFSEND_API_URL", "CFSEND_API_KEY", "CFSEND_FROM"],
};
const inspect = (groups) => Object.fromEntries(Object.entries(groups).map(([name, keys]) => [name, keys.every((key) => Boolean(value(key))) ? "ready" : "not-configured"]));
const required = inspect(requiredGroups);
const optional = inspect(optionalGroups);
console.log(JSON.stringify({ profilePath, required, optional }, null, 2));
if (Object.values(required).some((status) => status !== "ready")) process.exitCode = 1;
