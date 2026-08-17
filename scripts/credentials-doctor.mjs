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
const groups = {
  cloudflare: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"],
  googleOAuth: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  googleAi: ["GOOGLE_AI_API_KEY"],
  github: ["GITHUB_TOKEN", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
  stripeTest: ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY"],
  stripeWebhook: ["STRIPE_WEBHOOK_SECRET"],
  cfsendSandbox: ["CFSEND_API_URL", "CFSEND_API_KEY", "CFSEND_FROM"],
  postgresql: ["STARTER_POSTGRES_ADMIN_URL"],
};
const status = Object.fromEntries(Object.entries(groups).map(([name, keys]) => [name, keys.every((key) => Boolean(profile.get(key))) ? "ready" : "missing"]));
console.log(JSON.stringify({ profilePath, status }, null, 2));
if (Object.values(status).some((value) => value === "missing")) process.exitCode = 1;
