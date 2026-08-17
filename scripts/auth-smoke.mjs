import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseJsonc } from "jsonc-parser";
import { Client } from "pg";
import { parseEnv } from "./lib/env-profile.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const remote = process.argv.includes("--remote");
const port = Number(process.env.STARTER_AUTH_SMOKE_PORT || 18788);
const envPath = path.join(root, ".dev.vars");
const values = parseEnv(await readFile(envPath, "utf8"));
const starter = JSON.parse(await readFile(path.join(root, "starter.config.json"), "utf8"));
const origin = remote ? `https://${starter.development.domain}` : `http://127.0.0.1:${port}`;
const baseConfig = parseJsonc(await readFile(path.join(root, "cloudflare/wrangler.development.jsonc"), "utf8"));
const databaseSource = new URL(values.get("DATABASE_URL") || "");
databaseSource.hostname = starter.development.database.host;
databaseSource.port = String(starter.development.database.port);
databaseSource.pathname = `/${starter.development.database.database}`;
databaseSource.searchParams.set("sslmode", "require");
databaseSource.searchParams.set("uselibpqcompat", "true");

let child = null;
let logs = "";
if (!remote) {
  const tempRoot = path.join(root, "dist/auth-smoke");
  const configPath = path.join(tempRoot, "wrangler.jsonc");
  await mkdir(tempRoot, { recursive: true });
  const localConfig = {
    ...baseConfig,
    name: "starter-auth-smoke",
    main: path.join(root, "workers/app/index.ts"),
    vars: { ...baseConfig.vars, AUTH_CANONICAL_ORIGIN: origin, AUTH_REQUIRE_EMAIL_VERIFICATION: "false", AUTH_EMAIL_MODE: "database-outbox" },
    assets: { ...baseConfig.assets, directory: path.join(root, "dist/web") },
    hyperdrive: [{ ...baseConfig.hyperdrive[0], localConnectionString: databaseSource.toString() }],
    routes: [],
    workers_dev: false,
  };
  await writeFile(configPath, `${JSON.stringify(localConfig, null, 2)}\n`, { mode: 0o600 });
  child = spawn("npx", ["wrangler", "dev", "--config", configPath, "--env-file", envPath, "--ip", "127.0.0.1", "--port", String(port), "--show-interactive-dev-session", "false", "--log-level", "warn"], {
    cwd: root,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => { logs += chunk.toString(); });
  child.stderr.on("data", (chunk) => { logs += chunk.toString(); });
}

const email = `smoke+${randomUUID()}@example.test`;
const password = `Smoke-${randomUUID()}-A1!`;
const smokeIp = `203.0.113.${Math.floor(Math.random() * 254) + 1}`;
const database = new Client({
  host: starter.development.database.host,
  port: starter.development.database.port,
  user: decodeURIComponent(databaseSource.username),
  password: decodeURIComponent(databaseSource.password),
  database: starter.development.database.database,
  ssl: { rejectUnauthorized: false },
  application_name: `${starter.project.slug}-auth-smoke-cleanup`,
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(pathname, init = {}) {
  const response = await fetch(`${origin}${pathname}`, { ...init, headers: { ...(!remote ? { "CF-Connecting-IP": smokeIp } : {}), ...(init.headers || {}) } });
  let payload;
  try { payload = await response.json(); } catch { payload = null; }
  return { response, payload };
}

async function waitUntilReady() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child?.exitCode !== null && child) throw new Error(`wrangler dev exited before readiness\n${logs}`);
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`wrangler dev did not become ready\n${logs}`);
}

