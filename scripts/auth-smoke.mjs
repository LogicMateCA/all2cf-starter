import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseJsonc } from "jsonc-parser";
import { Client } from "pg";
import { parseEnv, renderEnv } from "./lib/env-profile.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const remote = process.argv.includes("--remote");
const port = Number(process.env.STARTER_AUTH_SMOKE_PORT || 18788);
const mailPort = Number(process.env.STARTER_AUTH_SMOKE_MAIL_PORT || 18789);
const envPath = path.join(root, ".dev.vars");
const values = parseEnv(await readFile(envPath, "utf8"));
const starter = JSON.parse(await readFile(path.join(root, "starter.config.json"), "utf8"));
const blueprint = JSON.parse(await readFile(path.join(root, "starter.blueprint.json"), "utf8"));
const selectedPacks = new Set(Object.values(blueprint.selections).flat().filter(({ lifecycle }) => lifecycle.selected && lifecycle.materialized).map(({ id }) => id));
const organizationsSelected = selectedPacks.has("saas.team-organizations");
const stripeSelected = selectedPacks.has("saas.billing-stripe");
const origin = remote ? `https://${starter.development.domain}` : `http://127.0.0.1:${port}`;
const baseConfig = parseJsonc(await readFile(path.join(root, "cloudflare/wrangler.development.jsonc"), "utf8"));
const isolatedDatabaseUrl = process.env.STARTER_AUTH_SMOKE_DATABASE_URL?.trim();
const databaseSource = new URL(isolatedDatabaseUrl || values.get("DATABASE_URL") || "");
let scratchDatabase = null;
let scratchAdmin = null;
if (!remote && !isolatedDatabaseUrl) {
  databaseSource.hostname = starter.development.database.host;
  databaseSource.port = String(starter.development.database.port);
  databaseSource.pathname = `/${starter.development.database.database}`;
  databaseSource.searchParams.set("sslmode", "require");
  databaseSource.searchParams.set("uselibpqcompat", "true");
  scratchDatabase = `starter_auth_smoke_${Date.now()}_${randomUUID().replaceAll("-", "").slice(0, 8)}`;
  scratchAdmin = new Client({ connectionString: databaseSource.toString(), ssl: { rejectUnauthorized: false }, application_name: `${starter.project.slug}-auth-smoke-schema` });
  await scratchAdmin.connect();
  await scratchAdmin.query(`create database "${scratchDatabase}"`);
  databaseSource.pathname = `/${scratchDatabase}`;
  const migrationClient = new Client({ connectionString: databaseSource.toString(), ssl: { rejectUnauthorized: false }, application_name: `${starter.project.slug}-auth-smoke-migration` });
  await migrationClient.connect();
  try {
    const migrationRoot = path.join(root, "db/migrations");
    const migrations = (await readdir(migrationRoot)).filter((name) => /^\d+.*\.sql$/u.test(name)).sort();
    for (const migration of migrations) await migrationClient.query(await readFile(path.join(migrationRoot, migration), "utf8"));
  } catch (error) {
    await scratchAdmin.query(`drop database if exists "${scratchDatabase}" with (force)`).catch(() => undefined);
    await scratchAdmin.end().catch(() => undefined);
    throw error;
  } finally {
    await migrationClient.end().catch(() => undefined);
  }
}

