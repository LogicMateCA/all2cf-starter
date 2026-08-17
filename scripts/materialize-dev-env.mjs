import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv, renderEnv } from "./lib/env-profile.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const providers = JSON.parse(await readFile(path.join(root, "profiles/providers.json"), "utf8"));
const profilePath = process.env.STARTER_DEV_PROFILE_PATH || providers.defaultPath;
const profile = parseEnv(await readFile(profilePath, "utf8"));
let existing = new Map();
try { existing = parseEnv(await readFile(path.join(root, ".dev.vars"), "utf8")); } catch {}

for (const name of providers.generatedPerProject) {
  profile.set(name, existing.get(name) || randomBytes(32).toString("base64url"));
}
profile.set("APP_ENV", "development");

const serverNames = [...providers.shared, ...providers.generatedPerProject, "APP_ENV"];
await writeFile(path.join(root, ".dev.vars"), renderEnv(serverNames, profile), { mode: 0o600 });

const webValues = new Map([
  ["VITE_API_BASE_URL", ""],
  ["VITE_STRIPE_PUBLISHABLE_KEY", profile.get("STRIPE_PUBLISHABLE_KEY") || ""],
  ["VITE_GOOGLE_CLIENT_ID", profile.get("GOOGLE_CLIENT_ID") || ""],
]);
await writeFile(path.join(root, "apps/web/.env.local"), renderEnv([...webValues.keys()], webValues), { mode: 0o600 });

const mobileRoot = path.join(root, "apps/mobile");
await mkdir(mobileRoot, { recursive: true });
const mobileValues = new Map([
  ["EXPO_PUBLIC_API_URL", "http://localhost:8787"],
  ["EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY", profile.get("STRIPE_PUBLISHABLE_KEY") || ""],
  ["EXPO_PUBLIC_GOOGLE_CLIENT_ID", profile.get("GOOGLE_CLIENT_ID") || ""],
]);
await writeFile(path.join(mobileRoot, ".env.local"), renderEnv([...mobileValues.keys()], mobileValues), { mode: 0o600 });

console.log(JSON.stringify({ ok: true, profilePath, serverVariables: serverNames.length, webVariables: webValues.size, mobileVariables: mobileValues.size }, null, 2));