const checks = [];
try {
  await waitUntilReady();
  await database.connect();

  const unknown = await request("/api/auth-flow/check-email", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ email }) });
  assert(unknown.response.status === 200 && unknown.payload?.data?.exists === false, "unknown email lookup did not return exists=false");
  checks.push("unknown-email");

  const invalid = await request("/api/auth-flow/register", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ email, name: "Smoke Test", password: "short", confirmPassword: "short" }) });
  assert(invalid.response.status === 400 && invalid.payload?.error?.code === "INVALID_PASSWORD", "invalid registration was not rejected");
  checks.push("registration-validation");

  const registration = await request("/api/auth-flow/register", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ email, name: "Smoke Test", password, confirmPassword: password }) });
  assert(registration.response.status === 202 && registration.payload?.data?.accepted === true, "registration was not accepted");
  checks.push("registration");

  const duplicate = await request("/api/auth-flow/register", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ email, name: "Smoke Test", password, confirmPassword: password }) });
  assert(duplicate.response.status === 202 && duplicate.payload?.data?.accepted === true, "duplicate registration did not preserve generic response");
  checks.push("enumeration-safe-registration");

  const known = await request("/api/auth-flow/check-email", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ email }) });
  assert(known.response.status === 200 && known.payload?.data?.exists === true && known.payload?.data?.hasPassword === true, "known email lookup did not return password capability");
  checks.push("known-email");

  const login = await request("/api/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ email, password, callbackURL: "/app" }) });
  assert(login.response.status === 200, `email sign-in failed with ${login.response.status}`);
  const cookieHeaders = typeof login.response.headers.getSetCookie === "function" ? login.response.headers.getSetCookie() : [login.response.headers.get("set-cookie")].filter(Boolean);
  const cookie = cookieHeaders.map((value) => value.split(";", 1)[0]).join("; ");
  assert(cookie.includes("session"), "email sign-in did not set a session cookie");
  if (remote) {
    const sessionSetCookie = cookieHeaders.find((value) => value.includes("session_token")) || "";
    assert(/;\s*HttpOnly/iu.test(sessionSetCookie), "edge session cookie is missing HttpOnly");
    assert(/;\s*Secure/iu.test(sessionSetCookie), "edge session cookie is missing Secure");
    assert(/;\s*SameSite=Lax/iu.test(sessionSetCookie), "edge session cookie is missing SameSite=Lax");
    assert(!/;\s*Domain=/iu.test(sessionSetCookie), "edge session cookie is not host-only");
    checks.push("secure-host-only-cookie");
  }
  checks.push("email-sign-in");

  const session = await request("/api/session", { headers: { Cookie: cookie, Origin: origin } });
  assert(session.response.status === 200 && session.payload?.data?.user?.email === email, "protected session endpoint did not return the signed-in user");
  checks.push("session");

  const defaultPreferences = await request("/api/preferences", { headers: { Cookie: cookie, Origin: origin } });
  assert(defaultPreferences.response.status === 200 && defaultPreferences.payload?.data?.theme === "system" && defaultPreferences.payload?.data?.locale === "en", "default account preferences are incorrect");
  const updatePreferences = await request("/api/preferences", { method: "PUT", headers: { "Content-Type": "application/json", Cookie: cookie, Origin: origin }, body: JSON.stringify({ theme: "dark", locale: "zh" }) });
  assert(updatePreferences.response.status === 200, "account preference update failed");
  const updatedPreferences = await request("/api/preferences", { headers: { Cookie: cookie, Origin: origin } });
  assert(updatedPreferences.payload?.data?.theme === "dark" && updatedPreferences.payload?.data?.locale === "zh", "account preferences did not persist");
  checks.push("account-preferences");

  const resetRequest = await request("/api/auth/request-password-reset", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ email, redirectTo: `${origin}/login` }) });
  assert(resetRequest.response.status === 200, "password reset request failed");
  let resetUrl = "";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const resetOutbox = await database.query("select action_url from app_auth_email_outbox where recipient = $1 and kind = 'password-reset' order by created_at desc limit 1", [email]);
    resetUrl = resetOutbox.rows[0]?.action_url || "";
    if (resetUrl) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const resetCallback = await fetch(resetUrl, { redirect: "manual", headers: { Origin: origin } });
  const resetLocation = resetCallback.headers.get("location") || "";
  const resetToken = resetLocation ? new URL(resetLocation, origin).searchParams.get("token") : null;
  assert(resetToken, "password reset email did not contain a token");
  checks.push("password-reset-request");

  const replacementPassword = `Reset-${randomUUID()}-A1!`;
  const reset = await request("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ newPassword: replacementPassword, token: resetToken }) });
  assert(reset.response.status === 200, "password reset token was not accepted");
  checks.push("password-reset-token");

  const revoked = await request("/api/session", { headers: { Cookie: cookie, Origin: origin } });
  assert(revoked.response.status === 401, "password reset did not revoke the prior session");
  checks.push("reset-session-revocation");

  const replacementLogin = await request("/api/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ email, password: replacementPassword, callbackURL: "/app" }) });
  assert(replacementLogin.response.status === 200, "replacement password sign-in failed");
  const replacementCookies = typeof replacementLogin.response.headers.getSetCookie === "function" ? replacementLogin.response.headers.getSetCookie() : [replacementLogin.response.headers.get("set-cookie")].filter(Boolean);
  const replacementCookie = replacementCookies.map((value) => value.split(";", 1)[0]).join("; ");
  checks.push("replacement-password-sign-in");

  const signOut = await request("/api/auth/sign-out", { method: "POST", headers: { "Content-Type": "application/json", Cookie: replacementCookie, Origin: origin }, body: "{}" });
  assert(signOut.response.status === 200, "sign-out failed");
  const signedOut = await request("/api/session", { headers: { Cookie: replacementCookie, Origin: origin } });
  assert(signedOut.response.status === 401, "signed-out session remained valid");
  checks.push("sign-out");

  const outbox = await database.query("select count(*)::int as count from app_auth_email_outbox where recipient = $1", [email]);
  assert(outbox.rows[0]?.count >= 2, "auth emails were not written to the development outbox");
  checks.push("email-outbox");

  console.log(JSON.stringify({ ok: true, runtime: remote ? "cloudflare-development-edge" : "workerd", database: starter.development.database.database, checks }, null, 2));
} finally {
  if (database._connected) {
    await database.query("delete from app_auth_email_outbox where recipient = $1", [email]).catch(() => undefined);
    await database.query("delete from app_user where email = $1", [email]).catch(() => undefined);
    await database.end().catch(() => undefined);
  }
  if (child) {
    child.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => child.once("close", resolve)),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
}