let child = null;
let mailServer = null;
const mailRequests = [];
let logs = "";
if (!remote) {
  const tempRoot = path.join(root, "dist/auth-smoke");
  const configPath = path.join(tempRoot, "wrangler.jsonc");
  const smokeEnvPath = path.join(tempRoot, ".dev.vars");
  await mkdir(tempRoot, { recursive: true });
  mailServer = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    if (request.method !== "POST" || request.url !== "/emails" || request.headers.authorization !== "Bearer smoke-cfsend-key") {
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }
    mailRequests.push({ headers: request.headers, body: JSON.parse(body) });
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ id: `smoke-message-${mailRequests.length}` }));
  });
  await new Promise((resolve, reject) => { mailServer.once("error", reject); mailServer.listen(mailPort, "127.0.0.1", resolve); });
  const smokeValues = new Map(values);
  smokeValues.set("CFSEND_API_URL", `http://127.0.0.1:${mailPort}`);
  smokeValues.set("CFSEND_API_KEY", "smoke-cfsend-key");
  smokeValues.set("CFSEND_FROM", "Starter Smoke <auth@example.test>");
  if (stripeSelected) {
    smokeValues.set("STRIPE_SECRET_KEY", "sk_test_starter_smoke_only");
    smokeValues.set("STRIPE_WEBHOOK_SECRET", "whsec_starter_smoke_only");
    smokeValues.set("STRIPE_PRICE_PRO", "price_starter_smoke_only");
  }
  await writeFile(smokeEnvPath, renderEnv([...smokeValues.keys()], smokeValues), { mode: 0o600 });
  const localConfig = {
    ...baseConfig,
    name: "starter-auth-smoke",
    main: path.join(root, "workers/app/index.ts"),
    vars: { ...baseConfig.vars, AUTH_CANONICAL_ORIGIN: origin, AUTH_REQUIRE_EMAIL_VERIFICATION: "true", AUTH_EMAIL_PROVIDER: "cfsend" },
    secrets: { required: [...(baseConfig.secrets?.required || []), ...(stripeSelected ? ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_PRO"] : [])] },
    assets: { ...baseConfig.assets, directory: path.join(root, "dist/web") },
    hyperdrive: [{ ...baseConfig.hyperdrive[0], localConnectionString: databaseSource.toString() }],
    routes: [],
    workers_dev: false,
  };
  await writeFile(configPath, `${JSON.stringify(localConfig, null, 2)}\n`, { mode: 0o600 });
  child = spawn(process.execPath, ["--no-warnings", path.join(root, "node_modules/wrangler/wrangler-dist/cli.js"), "dev", "--config", configPath, "--env-file", smokeEnvPath, "--ip", "127.0.0.1", "--port", String(port), "--show-interactive-dev-session", "false", "--log-level", "info"], {
    cwd: root,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => { logs += chunk.toString(); });
  child.stderr.on("data", (chunk) => { logs += chunk.toString(); });
}

const email = `smoke+${randomUUID()}@example.test`;
const cleanupEmails = [email];
const password = `Smoke-${randomUUID()}-A1!`;
const smokeIp = `203.0.113.${Math.floor(Math.random() * 254) + 1}`;
const database = new Client({
  connectionString: databaseSource.toString(),
  ...(!isolatedDatabaseUrl ? { ssl: { rejectUnauthorized: false } } : {}),
  application_name: `${starter.project.slug}-auth-smoke-cleanup`,
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function stripeSignature(payload, secret, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
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

if (remote) {
  await waitUntilReady();
  const methods = await request("/api/auth-methods", { headers: { Origin: origin } });
  assert(methods.response.status === 200 && methods.payload?.methods?.some((method) => method.key === "google"), "edge auth methods are unavailable");
  const session = await request("/api/session", { headers: { Origin: origin } });
  assert(session.response.status === 401 && session.payload?.error?.code === "UNAUTHORIZED", "edge session endpoint did not reject an anonymous request");
  const google = await request("/api/auth/sign-in/social", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ provider: "google", callbackURL: "/app", disableRedirect: true }) });
  const stateCookies = typeof google.response.headers.getSetCookie === "function" ? google.response.headers.getSetCookie() : [google.response.headers.get("set-cookie")].filter(Boolean);
  const secureState = stateCookies.length > 0 && stateCookies.every((value) => /;\s*HttpOnly/iu.test(value) && /;\s*Secure/iu.test(value) && !/;\s*Domain=/iu.test(value));
  assert(google.response.status === 200 && secureState, "edge Google authorization state cookie is not secure and host-only");
  console.log(JSON.stringify({ ok: true, runtime: "cloudflare-development-edge", checks: ["auth-methods", "anonymous-session-denial", "google-authorization", "secure-host-only-state-cookie"] }, null, 2));
  process.exit(0);
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
  const credentialIdentity = await database.query("select issuer, account_id, user_id from app_account where user_id = (select id from app_user where email = $1) and provider_id = 'credential'", [email]);
  assert(credentialIdentity.rows[0]?.issuer === "local:credential" && credentialIdentity.rows[0]?.account_id === credentialIdentity.rows[0]?.user_id, "Better Auth 1.7 credential identity is not issuer-scoped to the stable user ID");
  checks.push("known-email");
  checks.push("credential-issuer-identity");

  const unverifiedLogin = await request("/api/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ email, password, callbackURL: "/app" }) });
  assert(unverifiedLogin.response.status !== 200, "unverified email was allowed to sign in");
  checks.push("unverified-sign-in-denial");

  const verificationOutbox = await database.query("select action_url, status, provider_message_id from app_auth_email_outbox where recipient = $1 and kind = 'email-verification' order by created_at asc limit 1", [email]);
  const verificationUrl = verificationOutbox.rows[0]?.action_url || "";
  assert(verificationOutbox.rows[0]?.status === "sent" && verificationOutbox.rows[0]?.provider_message_id, "verification email was not sent through the provider");
  const verification = await fetch(verificationUrl, { redirect: "manual", headers: { Origin: origin } });
  assert(verification.status >= 300 && verification.status < 400, "verification callback did not redirect");
  const verified = await database.query("select email_verified from app_user where email = $1", [email]);
  assert(verified.rows[0]?.email_verified === true, "verification callback did not mark the email verified");
  checks.push("email-verification");

  const login = await request("/api/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ email, password, callbackURL: "/app" }) });
  assert(login.response.status === 200, `email sign-in failed with ${login.response.status}`);
  const cookieHeaders = typeof login.response.headers.getSetCookie === "function" ? login.response.headers.getSetCookie() : [login.response.headers.get("set-cookie")].filter(Boolean);
  const cookie = cookieHeaders.map((value) => value.split(";", 1)[0]).join("; ");
  assert(cookie.includes("session"), "email sign-in did not set a session cookie");
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

  if (organizationsSelected) {
    const organizationSlug = `smoke-${randomUUID().slice(0, 12)}`;
    const createdOrganization = await request("/api/auth/organization/create", { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie, Origin: origin }, body: JSON.stringify({ name: "Smoke Organization", slug: organizationSlug }) });
    assert(createdOrganization.response.status === 200 && createdOrganization.payload?.id, `organization creation failed (${createdOrganization.response.status}: ${JSON.stringify(createdOrganization.payload)})`);
    const organizationId = createdOrganization.payload.id;
    const listedOrganizations = await request("/api/auth/organization/list", { headers: { Cookie: cookie, Origin: origin } });
    assert(listedOrganizations.response.status === 200 && listedOrganizations.payload?.some?.((item) => item.id === organizationId), "organization list did not contain the created organization");
    const member = await database.query("select role from app_organization_member where organization_id = $1 and user_id = (select id from app_user where email = $2)", [organizationId, email]);
    const defaultTeam = await database.query("select count(*)::int as count from app_team where organization_id = $1", [organizationId]);
    assert(member.rows[0]?.role === "owner" && defaultTeam.rows[0]?.count === 1, "organization creator role or default team is incorrect");
    const invitationEmail = `invite+${randomUUID()}@example.test`;
    cleanupEmails.push(invitationEmail);
    const invitation = await request("/api/auth/organization/invite-member", { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie, Origin: origin }, body: JSON.stringify({ organizationId, email: invitationEmail, role: "member", resend: true }) });
    assert(invitation.response.status === 200, `organization invitation failed (${invitation.response.status}: ${JSON.stringify(invitation.payload)})`);
    const invitationOutbox = await database.query("select status, action_url from app_auth_email_outbox where recipient = $1 and kind = 'organization-invitation'", [invitationEmail]);
    assert(invitationOutbox.rows[0]?.status === "sent" && invitationOutbox.rows[0]?.action_url?.includes("/app/invitation?id="), "organization invitation did not use the configured email provider");
    const invitedPassword = `Invite-${randomUUID()}-A1!`;
    const invitedIp = `198.51.100.${Math.floor(Math.random() * 254) + 1}`;
    const invitedRegistration = await request("/api/auth-flow/register", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ email: invitationEmail, name: "Invited Smoke", password: invitedPassword, confirmPassword: invitedPassword }) });
    assert(invitedRegistration.response.status === 202, "invited user registration failed");
    const invitedVerification = await database.query("select action_url from app_auth_email_outbox where recipient = $1 and kind = 'email-verification' order by created_at desc limit 1", [invitationEmail]);
    const invitedVerificationResponse = await fetch(invitedVerification.rows[0]?.action_url || "", { redirect: "manual", headers: { Origin: origin } });
    assert(invitedVerificationResponse.status >= 300 && invitedVerificationResponse.status < 400, "invited user email verification failed");
    const invitedLogin = await request("/api/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin, "CF-Connecting-IP": invitedIp }, body: JSON.stringify({ email: invitationEmail, password: invitedPassword, callbackURL: "/app/invitation" }) });
    const invitedCookieHeaders = typeof invitedLogin.response.headers.getSetCookie === "function" ? invitedLogin.response.headers.getSetCookie() : [invitedLogin.response.headers.get("set-cookie")].filter(Boolean);
    const invitedCookie = invitedCookieHeaders.map((value) => value.split(";", 1)[0]).join("; ");
    assert(invitedLogin.response.status === 200 && invitedCookie.includes("session"), "invited user sign-in failed");
    const invitationId = invitation.payload?.id || (await database.query("select id from app_organization_invitation where organization_id = $1 and email = $2", [organizationId, invitationEmail])).rows[0]?.id;
    const acceptedInvitation = await request("/api/auth/organization/accept-invitation", { method: "POST", headers: { "Content-Type": "application/json", Cookie: invitedCookie, Origin: origin }, body: JSON.stringify({ invitationId }) });
    assert(acceptedInvitation.response.status === 200, `invitation acceptance failed (${acceptedInvitation.response.status}: ${JSON.stringify(acceptedInvitation.payload)})`);
    const secondOrganization = await request("/api/auth/organization/create", { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie, Origin: origin }, body: JSON.stringify({ name: "Isolated Organization", slug: `isolated-${randomUUID().slice(0, 12)}` }) });
    const isolatedRead = await request(`/api/auth/organization/get-full-organization?organizationId=${encodeURIComponent(secondOrganization.payload?.id || "")}`, { headers: { Cookie: invitedCookie, Origin: origin } });
    assert(secondOrganization.response.status === 200 && isolatedRead.response.status >= 400, "organization membership did not isolate another tenant");
    const invitedAdmin = await request("/api/admin/support/tickets", { headers: { Cookie: invitedCookie, Origin: origin } });
    assert(invitedAdmin.response.status === 403, "organization membership granted platform Admin access");
    checks.push("organization-create-list-role-team-invitation-acceptance-isolation");
  }

  if (stripeSelected) {
    const subscriptions = await request("/api/auth/subscription/list", { headers: { Cookie: cookie, Origin: origin } });
    assert(subscriptions.response.status === 200 && Array.isArray(subscriptions.payload), "signed-in user could not read the empty subscription projection");
    const forbiddenReference = await request(`/api/auth/subscription/list?referenceId=${encodeURIComponent(randomUUID())}`, { headers: { Cookie: cookie, Origin: origin } });
    assert(forbiddenReference.response.status >= 400, "billing reference authorization accepted another user's reference ID");
    const eventId = `evt_starter_${randomUUID().replaceAll("-", "")}`;
    const eventBody = JSON.stringify({ id: eventId, object: "event", api_version: "2026-07-29.dahlia", created: Math.floor(Date.now() / 1000), data: { object: {} }, livemode: false, pending_webhooks: 1, request: null, type: "starter.smoke" });
    const rejectedWebhook = await request("/api/auth/stripe/webhook", { method: "POST", headers: { "Content-Type": "application/json", "Stripe-Signature": "t=1,v1=invalid", Origin: origin }, body: eventBody });
    assert(rejectedWebhook.response.status === 400, "Stripe webhook accepted an invalid signature");
    const signature = stripeSignature(eventBody, "whsec_starter_smoke_only");
    const acceptedWebhook = await request("/api/auth/stripe/webhook", { method: "POST", headers: { "Content-Type": "application/json", "Stripe-Signature": signature, Origin: origin }, body: eventBody });
    const replayedWebhook = await request("/api/auth/stripe/webhook", { method: "POST", headers: { "Content-Type": "application/json", "Stripe-Signature": signature, Origin: origin }, body: eventBody });
    const webhookEvidence = await database.query("select received_count from app_stripe_webhook_event where event_id = $1", [eventId]);
    assert(acceptedWebhook.response.status === 200 && replayedWebhook.response.status === 200 && webhookEvidence.rows[0]?.received_count === 2, "signed Stripe webhook replay evidence is incorrect");
    checks.push("stripe-reference-authorization-signed-webhook-replay");
  }

  const supportTicket = await request("/api/support/tickets", { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie, Origin: origin }, body: JSON.stringify({ kind: "bug", subject: "Smoke support ticket", body: "A reproducible support lifecycle smoke report." }) });
  assert(supportTicket.response.status === 201 && supportTicket.payload?.data?.status === "open", "verified user could not create a support ticket");
  const ticketId = supportTicket.payload.data.id;
  const ownTickets = await request("/api/support/tickets", { headers: { Cookie: cookie, Origin: origin } });
  assert(ownTickets.response.status === 200 && ownTickets.payload?.data?.some((ticket) => ticket.id === ticketId), "user support inbox did not return the created ticket");
  const deniedAdmin = await request("/api/admin/support/tickets", { headers: { Cookie: cookie, Origin: origin } });
  assert(deniedAdmin.response.status === 403, "non-admin user could access the Admin support inbox");
  checks.push("support-intake-and-isolation");

  await database.query("update app_user set role = 'admin' where email = $1", [email]);
  const adminTickets = await request("/api/admin/support/tickets", { headers: { Cookie: cookie, Origin: origin } });
  assert(adminTickets.response.status === 200 && adminTickets.payload?.data?.some((ticket) => ticket.id === ticketId), "platform admin could not read the support inbox");
  const betterAuthUsers = await request("/api/auth/admin/list-users?limit=20", { headers: { Cookie: cookie, Origin: origin } });
  assert(betterAuthUsers.response.status === 200 && betterAuthUsers.payload?.users?.some((user) => user.email === email), "Better Auth Admin user list is unavailable");
  const resolvedTicket = await request(`/api/admin/support/tickets/${ticketId}`, { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: cookie, Origin: origin }, body: JSON.stringify({ status: "resolved" }) });
  assert(
    resolvedTicket.response.status === 200 && resolvedTicket.payload?.data?.status === "resolved",
    `Admin could not resolve the support ticket (${resolvedTicket.response.status}: ${JSON.stringify(resolvedTicket.payload)})`,
  );
  const audit = await database.query("select count(*)::int as count from app_admin_audit_event where target_id = $1 and action = 'support.status.updated'", [ticketId]);
  assert(audit.rows[0]?.count === 1, "support Admin mutation did not write audit evidence");
  checks.push("better-auth-admin-and-support-lifecycle");

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
  assert(outbox.rows[0]?.count >= 2 && mailRequests.length >= 2, "auth emails were not sent through the CFsend contract double");
  assert(mailRequests.every((entry) => entry.headers["idempotency-key"]?.startsWith("auth-") && entry.body.html && entry.body.text), "CFsend requests are missing stable idempotency or multipart content");
  checks.push("cfsend-delivery");

  console.log(JSON.stringify({ ok: true, runtime: "workerd", database: scratchDatabase ? "temporary-isolated-database" : "explicit-test-database", checks }, null, 2));
} catch (error) {
  await new Promise((resolve) => setTimeout(resolve, 250));
  console.error(JSON.stringify({ event: "auth_smoke_failed", message: error instanceof Error ? error.message : String(error), workerdLogs: logs.slice(-4000) }, null, 2));
  throw error;
} finally {
  if (database._connected) {
    if (!scratchDatabase) {
      await database.query("delete from app_admin_audit_event where target_type = 'support_ticket' and target_id in (select id from app_support_ticket where contact_email = $1)", [email]).catch(() => undefined);
      await database.query("delete from app_support_ticket where contact_email = $1", [email]).catch(() => undefined);
      await database.query("delete from app_auth_email_outbox where recipient = any($1::text[])", [cleanupEmails]).catch(() => undefined);
      await database.query("delete from app_user where email = any($1::text[])", [cleanupEmails]).catch(() => undefined);
    }
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
  if (mailServer) await new Promise((resolve) => mailServer.close(resolve));
  if (scratchAdmin && scratchDatabase) {
    await scratchAdmin.query(`drop database if exists "${scratchDatabase}" with (force)`).catch(() => undefined);
    await scratchAdmin.end().catch(() => undefined);
  }
}
