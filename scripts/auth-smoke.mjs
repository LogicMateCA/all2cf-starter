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
const browserAcceptanceEnabled = process.argv.includes("--browser-acceptance");
const port = Number(process.env.STARTER_AUTH_SMOKE_PORT || 18788);
const mailPort = Number(process.env.STARTER_AUTH_SMOKE_MAIL_PORT || 18789);
const webhookPort = Number(
  process.env.STARTER_AUTH_SMOKE_WEBHOOK_PORT || 18790,
);
const smsPort = Number(process.env.STARTER_AUTH_SMOKE_SMS_PORT || 18791);
const streamPort = Number(process.env.STARTER_AUTH_SMOKE_STREAM_PORT || 18792);
const envPath = path.join(root, ".dev.vars");
const values = parseEnv(await readFile(envPath, "utf8"));
const starter = JSON.parse(
  await readFile(path.join(root, "starter.config.json"), "utf8"),
);
const blueprint = JSON.parse(
  await readFile(path.join(root, "starter.blueprint.json"), "utf8"),
);
const selectedPacks = new Set(
  Object.values(blueprint.selections)
    .flat()
    .filter(({ lifecycle }) => lifecycle.selected && lifecycle.materialized)
    .map(({ id }) => id),
);
const organizationsSelected = selectedPacks.has("saas.team-organizations");
const stripeSelected = selectedPacks.has("saas.billing-stripe");
const apiKeysSelected = selectedPacks.has("saas.api-keys");
const apiPlatformSelected = selectedPacks.has("saas.api-platform");
const twoFactorSelected = selectedPacks.has("saas.account-security-2fa");
const entitlementsSelected = selectedPacks.has("saas.entitlements");
const usageSelected = selectedPacks.has("saas.usage");
const outgoingWebhooksSelected = selectedPacks.has(
  "saas.outgoing-webhooks",
);
const onboardingSelected = selectedPacks.has("saas.onboarding");
const objectStorageSelected = selectedPacks.has("capability.object-storage");
const turnstileSelected = selectedPacks.has("capability.turnstile");
const workersAiSelected = selectedPacks.has("capability.workers-ai");
const vectorizeSelected = selectedPacks.has("capability.vectorize");
const searchProvider = blueprint.providers?.search?.provider || "none";
const expoPushSelected = selectedPacks.has("capability.expo-push");
const twilioSmsSelected = selectedPacks.has("capability.twilio-sms");
const cloudflareImagesSelected = selectedPacks.has("capability.cloudflare-images");
const cloudflareStreamSelected = selectedPacks.has("capability.cloudflare-stream");
const origin = remote
  ? `https://${starter.development.domain}`
  : `http://127.0.0.1:${port}`;
const baseConfig = parseJsonc(
  await readFile(
    path.join(root, "cloudflare/wrangler.development.jsonc"),
    "utf8",
  ),
);
const isolatedDatabaseUrl = process.env.STARTER_AUTH_SMOKE_DATABASE_URL?.trim();
const databaseSource = new URL(
  isolatedDatabaseUrl || values.get("DATABASE_URL") || "",
);
let scratchDatabase = null;
let scratchAdmin = null;
if (!remote && !isolatedDatabaseUrl) {
  databaseSource.hostname = starter.development.database.host;
  databaseSource.port = String(starter.development.database.port);
  databaseSource.pathname = `/${starter.development.database.database}`;
  databaseSource.searchParams.set("sslmode", "require");
  databaseSource.searchParams.set("uselibpqcompat", "true");
  scratchDatabase = `starter_auth_smoke_${Date.now()}_${randomUUID().replaceAll("-", "").slice(0, 8)}`;
  scratchAdmin = new Client({
    connectionString: databaseSource.toString(),
    ssl: { rejectUnauthorized: false },
    application_name: `${starter.project.slug}-auth-smoke-schema`,
  });
  await scratchAdmin.connect();
  await scratchAdmin.query(`create database "${scratchDatabase}"`);
  databaseSource.pathname = `/${scratchDatabase}`;
  const migrationClient = new Client({
    connectionString: databaseSource.toString(),
    ssl: { rejectUnauthorized: false },
    application_name: `${starter.project.slug}-auth-smoke-migration`,
  });
  await migrationClient.connect();
  try {
    const migrationRoot = path.join(root, "db/migrations");
    const migrations = (await readdir(migrationRoot))
      .filter((name) => /^\d+.*\.sql$/u.test(name))
      .sort();
    for (const migration of migrations)
      await migrationClient.query(
        await readFile(path.join(migrationRoot, migration), "utf8"),
      );
  } catch (error) {
    await scratchAdmin
      .query(`drop database if exists "${scratchDatabase}" with (force)`)
      .catch(() => undefined);
    await scratchAdmin.end().catch(() => undefined);
    throw error;
  } finally {
    await migrationClient.end().catch(() => undefined);
  }
}

let child = null;
let mailServer = null;
let webhookServer = null;
let smsServer = null;
let streamServer = null;
const mailRequests = [];
const webhookRequests = [];
const smsRequests = [];
const streamRequests = [];
let logs = "";
if (!remote) {
  const tempRoot = path.join(root, "dist/auth-smoke");
  const configPath = path.join(tempRoot, "wrangler.jsonc");
  const smokeEnvPath = path.join(tempRoot, ".dev.vars");
  const workerEntryPath = path.join(tempRoot, "worker.ts");
  await mkdir(tempRoot, { recursive: true });
  if (apiKeysSelected || usageSelected || stripeSelected || twilioSmsSelected) {
    const smokeImports = [
      `import app from ${JSON.stringify(path.join(root, "workers/app/index.ts"))};`,
      `import { withRequestAuth } from ${JSON.stringify(path.join(root, "workers/app/auth-runtime.ts"))};`,
      ...(usageSelected
        ? [
            `import { consumeUserUsage } from ${JSON.stringify(path.join(root, "workers/app/features/usage-worker.ts"))};`,
          ]
        : []),
      ...(stripeSelected
        ? [
            `import { recordBillingNotification } from ${JSON.stringify(path.join(root, "workers/app/features/stripe-auth-plugin.ts"))};`,
          ]
        : []),
      ...(twilioSmsSelected
        ? [
            `import { sendTwilioSms } from ${JSON.stringify(path.join(root, "workers/app/features/twilio-sms-worker.ts"))};`,
          ]
        : []),
    ];
    const smokeHandlers = [
      ...(apiKeysSelected
        ? [
            `    if (url.pathname === "/api/__smoke/verify-api-key" && request.method === "POST") {
      return withRequestAuth(env, ctx, async (auth) => {
        const body = await request.json();
        const verifyApiKey = (auth.api as unknown as { verifyApiKey: (input: { body: unknown }) => Promise<unknown> }).verifyApiKey;
        return Response.json(await verifyApiKey({ body }));
      });
    }`,
          ]
        : []),
      ...(usageSelected
        ? [
            `    if (url.pathname === "/api/__smoke/consume-usage" && request.method === "POST") {
      return withRequestAuth(env, ctx, async (auth, database) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) return Response.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
        const body = await request.json<{ metricKey?: string; amount?: number; idempotencyKey?: string }>();
        try {
          return Response.json({ data: await consumeUserUsage(database, {
            userId: session.user.id,
            metricKey: String(body.metricKey || ""),
            amount: Number(body.amount),
            idempotencyKey: String(body.idempotencyKey || ""),
          }) });
        } catch (error) {
          if (error instanceof RangeError)
            return Response.json({ error: { code: "INVALID_USAGE", message: error.message } }, { status: 400 });
          throw error;
        }
      });
    }`,
          ]
        : []),
      ...(stripeSelected
        ? [
            `    if (url.pathname === "/api/__smoke/billing-notification" && request.method === "POST") {
      return withRequestAuth(env, ctx, async (auth, database) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) return Response.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
        const body = await request.json<{ eventId?: string }>();
        const recorded = await recordBillingNotification(
          database,
          String(body.eventId || ""),
          session.user.id,
          "Subscription updated",
          "The signed Stripe subscription projection changed.",
        );
        return Response.json({ data: { recorded } });
      });
    }`,
          ]
        : []),
      ...(twilioSmsSelected
        ? [
            `    if (url.pathname === "/api/__smoke/send-sms" && request.method === "POST") {
      return withRequestAuth(env, ctx, async (auth, database) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) return Response.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
        const body = await request.json<{ to?: string; idempotencyKey?: string }>();
        return Response.json({ data: await sendTwilioSms(database, env, {
          to: String(body.to || ""), body: "Starter SMS smoke test", kind: "starter-smoke",
          idempotencyKey: String(body.idempotencyKey || ""), actorUserId: session.user.id,
        }) });
      });
    }`,
          ]
        : []),
    ];
    await writeFile(
      workerEntryPath,
      `${smokeImports.join("\n")}
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
${smokeHandlers.join("\n")}
    return app.fetch(request, env, ctx);
  },
  async queue(batch: MessageBatch<unknown>, env: Env, ctx: ExecutionContext) {
    if (app.queue) return app.queue(batch, env, ctx);
  },
};
`,
      { mode: 0o600 },
    );
  }
  mailServer = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    if (
      request.method !== "POST" ||
      request.url !== "/emails" ||
      request.headers.authorization !== "Bearer smoke-cfsend-key"
    ) {
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }
    mailRequests.push({ headers: request.headers, body: JSON.parse(body) });
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({ id: `smoke-message-${mailRequests.length}` }),
    );
  });
  await new Promise((resolve, reject) => {
    mailServer.once("error", reject);
    mailServer.listen(mailPort, "127.0.0.1", resolve);
  });
  if (twilioSmsSelected) {
    smsServer = createServer(async (request, response) => {
      let body = "";
      for await (const chunk of request) body += chunk;
      const expectedAuthorization = `Basic ${Buffer.from("SK11111111111111111111111111111111:smoke-twilio-secret").toString("base64")}`;
      if (
        request.method !== "POST" ||
        request.url !== "/2010-04-01/Accounts/AC11111111111111111111111111111111/Messages.json" ||
        request.headers.authorization !== expectedAuthorization
      ) {
        response.writeHead(401, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ code: 20003, message: "Authentication Error" }));
        return;
      }
      const form = new URLSearchParams(body);
      smsRequests.push({ headers: request.headers, form: Object.fromEntries(form) });
      response.writeHead(201, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ sid: `SM${String(smsRequests.length).padStart(32, "1")}`, status: "queued", error_code: null }));
    });
    await new Promise((resolve, reject) => {
      smsServer.once("error", reject);
      smsServer.listen(smsPort, "127.0.0.1", resolve);
    });
  }
  if (cloudflareStreamSelected) {
    streamServer = createServer(async (request, response) => {
      let body = "";
      for await (const chunk of request) body += chunk;
      streamRequests.push({ method: request.method, url: request.url, headers: request.headers, body });
      if (request.headers.authorization !== "Bearer smoke-stream-token") {
        response.writeHead(401, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ success: false, errors: [{ code: 10000, message: "Authentication error" }] }));
        return;
      }
      if (request.method === "POST" && request.url === "/accounts/7cb5d7a44fde3f702b4757dbf6d4218d/stream/direct_upload") {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ success: true, result: { uid: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", uploadURL: "https://upload.example.test/stream-upload" } }));
        return;
      }
      if (request.method === "DELETE" && request.url === "/accounts/7cb5d7a44fde3f702b4757dbf6d4218d/stream/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa") {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ success: true, result: {} }));
        return;
      }
      response.writeHead(404, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ success: false, errors: [{ code: 10001, message: "Not found" }] }));
    });
    await new Promise((resolve, reject) => { streamServer.once("error", reject); streamServer.listen(streamPort, "127.0.0.1", resolve); });
  }
  if (outgoingWebhooksSelected) {
    webhookServer = createServer(async (request, response) => {
      let body = "";
      for await (const chunk of request) body += chunk;
      const target = new URL(request.url || "/", `http://127.0.0.1:${webhookPort}`);
      const deliveryId = String(request.headers["webhook-id"] || "");
      const attempts =
        webhookRequests.filter((entry) => entry.deliveryId === deliveryId)
          .length + 1;
      webhookRequests.push({
        deliveryId,
        attempts,
        mode: target.searchParams.get("mode") || "success",
        headers: request.headers,
        body,
      });
      const retryOnce = target.searchParams.get("mode") === "retry" && attempts === 1;
      const alwaysFail = target.searchParams.get("mode") === "fail";
      response.writeHead(retryOnce || alwaysFail ? 503 : 200, {
        "Content-Type": "application/json",
      });
      response.end(JSON.stringify({ accepted: !(retryOnce || alwaysFail), attempts }));
    });
    await new Promise((resolve, reject) => {
      webhookServer.once("error", reject);
      webhookServer.listen(webhookPort, "127.0.0.1", resolve);
    });
  }
  const smokeValues = new Map(values);
  smokeValues.set("APP_ENV", "test");
  smokeValues.set("CFSEND_API_URL", `http://127.0.0.1:${mailPort}`);
  smokeValues.set("CFSEND_API_KEY", "smoke-cfsend-key");
  smokeValues.set("CFSEND_FROM", "Starter Smoke <auth@example.test>");
  if (stripeSelected) {
    smokeValues.set("STRIPE_SECRET_KEY", "sk_test_starter_smoke_only");
    smokeValues.set("STRIPE_WEBHOOK_SECRET", "whsec_starter_smoke_only");
    smokeValues.set("STRIPE_PRICE_PRO", "price_starter_smoke_only");
  }
  if (outgoingWebhooksSelected)
    smokeValues.set(
      "WEBHOOK_SIGNING_KEY",
      "starter-smoke-webhook-signing-root-at-least-32-bytes",
    );
  if (turnstileSelected)
    smokeValues.set(
      "TURNSTILE_SECRET_KEY",
      "1x0000000000000000000000000000000AA",
    );
  if (twilioSmsSelected) {
    smokeValues.set("TWILIO_ACCOUNT_SID", "AC11111111111111111111111111111111");
    smokeValues.set("TWILIO_API_KEY", "SK11111111111111111111111111111111");
    smokeValues.set("TWILIO_API_SECRET", "smoke-twilio-secret");
    smokeValues.set("TWILIO_FROM", "+14035550100");
  }
  if (cloudflareStreamSelected) {
    smokeValues.set("CLOUDFLARE_STREAM_TOKEN", "smoke-stream-token");
    smokeValues.set("STREAM_WEBHOOK_SECRET", "smoke-stream-webhook-secret");
  }
  await writeFile(
    smokeEnvPath,
    renderEnv([...smokeValues.keys()], smokeValues),
    { mode: 0o600 },
  );
  const localConfig = {
    ...baseConfig,
    name: "starter-auth-smoke",
    main:
      apiKeysSelected || usageSelected || stripeSelected || twilioSmsSelected
        ? workerEntryPath
        : path.join(root, "workers/app/index.ts"),
    vars: {
      ...baseConfig.vars,
      APP_ENV: "test",
      AUTH_CANONICAL_ORIGIN: origin,
      AUTH_REQUIRE_EMAIL_VERIFICATION: "true",
      AUTH_EMAIL_PROVIDER: "cfsend",
      ...(twilioSmsSelected ? { TWILIO_API_BASE_URL: `http://127.0.0.1:${smsPort}` } : {}),
      ...(cloudflareStreamSelected ? { STREAM_API_BASE_URL: `http://127.0.0.1:${streamPort}` } : {}),
    },
    secrets: {
      required: [...new Set([
        ...(baseConfig.secrets?.required || []),
        ...(stripeSelected
          ? ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_PRO"]
          : []),
      ])],
    },
    assets: { ...baseConfig.assets, directory: path.join(root, "dist/web") },
    hyperdrive: [
      {
        ...baseConfig.hyperdrive[0],
        localConnectionString: databaseSource.toString(),
      },
    ],
    routes: [],
    workers_dev: false,
  };
  await writeFile(configPath, `${JSON.stringify(localConfig, null, 2)}\n`, {
    mode: 0o600,
  });
  const smokeChildEnv = { ...process.env };
  for (const name of [
    "APP_ENV",
    "CFSEND_API_URL",
    "CFSEND_API_KEY",
    "CFSEND_FROM",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_PRO",
    "WEBHOOK_SIGNING_KEY",
    "TURNSTILE_SECRET_KEY",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_API_KEY",
    "TWILIO_API_SECRET",
    "TWILIO_FROM",
    "CLOUDFLARE_STREAM_TOKEN",
    "STREAM_WEBHOOK_SECRET",
  ]) delete smokeChildEnv[name];
  child = spawn(
    process.execPath,
    [
      "--no-warnings",
      path.join(root, "node_modules/wrangler/wrangler-dist/cli.js"),
      "dev",
      "--config",
      configPath,
      "--env-file",
      smokeEnvPath,
      "--ip",
      "127.0.0.1",
      "--port",
      String(port),
      "--show-interactive-dev-session",
      "false",
      "--log-level",
      "info",
    ],
    {
      cwd: root,
      env: smokeChildEnv,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout.on("data", (chunk) => {
    logs += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    logs += chunk.toString();
  });
}

const email = `smoke+${randomUUID()}@example.test`;
const cleanupEmails = [email];
const otherNotificationEmail = `smoke-other+${randomUUID()}@example.test`;
const cleanupNotificationIds = [];
const cleanupSubscriptionIds = [];
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

function stripeSignature(
  payload,
  secret,
  timestamp = Math.floor(Date.now() / 1000),
) {
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

async function request(pathname, init = {}) {
  const turnstileProtected =
    turnstileSelected &&
    (pathname === "/api/auth-flow/register" ||
      pathname === "/api/auth/sign-in/email" ||
      pathname === "/api/auth/request-password-reset");
  const response = await fetch(`${origin}${pathname}`, {
    ...init,
    headers: {
      ...(!remote ? { "CF-Connecting-IP": smokeIp } : {}),
      ...(turnstileProtected
        ? { "x-captcha-response": "XXXX.DUMMY.TOKEN.XXXX" }
        : {}),
      ...(init.headers || {}),
    },
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return { response, payload };
}

function responseCookieHeader(response) {
  const headers =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  const cookies = new Map();
  for (const header of headers) {
    const pair = header.split(";", 1)[0];
    const name = pair.split("=", 1)[0];
    cookies.set(name, pair);
  }
  return [...cookies.values()].join("; ");
}

function decodeBase32(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = value.toUpperCase().replace(/=+$/u, "");
  let bits = "";
  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("Invalid base32 TOTP secret");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8)
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  return Buffer.from(bytes);
}

function totpFromUri(uri, now = Date.now()) {
  const parsed = new URL(uri);
  const secret = parsed.searchParams.get("secret");
  const digits = Number(parsed.searchParams.get("digits") || 6);
  const period = Number(parsed.searchParams.get("period") || 30);
  if (!secret || digits !== 6 || !Number.isFinite(period))
    throw new Error("TOTP URI is incomplete");
  const counter = BigInt(Math.floor(now / 1000 / period));
  const counterBytes = Buffer.alloc(8);
  counterBytes.writeBigUInt64BE(counter);
  const digest = createHmac("sha1", decodeBase32(secret))
    .update(counterBytes)
    .digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 10 ** digits).padStart(digits, "0");
}

async function waitUntilReady() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child?.exitCode !== null && child)
      throw new Error(`wrangler dev exited before readiness\n${logs}`);
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`wrangler dev did not become ready\n${logs}`);
}

async function waitForWebhookDelivery(deliveryId, expectedStatus, attempts = 1) {
  for (let index = 0; index < 80; index += 1) {
    const result = await database.query(
      "select status, attempt_count, response_status, last_error from app_webhook_delivery where id = $1",
      [deliveryId],
    );
    const delivery = result.rows[0];
    if (
      delivery?.status === expectedStatus &&
      delivery.attempt_count >= attempts
    )
      return delivery;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `webhook delivery ${deliveryId} did not reach ${expectedStatus}`,
  );
}

if (remote) {
  await waitUntilReady();
  const methods = await request("/api/auth-methods", {
    headers: { Origin: origin },
  });
  assert(
    methods.response.status === 200 &&
      methods.payload?.methods?.some((method) => method.key === "google"),
    "edge auth methods are unavailable",
  );
  const session = await request("/api/session", {
    headers: { Origin: origin },
  });
  assert(
    session.response.status === 401 &&
      session.payload?.error?.code === "UNAUTHORIZED",
    "edge session endpoint did not reject an anonymous request",
  );
  const google = await request("/api/auth/sign-in/social", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({
      provider: "google",
      callbackURL: "/app",
      disableRedirect: true,
    }),
  });
  const stateCookies =
    typeof google.response.headers.getSetCookie === "function"
      ? google.response.headers.getSetCookie()
      : [google.response.headers.get("set-cookie")].filter(Boolean);
  const secureState =
    stateCookies.length > 0 &&
    stateCookies.every(
      (value) =>
        /;\s*HttpOnly/iu.test(value) &&
        /;\s*Secure/iu.test(value) &&
        !/;\s*Domain=/iu.test(value),
    );
  assert(
    google.response.status === 200 && secureState,
    "edge Google authorization state cookie is not secure and host-only",
  );
  console.log(
    JSON.stringify(
      {
        ok: true,
        runtime: "cloudflare-development-edge",
        checks: [
          "auth-methods",
          "anonymous-session-denial",
          "google-authorization",
          "secure-host-only-state-cookie",
        ],
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const checks = [];
try {
  await waitUntilReady();
  await database.connect();

  if (turnstileSelected) {
    const missingCaptcha = await fetch(`${origin}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        ...(!remote ? { "CF-Connecting-IP": smokeIp } : {}),
      },
      body: JSON.stringify({
        email: "turnstile-missing@example.test",
        password: "Not-A-Real-Password-1!",
      }),
    });
    assert(
      missingCaptcha.status >= 400,
      "Better Auth Captcha accepted a credential request without a Turnstile token",
    );
    checks.push("turnstile-missing-token-denial-live-siteverify-pass");
  }

  const unknown = await request("/api/auth-flow/check-email", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ email }),
  });
  assert(
    unknown.response.status === 200 && unknown.payload?.data?.exists === false,
    "unknown email lookup did not return exists=false",
  );
  checks.push("unknown-email");

  const invalid = await request("/api/auth-flow/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({
      email,
      name: "Smoke Test",
      password: "short",
      confirmPassword: "short",
    }),
  });
  assert(
    invalid.response.status === 400 &&
      invalid.payload?.error?.code === "INVALID_PASSWORD",
    "invalid registration was not rejected",
  );
  checks.push("registration-validation");

  const registration = await request("/api/auth-flow/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({
      email,
      name: "Smoke Test",
      password,
      confirmPassword: password,
    }),
  });
  assert(
    registration.response.status === 202 &&
      registration.payload?.data?.accepted === true,
    "registration was not accepted",
  );
  checks.push("registration");

  const duplicate = await request("/api/auth-flow/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({
      email,
      name: "Smoke Test",
      password,
      confirmPassword: password,
    }),
  });
  assert(
    duplicate.response.status === 202 &&
      duplicate.payload?.data?.accepted === true,
    "duplicate registration did not preserve generic response",
  );
  checks.push("enumeration-safe-registration");

  const known = await request("/api/auth-flow/check-email", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ email }),
  });
  assert(
    known.response.status === 200 &&
      known.payload?.data?.exists === true &&
      known.payload?.data?.hasPassword === true,
    "known email lookup did not return password capability",
  );
  const credentialIdentity = await database.query(
    "select issuer, account_id, user_id from app_account where user_id = (select id from app_user where email = $1) and provider_id = 'credential'",
    [email],
  );
  assert(
    credentialIdentity.rows[0]?.issuer === "local:credential" &&
      credentialIdentity.rows[0]?.account_id ===
        credentialIdentity.rows[0]?.user_id,
    "Better Auth 1.7 credential identity is not issuer-scoped to the stable user ID",
  );
  checks.push("known-email");
  checks.push("credential-issuer-identity");

  const unverifiedLogin = await request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ email, password, callbackURL: "/app" }),
  });
  assert(
    unverifiedLogin.response.status !== 200,
    "unverified email was allowed to sign in",
  );
  checks.push("unverified-sign-in-denial");

  const verificationOutbox = await database.query(
    "select action_url, status, provider_message_id from app_auth_email_outbox where recipient = $1 and kind = 'email-verification' order by created_at asc limit 1",
    [email],
  );
  const verificationUrl = verificationOutbox.rows[0]?.action_url || "";
  assert(
    verificationOutbox.rows[0]?.status === "sent" &&
      verificationOutbox.rows[0]?.provider_message_id,
    "verification email was not sent through the provider",
  );
  const verification = await fetch(verificationUrl, {
    redirect: "manual",
    headers: { Origin: origin },
  });
  assert(
    verification.status >= 300 && verification.status < 400,
    "verification callback did not redirect",
  );
  const verified = await database.query(
    "select email_verified from app_user where email = $1",
    [email],
  );
  assert(
    verified.rows[0]?.email_verified === true,
    "verification callback did not mark the email verified",
  );
  checks.push("email-verification");

  const login = await request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ email, password, callbackURL: "/app" }),
  });
  assert(
    login.response.status === 200,
    `email sign-in failed with ${login.response.status}`,
  );
  const cookieHeaders =
    typeof login.response.headers.getSetCookie === "function"
      ? login.response.headers.getSetCookie()
      : [login.response.headers.get("set-cookie")].filter(Boolean);
  const cookie = cookieHeaders
    .map((value) => value.split(";", 1)[0])
    .join("; ");
  let browserCookie = cookie;
  assert(
    cookie.includes("session"),
    "email sign-in did not set a session cookie",
  );
  checks.push("email-sign-in");

  const session = await request("/api/session", {
    headers: { Cookie: cookie, Origin: origin },
  });
  assert(
    session.response.status === 200 &&
      session.payload?.data?.user?.email === email,
    "protected session endpoint did not return the signed-in user",
  );
  checks.push("session");

  if (onboardingSelected) {
    const anonymousOnboarding = await request("/api/onboarding");
    const initialOnboarding = await request("/api/onboarding", {
      headers: { Cookie: cookie, Origin: origin },
    });
    const invalidOnboarding = await request("/api/onboarding/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        Origin: origin,
      },
      body: JSON.stringify({ stepId: "invented-step" }),
    });
    assert(
      anonymousOnboarding.response.status === 401 &&
        initialOnboarding.response.status === 200 &&
        initialOnboarding.payload?.data?.complete === false &&
        initialOnboarding.payload?.data?.nextStepId === "welcome" &&
        invalidOnboarding.response.status === 400,
      "onboarding did not enforce session-owned authoritative steps",
    );
    const completeOnboarding = () =>
      request("/api/onboarding/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
          Origin: origin,
        },
        body: JSON.stringify({ stepId: "welcome" }),
      });
    const completedOnboarding = await completeOnboarding();
    const replayedOnboarding = await completeOnboarding();
    const resumedOnboarding = await request("/api/onboarding", {
      headers: { Cookie: cookie, Origin: origin },
    });
    const progressEvidence = await database.query(
      `select definition_version, completed_steps, completed_at
       from app_onboarding_progress
       where user_id = (select id from app_user where email = $1)`,
      [email],
    );
    assert(
      completedOnboarding.response.status === 200 &&
        completedOnboarding.payload?.data?.complete === true &&
        replayedOnboarding.response.status === 200 &&
        resumedOnboarding.payload?.data?.complete === true &&
        progressEvidence.rows[0]?.definition_version === 1 &&
        progressEvidence.rows[0]?.completed_steps?.join(",") === "welcome" &&
        progressEvidence.rows[0]?.completed_at,
      "onboarding completion was not idempotent and resumable",
    );
    checks.push("product-onboarding-session-order-idempotent-resume");
  }

  const defaultPreferences = await request("/api/preferences", {
    headers: { Cookie: cookie, Origin: origin },
  });
  assert(
    defaultPreferences.response.status === 200 &&
      defaultPreferences.payload?.data?.theme === "system" &&
      defaultPreferences.payload?.data?.locale === "en",
    "default account preferences are incorrect",
  );
  const updatePreferences = await request("/api/preferences", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      Origin: origin,
    },
    body: JSON.stringify({ theme: "dark", locale: "zh" }),
  });
  assert(
    updatePreferences.response.status === 200,
    "account preference update failed",
  );
  const updatedPreferences = await request("/api/preferences", {
    headers: { Cookie: cookie, Origin: origin },
  });
  assert(
    updatedPreferences.payload?.data?.theme === "dark" &&
      updatedPreferences.payload?.data?.locale === "zh",
    "account preferences did not persist",
  );
  checks.push("account-preferences");

  const anonymousNotifications = await request("/api/notifications", {
    headers: { Origin: origin },
  });
  assert(
    anonymousNotifications.response.status === 401,
    "anonymous user could access notifications",
  );
  const currentUserId = session.payload.data.user.id;
  if (cloudflareStreamSelected) {
    const anonymousStreamUpload = await request("/api/stream/uploads", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ fileName: "test.mp4" }) });
    const createdStreamUpload = await request("/api/stream/uploads", { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie, Origin: origin }, body: JSON.stringify({ fileName: "smoke-video.mp4" }) });
    const streamAssetId = createdStreamUpload.payload?.data?.id;
    const streamUid = createdStreamUpload.payload?.data?.uid;
    const listedBeforeWebhook = await request("/api/stream/assets", { headers: { Cookie: cookie, Origin: origin } });
    const webhookPayload = JSON.stringify({ uid: streamUid, readyToStream: true, status: { state: "ready", pctComplete: "100", errorReasonCode: "", errorReasonText: "" }, thumbnail: "https://videodelivery.example/thumbnail.jpg", playback: { hls: "https://videodelivery.example/manifest/video.m3u8", dash: "https://videodelivery.example/manifest/video.mpd" } });
    const webhookTime = Math.floor(Date.now() / 1000);
    const webhookSignature = createHmac("sha256", "smoke-stream-webhook-secret").update(`${webhookTime}.${webhookPayload}`).digest("hex");
    const invalidStreamWebhook = await request("/api/stream/webhook", { method: "POST", headers: { "Content-Type": "application/json", "Webhook-Signature": `time=${webhookTime},sig1=invalid`, Origin: origin }, body: webhookPayload });
    const acceptedStreamWebhook = await request("/api/stream/webhook", { method: "POST", headers: { "Content-Type": "application/json", "Webhook-Signature": `time=${webhookTime},sig1=${webhookSignature}`, Origin: origin }, body: webhookPayload });
    const replayedStreamWebhook = await request("/api/stream/webhook", { method: "POST", headers: { "Content-Type": "application/json", "Webhook-Signature": `time=${webhookTime},sig1=${webhookSignature}`, Origin: origin }, body: webhookPayload });
    const listedAfterWebhook = await request("/api/stream/assets", { headers: { Cookie: cookie, Origin: origin } });
    const deletedStreamAsset = await request(`/api/stream/assets/${encodeURIComponent(streamAssetId || "")}`, { method: "DELETE", headers: { Cookie: cookie, Origin: origin } });
    const deletedStreamAssetAgain = await request(`/api/stream/assets/${encodeURIComponent(streamAssetId || "")}`, { method: "DELETE", headers: { Cookie: cookie, Origin: origin } });
    const directUploadRequest = streamRequests.find(({ method, url }) => method === "POST" && url?.endsWith("/stream/direct_upload"));
    const directUploadBody = directUploadRequest ? JSON.parse(directUploadRequest.body) : null;
    assert(
      anonymousStreamUpload.response.status === 401 &&
        createdStreamUpload.response.status === 201 && streamAssetId && streamUid === "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" &&
        createdStreamUpload.payload?.data?.uploadURL === "https://upload.example.test/stream-upload" &&
        listedBeforeWebhook.payload?.data?.assets?.some((asset) => asset.id === streamAssetId && asset.status === "upload_pending") &&
        invalidStreamWebhook.response.status === 401 &&
        acceptedStreamWebhook.response.status === 200 && acceptedStreamWebhook.payload?.data?.duplicate === false &&
        replayedStreamWebhook.response.status === 200 && replayedStreamWebhook.payload?.data?.duplicate === true &&
        listedAfterWebhook.payload?.data?.assets?.some((asset) => asset.id === streamAssetId && asset.status === "ready" && asset.ready_to_stream === true && asset.hls_url?.endsWith("video.m3u8")) &&
        directUploadRequest?.headers?.authorization === "Bearer smoke-stream-token" &&
        directUploadRequest?.headers?.["upload-creator"] === currentUserId &&
        directUploadBody?.creator === currentUserId && directUploadBody?.maxDurationSeconds === 600 && directUploadBody?.requireSignedURLs === false &&
        deletedStreamAsset.response.status === 204 && deletedStreamAssetAgain.response.status === 404,
      "Cloudflare Stream ownership, direct upload, signed webhook, replay, playback state, or deletion failed",
    );
    checks.push("cloudflare-stream-auth-direct-upload-signed-webhook-replay-playback-delete");
  }
  if (twilioSmsSelected) {
    const deniedSmsAdmin = await request("/api/admin/sms/test", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie, Origin: origin },
      body: JSON.stringify({ to: "+14035550123" }),
    });
    const smsIdempotencyKey = `sms-smoke-${randomUUID()}`;
    const firstSms = await request("/api/__smoke/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie, Origin: origin },
      body: JSON.stringify({ to: "+14035550123", idempotencyKey: smsIdempotencyKey }),
    });
    const replayedSms = await request("/api/__smoke/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie, Origin: origin },
      body: JSON.stringify({ to: "+14035550123", idempotencyKey: smsIdempotencyKey }),
    });
    const smsEvidence = await database.query(
      `select recipient_hash, recipient_last4, provider_sid, status, error_code
         from app_sms_delivery where idempotency_key = $1`,
      [smsIdempotencyKey],
    );
    assert(
      deniedSmsAdmin.response.status === 403 &&
        firstSms.response.status === 200 &&
        firstSms.payload?.data?.duplicate === false &&
        firstSms.payload?.data?.providerSid?.startsWith("SM") &&
        replayedSms.response.status === 200 &&
        replayedSms.payload?.data?.duplicate === true &&
        smsRequests.length === 1 &&
        smsRequests[0]?.form?.To === "+14035550123" &&
        smsRequests[0]?.form?.From === "+14035550100" &&
        smsRequests[0]?.form?.Body === "Starter SMS smoke test" &&
        smsEvidence.rows[0]?.recipient_hash !== "+14035550123" &&
        smsEvidence.rows[0]?.recipient_last4 === "0123" &&
        smsEvidence.rows[0]?.status === "queued",
      "Twilio SMS authorization, form, idempotency, or privacy evidence failed",
    );
    checks.push("twilio-sms-admin-denial-basic-auth-form-idempotency-hashed-recipient-provider-sid");
  }
  if (expoPushSelected) {
    const anonymousPushDevices = await request("/api/push/devices", { headers: { Origin: origin } });
    assert(anonymousPushDevices.response.status === 401, "anonymous user could list push devices");
    const invalidPushDevice = await request("/api/push/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie, Origin: origin },
      body: JSON.stringify({ token: "ExpoPushToken[starterInvalidProjectToken]", projectId: "00000000-0000-4000-8000-000000000000", platform: "ios" }),
    });
    assert(invalidPushDevice.response.status === 422, "push registration accepted the wrong Expo project");
    const pushToken = `ExpoPushToken[${randomUUID().replaceAll("-", "")}A]`;
    const registeredPushDevice = await request("/api/push/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie, Origin: origin },
      body: JSON.stringify({ token: pushToken, projectId: blueprint.providers.push.development.projectId, platform: "ios" }),
    });
    const pushDeviceId = registeredPushDevice.payload?.data?.id;
    const listedPushDevices = await request("/api/push/devices", { headers: { Cookie: cookie, Origin: origin } });
    assert(
      registeredPushDevice.response.status === 200 &&
        pushDeviceId &&
        listedPushDevices.response.status === 200 &&
        listedPushDevices.payload?.data?.devices?.some((device) => device.id === pushDeviceId && device.platform === "ios"),
      "Expo push device registration or owner list failed",
    );
    const removedPushDevice = await request(`/api/push/devices/${encodeURIComponent(pushDeviceId)}`, { method: "DELETE", headers: { Cookie: cookie, Origin: origin } });
    const removedPushDeviceAgain = await request(`/api/push/devices/${encodeURIComponent(pushDeviceId)}`, { method: "DELETE", headers: { Cookie: cookie, Origin: origin } });
    assert(removedPushDevice.response.status === 204 && removedPushDeviceAgain.response.status === 404, "Expo push device removal was not owner-scoped and idempotent-safe");
    checks.push("expo-push-auth-project-validation-register-list-delete");
  }
  if (objectStorageSelected) {
    const anonymousObjects = await request("/api/storage/objects", {
      headers: { Origin: origin },
    });
    assert(
      anonymousObjects.response.status === 401,
      "anonymous user could list stored objects",
    );
    const privateBytes = Buffer.from(`starter-r2-private-${randomUUID()}`);
    const privateUpload = await request("/api/storage/objects", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "X-File-Name": "private-smoke.txt",
        Cookie: cookie,
        Origin: origin,
      },
      body: privateBytes,
    });
    assert(
      privateUpload.response.status === 201 &&
        privateUpload.payload?.data?.provider === "cloudflare-r2" &&
        privateUpload.payload?.data?.id,
      `private R2 upload failed (${privateUpload.response.status}: ${JSON.stringify(privateUpload.payload)})`,
    );
    const privateObjectId = privateUpload.payload.data.id;
    const objectList = await request("/api/storage/objects", {
      headers: { Cookie: cookie, Origin: origin },
    });
    assert(
      objectList.response.status === 200 &&
        objectList.payload?.data?.objects?.some(
          (item) =>
            item.id === privateObjectId &&
            item.byteSize === privateBytes.byteLength &&
            item.visibility === "private",
        ),
      "uploaded R2 object was missing from the owner list",
    );
    const privateDownload = await fetch(
      `${origin}/api/storage/objects/${encodeURIComponent(privateObjectId)}`,
      { headers: { Cookie: cookie, Origin: origin } },
    );
    assert(
      privateDownload.status === 200 &&
        Buffer.from(await privateDownload.arrayBuffer()).equals(privateBytes),
      "private R2 download did not preserve exact bytes",
    );
    const deniedPublicRead = await request(
      `/api/public/storage/${encodeURIComponent(privateObjectId)}`,
      { headers: { Origin: origin } },
    );
    assert(
      deniedPublicRead.response.status === 404,
      "private R2 object was exposed by the public route",
    );
    const publicBytes = Buffer.from(`starter-r2-public-${randomUUID()}`);
    const publicUpload = await request("/api/storage/objects", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-File-Name": "public-smoke.bin",
        "X-Object-Visibility": "public",
        Cookie: cookie,
        Origin: origin,
      },
      body: publicBytes,
    });
    const publicObjectId = publicUpload.payload?.data?.id;
    const publicDownload = await fetch(
      `${origin}/api/public/storage/${encodeURIComponent(publicObjectId || "")}`,
      { headers: { Origin: origin } },
    );
    assert(
      publicUpload.response.status === 201 &&
        publicObjectId &&
        publicDownload.status === 200 &&
        Buffer.from(await publicDownload.arrayBuffer()).equals(publicBytes),
      "public R2 object did not complete an anonymous exact-byte round trip",
    );
    const unsafeUpload = await request("/api/storage/objects", {
      method: "POST",
      headers: {
        "Content-Type": "text/html",
        "X-File-Name": "unsafe.html",
        Cookie: cookie,
        Origin: origin,
      },
      body: Buffer.from("<script>alert(1)</script>"),
    });
    assert(
      unsafeUpload.response.status === 422,
      "unsafe active-content upload was not rejected",
    );
    for (const objectId of [privateObjectId, publicObjectId]) {
      const deleted = await request(
        `/api/storage/objects/${encodeURIComponent(objectId)}`,
        { method: "DELETE", headers: { Cookie: cookie, Origin: origin } },
      );
      assert(deleted.response.status === 204, "R2 object deletion failed");
    }
    const deletedRead = await request(
      `/api/storage/objects/${encodeURIComponent(privateObjectId)}`,
      { headers: { Cookie: cookie, Origin: origin } },
    );
    const deletedMetadata = await database.query(
      "select count(*)::int as count from app_object_storage where id = any($1::text[]) and deleted_at is not null",
      [[privateObjectId, publicObjectId]],
    );
    assert(
      deletedRead.response.status === 404 &&
        deletedMetadata.rows[0]?.count === 2,
      "R2 deletion did not remove bytes and retain soft-deleted metadata",
    );
    checks.push(
      "object-storage-r2-auth-private-public-exact-byte-roundtrip-active-content-denial-delete",
    );
  }
  const otherUserId = randomUUID();
  const currentNotificationId = randomUUID();
  const otherNotificationId = randomUUID();
  const secondCurrentNotificationId = randomUUID();
  cleanupNotificationIds.push(
    currentNotificationId,
    otherNotificationId,
    secondCurrentNotificationId,
  );
  await database.query(
    "insert into app_user (id, name, email, email_verified, role, banned) values ($1, 'Other Smoke User', $2, true, 'user', false)",
    [otherUserId, otherNotificationEmail],
  );
  cleanupEmails.push(otherNotificationEmail);
  await database.query(
    `insert into app_notification (id, recipient_user_id, category, title, body, deep_link)
     values ($1, $2, 'system', 'Current user notice', 'This notice belongs to the current user.', '/app'),
            ($3, $4, 'system', 'Other user notice', 'This notice must remain private.', '/app'),
            ($5, $2, 'product', 'Second current notice', 'This notice is used for mark-all verification.', null)`,
    [
      currentNotificationId,
      currentUserId,
      otherNotificationId,
      otherUserId,
      secondCurrentNotificationId,
    ],
  );
  const notificationList = await request("/api/notifications", {
    headers: { Cookie: cookie, Origin: origin },
  });
  assert(
    notificationList.response.status === 200 &&
      notificationList.payload?.data?.unreadCount === 2 &&
      notificationList.payload?.data?.notifications?.some(
        (item) => item.id === currentNotificationId,
      ) &&
      !notificationList.payload?.data?.notifications?.some(
        (item) => item.id === otherNotificationId,
      ),
    "notification list/count was not isolated to the current user",
  );
  const unreadCount = await request("/api/notifications/unread-count", {
    headers: { Cookie: cookie, Origin: origin },
  });
  assert(
    unreadCount.response.status === 200 &&
      unreadCount.payload?.data?.unreadCount === 2,
    "notification unread count was incorrect",
  );
  const foreignRead = await request(
    `/api/notifications/${otherNotificationId}/read`,
    { method: "PATCH", headers: { Cookie: cookie, Origin: origin } },
  );
  assert(
    foreignRead.response.status === 404,
    "current user could mark another user's notification read",
  );
  const markedOne = await request(
    `/api/notifications/${currentNotificationId}/read`,
    { method: "PATCH", headers: { Cookie: cookie, Origin: origin } },
  );
  const markedOneAgain = await request(
    `/api/notifications/${currentNotificationId}/read`,
    { method: "PATCH", headers: { Cookie: cookie, Origin: origin } },
  );
  assert(
    markedOne.response.status === 200 &&
      markedOneAgain.response.status === 200 &&
      markedOneAgain.payload?.data?.read_at,
    "mark-one notification was not idempotent",
  );
  const markedAll = await request("/api/notifications/read-all", {
    method: "POST",
    headers: { Cookie: cookie, Origin: origin },
  });
  const finalUnreadCount = await request("/api/notifications/unread-count", {
    headers: { Cookie: cookie, Origin: origin },
  });
  assert(
    markedAll.response.status === 200 &&
      finalUnreadCount.response.status === 200 &&
      finalUnreadCount.payload?.data?.unreadCount === 0,
    "mark-all notification or final unread count failed",
  );
  checks.push(
    "notifications-auth-isolation-unread-list-foreign-denial-mark-one-idempotency-mark-all",
  );

  if (apiKeysSelected) {
    const createdApiKey = await request("/api/auth/api-key/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        Origin: origin,
      },
      body: JSON.stringify({ name: "Smoke API key", expiresIn: 2_592_000 }),
    });
    assert(
      createdApiKey.response.status === 200 &&
        createdApiKey.payload?.key?.startsWith("app_") &&
        createdApiKey.payload?.id,
      `API key creation failed (${createdApiKey.response.status}: ${JSON.stringify(createdApiKey.payload)})`,
    );
    const apiKeyId = createdApiKey.payload.id;
    const apiKeySecret = createdApiKey.payload.key;
    const storedApiKey = await database.query(
      "select key, reference_id, permissions from app_api_key where id = $1",
      [apiKeyId],
    );
    assert(
      storedApiKey.rows[0]?.key &&
        storedApiKey.rows[0].key !== apiKeySecret &&
        storedApiKey.rows[0]?.reference_id === currentUserId,
      "API key was not hashed and isolated to its user owner",
    );
    const listedApiKeys = await request(
      "/api/auth/api-key/list?limit=50&offset=0&sortBy=createdAt&sortDirection=desc",
      { headers: { Cookie: cookie, Origin: origin } },
    );
    assert(
      listedApiKeys.response.status === 200 &&
        listedApiKeys.payload?.apiKeys?.some(
          (item) => item.id === apiKeyId && !item.key,
        ),
      "API key list did not return the owned key without its secret",
    );
    const verifiedApiKey = await request("/api/__smoke/verify-api-key", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({
        key: apiKeySecret,
        permissions: { product: ["read"] },
      }),
    });
    const deniedApiKeyScope = await request("/api/__smoke/verify-api-key", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({
        key: apiKeySecret,
        permissions: { product: ["write"] },
      }),
    });
    assert(
      verifiedApiKey.response.status === 200 &&
        verifiedApiKey.payload?.valid === true &&
        deniedApiKeyScope.response.status === 200 &&
        deniedApiKeyScope.payload?.valid === false,
      "API key permission verification did not allow read and deny write",
    );
    const apiKeySession = await request("/api/session", {
      headers: { "x-api-key": apiKeySecret, Origin: origin },
    });
    assert(
      apiKeySession.response.status === 401,
      "API key unexpectedly created a browser session",
    );
    const revokedApiKey = await request("/api/auth/api-key/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        Origin: origin,
      },
      body: JSON.stringify({ keyId: apiKeyId }),
    });
    const revokedVerification = await request("/api/__smoke/verify-api-key", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({ key: apiKeySecret }),
    });
    assert(
      revokedApiKey.response.status === 200 &&
        revokedApiKey.payload?.success === true &&
        revokedVerification.response.status === 200 &&
        revokedVerification.payload?.valid === false,
      "API key revoke did not invalidate the key",
    );
    checks.push(
      "better-auth-api-key-create-hash-list-read-scope-write-denial-no-session-revoke",
    );
  }

  await database.query("update app_user set role = 'admin' where id = $1", [
    otherUserId,
  ]);

  if (organizationsSelected) {
    const organizationSlug = `smoke-${randomUUID().slice(0, 12)}`;
    const createdOrganization = await request("/api/auth/organization/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        Origin: origin,
      },
      body: JSON.stringify({
        name: "Smoke Organization",
        slug: organizationSlug,
      }),
    });
    assert(
      createdOrganization.response.status === 200 &&
        createdOrganization.payload?.id,
      `organization creation failed (${createdOrganization.response.status}: ${JSON.stringify(createdOrganization.payload)})`,
    );
    const organizationId = createdOrganization.payload.id;
    const listedOrganizations = await request("/api/auth/organization/list", {
      headers: { Cookie: cookie, Origin: origin },
    });
    assert(
      listedOrganizations.response.status === 200 &&
        listedOrganizations.payload?.some?.(
          (item) => item.id === organizationId,
        ),
      "organization list did not contain the created organization",
    );
    const member = await database.query(
      "select role from app_organization_member where organization_id = $1 and user_id = (select id from app_user where email = $2)",
      [organizationId, email],
    );
    const defaultTeam = await database.query(
      "select count(*)::int as count from app_team where organization_id = $1",
      [organizationId],
    );
    assert(
      member.rows[0]?.role === "owner" && defaultTeam.rows[0]?.count === 1,
      "organization creator role or default team is incorrect",
    );
    const invitationEmail = `invite+${randomUUID()}@example.test`;
    cleanupEmails.push(invitationEmail);
    const invitation = await request("/api/auth/organization/invite-member", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        Origin: origin,
      },
      body: JSON.stringify({
        organizationId,
        email: invitationEmail,
        role: "member",
        resend: true,
      }),
    });
    assert(
      invitation.response.status === 200,
      `organization invitation failed (${invitation.response.status}: ${JSON.stringify(invitation.payload)})`,
    );
    const invitationOutbox = await database.query(
      "select status, action_url from app_auth_email_outbox where recipient = $1 and kind = 'organization-invitation'",
      [invitationEmail],
    );
    assert(
      invitationOutbox.rows[0]?.status === "sent" &&
        invitationOutbox.rows[0]?.action_url?.includes("/app/invitation?id="),
      "organization invitation did not use the configured email provider",
    );
    const invitedPassword = `Invite-${randomUUID()}-A1!`;
    const invitedIp = `198.51.100.${Math.floor(Math.random() * 254) + 1}`;
    const invitedRegistration = await request("/api/auth-flow/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({
        email: invitationEmail,
        name: "Invited Smoke",
        password: invitedPassword,
        confirmPassword: invitedPassword,
      }),
    });
    assert(
      invitedRegistration.response.status === 202,
      "invited user registration failed",
    );
    const invitedVerification = await database.query(
      "select action_url from app_auth_email_outbox where recipient = $1 and kind = 'email-verification' order by created_at desc limit 1",
      [invitationEmail],
    );
    const invitedVerificationResponse = await fetch(
      invitedVerification.rows[0]?.action_url || "",
      { redirect: "manual", headers: { Origin: origin } },
    );
    assert(
      invitedVerificationResponse.status >= 300 &&
        invitedVerificationResponse.status < 400,
      "invited user email verification failed",
    );
    const invitedLogin = await request("/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        "CF-Connecting-IP": invitedIp,
      },
      body: JSON.stringify({
        email: invitationEmail,
        password: invitedPassword,
        callbackURL: "/app/invitation",
      }),
    });
    const invitedCookieHeaders =
      typeof invitedLogin.response.headers.getSetCookie === "function"
        ? invitedLogin.response.headers.getSetCookie()
        : [invitedLogin.response.headers.get("set-cookie")].filter(Boolean);
    const invitedCookie = invitedCookieHeaders
      .map((value) => value.split(";", 1)[0])
      .join("; ");
    assert(
      invitedLogin.response.status === 200 && invitedCookie.includes("session"),
      "invited user sign-in failed",
    );
    const invitationId =
      invitation.payload?.id ||
      (
        await database.query(
          "select id from app_organization_invitation where organization_id = $1 and email = $2",
          [organizationId, invitationEmail],
        )
      ).rows[0]?.id;
    const acceptedInvitation = await request(
      "/api/auth/organization/accept-invitation",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: invitedCookie,
          Origin: origin,
        },
        body: JSON.stringify({ invitationId }),
      },
    );
    assert(
      acceptedInvitation.response.status === 200,
      `invitation acceptance failed (${acceptedInvitation.response.status}: ${JSON.stringify(acceptedInvitation.payload)})`,
    );
    const activatedOrganization = await request(
      "/api/auth/organization/set-active",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
          Origin: origin,
        },
        body: JSON.stringify({ organizationId }),
      },
    );
    const activeOrganization = await request(
      "/api/auth/organization/get-full-organization",
      { headers: { Cookie: cookie, Origin: origin } },
    );
    const listedMembers = await request(
      `/api/auth/organization/list-members?organizationId=${encodeURIComponent(organizationId)}&limit=100&offset=0&sortBy=createdAt&sortDirection=asc`,
      { headers: { Cookie: cookie, Origin: origin } },
    );
    const invitedMember = listedMembers.payload?.members?.find(
      (item) => item.user?.email === invitationEmail,
    );
    const promotedMember = await request(
      "/api/auth/organization/update-member-role",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
          Origin: origin,
        },
        body: JSON.stringify({
          organizationId,
          memberId: invitedMember?.id,
          role: "admin",
        }),
      },
    );
    const promotedMemberState = await database.query(
      "select role from app_organization_member where id = $1",
      [invitedMember?.id],
    );
    assert(
      activatedOrganization.response.status === 200 &&
        activeOrganization.response.status === 200 &&
        activeOrganization.payload?.id === organizationId &&
        listedMembers.response.status === 200 &&
        listedMembers.payload?.total === 2 &&
        invitedMember?.id &&
        promotedMember.response.status === 200 &&
        promotedMemberState.rows[0]?.role === "admin",
      "organization active context, member listing, or role administration failed",
    );
    const cancelledInvitationEmail = `cancelled+${randomUUID()}@example.test`;
    cleanupEmails.push(cancelledInvitationEmail);
    const cancellableInvitation = await request(
      "/api/auth/organization/invite-member",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
          Origin: origin,
        },
        body: JSON.stringify({
          organizationId,
          email: cancelledInvitationEmail,
          role: "member",
        }),
      },
    );
    const listedInvitations = await request(
      `/api/auth/organization/list-invitations?organizationId=${encodeURIComponent(organizationId)}`,
      { headers: { Cookie: cookie, Origin: origin } },
    );
    const cancellableInvitationId =
      cancellableInvitation.payload?.id ||
      listedInvitations.payload?.find?.(
        (item) => item.email === cancelledInvitationEmail,
      )?.id;
    const cancelledInvitation = await request(
      "/api/auth/organization/cancel-invitation",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
          Origin: origin,
        },
        body: JSON.stringify({ invitationId: cancellableInvitationId }),
      },
    );
    const invitationsAfterCancel = await request(
      `/api/auth/organization/list-invitations?organizationId=${encodeURIComponent(organizationId)}`,
      { headers: { Cookie: cookie, Origin: origin } },
    );
    const cancelledInvitationState = await database.query(
      "select status from app_organization_invitation where id = $1",
      [cancellableInvitationId],
    );
    assert(
      cancellableInvitation.response.status === 200 &&
        listedInvitations.response.status === 200 &&
        cancellableInvitationId &&
        cancelledInvitation.response.status === 200 &&
        invitationsAfterCancel.response.status === 200 &&
        cancelledInvitationState.rows[0]?.status === "canceled",
      "organization invitation listing or cancellation failed",
    );
    const secondOrganization = await request("/api/auth/organization/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        Origin: origin,
      },
      body: JSON.stringify({
        name: "Isolated Organization",
        slug: `isolated-${randomUUID().slice(0, 12)}`,
      }),
    });
    const isolatedRead = await request(
      `/api/auth/organization/get-full-organization?organizationId=${encodeURIComponent(secondOrganization.payload?.id || "")}`,
      { headers: { Cookie: invitedCookie, Origin: origin } },
    );
    assert(
      secondOrganization.response.status === 200 &&
        isolatedRead.response.status >= 400,
      "organization membership did not isolate another tenant",
    );
    const invitedAdmin = await request("/api/admin/support/tickets", {
      headers: { Cookie: invitedCookie, Origin: origin },
    });
    assert(
      invitedAdmin.response.status === 403,
      "organization membership granted platform Admin access",
    );
    const activatedSecondOrganization = await request(
      "/api/auth/organization/set-active",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
          Origin: origin,
        },
        body: JSON.stringify({
          organizationId: secondOrganization.payload?.id,
        }),
      },
    );
    const secondActiveRead = await request(
      "/api/auth/organization/get-full-organization",
      { headers: { Cookie: cookie, Origin: origin } },
    );
    const removedMember = await request(
      "/api/auth/organization/remove-member",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
          Origin: origin,
        },
        body: JSON.stringify({
          organizationId,
          memberIdOrEmail: invitedMember?.id,
        }),
      },
    );
    const removedMembership = await database.query(
      "select count(*)::int as count from app_organization_member where id = $1",
      [invitedMember?.id],
    );
    const organizationNotifications = await database.query(
      `select n.title, count(*)::int as count
       from app_notification n
       join app_user u on u.id = n.recipient_user_id
       where n.category = 'organization' and u.email = $1
       group by n.title`,
      [invitationEmail],
    );
    const organizationNotificationCounts = new Map(
      organizationNotifications.rows.map((row) => [row.title, row.count]),
    );
    const creatorOrganizationNotifications = await database.query(
      `select count(*)::int as count
       from app_notification
       where recipient_user_id = $1 and category = 'organization' and title = 'Workspace created'`,
      [currentUserId],
    );
    assert(
      activatedSecondOrganization.response.status === 200 &&
        secondActiveRead.response.status === 200 &&
        secondActiveRead.payload?.id === secondOrganization.payload?.id &&
        removedMember.response.status === 200 &&
        removedMembership.rows[0]?.count === 0 &&
        organizationNotificationCounts.get("Organization joined") === 1 &&
        organizationNotificationCounts.get("Organization role changed") === 1 &&
        organizationNotificationCounts.get("Organization access removed") === 1 &&
        creatorOrganizationNotifications.rows[0]?.count === 2,
      "organization workspace switching, member removal, or event notifications failed",
    );
    checks.push(
      "organization-create-list-active-switch-role-team-member-admin-invitation-cancel-acceptance-removal-isolation-notifications",
    );
  }

  if (stripeSelected) {
    const subscriptions = await request("/api/auth/subscription/list", {
      headers: { Cookie: cookie, Origin: origin },
    });
    assert(
      subscriptions.response.status === 200 &&
        Array.isArray(subscriptions.payload),
      "signed-in user could not read the empty subscription projection",
    );
    const forbiddenReference = await request(
      `/api/auth/subscription/list?referenceId=${encodeURIComponent(randomUUID())}`,
      { headers: { Cookie: cookie, Origin: origin } },
    );
    assert(
      forbiddenReference.response.status >= 400,
      "billing reference authorization accepted another user's reference ID",
    );
    const eventId = `evt_starter_${randomUUID().replaceAll("-", "")}`;
    const eventBody = JSON.stringify({
      id: eventId,
      object: "event",
      api_version: "2026-07-29.dahlia",
      created: Math.floor(Date.now() / 1000),
      data: { object: {} },
      livemode: false,
      pending_webhooks: 1,
      request: null,
      type: "starter.smoke",
    });
    const rejectedWebhook = await request("/api/auth/stripe/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": "t=1,v1=invalid",
        Origin: origin,
      },
      body: eventBody,
    });
    assert(
      rejectedWebhook.response.status === 400,
      "Stripe webhook accepted an invalid signature",
    );
    const signature = stripeSignature(eventBody, "whsec_starter_smoke_only");
    const acceptedWebhook = await request("/api/auth/stripe/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": signature,
        Origin: origin,
      },
      body: eventBody,
    });
    const replayedWebhook = await request("/api/auth/stripe/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": signature,
        Origin: origin,
      },
      body: eventBody,
    });
    const webhookEvidence = await database.query(
      "select received_count from app_stripe_webhook_event where event_id = $1",
      [eventId],
    );
    assert(
      acceptedWebhook.response.status === 200 &&
        replayedWebhook.response.status === 200 &&
        webhookEvidence.rows[0]?.received_count === 2,
      "signed Stripe webhook replay evidence is incorrect",
    );
    const billingNotificationEventId = `evt_notice_${randomUUID().replaceAll("-", "")}`;
    const billingNotification = () =>
      request("/api/__smoke/billing-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
          Origin: origin,
        },
        body: JSON.stringify({ eventId: billingNotificationEventId }),
      });
    const firstBillingNotification = await billingNotification();
    const replayedBillingNotification = await billingNotification();
    const billingNotificationEvidence = await database.query(
      `select count(*)::int as count from app_notification
       where id = $1 and recipient_user_id = $2 and category = 'billing'`,
      [`billing:${billingNotificationEventId}:${currentUserId}`, currentUserId],
    );
    assert(
      firstBillingNotification.response.status === 200 &&
        firstBillingNotification.payload?.data?.recorded === true &&
        replayedBillingNotification.response.status === 200 &&
        billingNotificationEvidence.rows[0]?.count === 1,
      "billing lifecycle notification was not recipient-scoped and idempotent",
    );
    checks.push(
      "stripe-reference-authorization-signed-webhook-replay-idempotent-billing-notification",
    );
  }

  if (entitlementsSelected) {
    const anonymousAccess = await request("/api/entitlements/me", {
      headers: { Origin: origin },
    });
    assert(
      anonymousAccess.response.status === 401,
      "anonymous user could read entitlements",
    );
    const freeAccess = await request("/api/entitlements/me", {
      headers: { Cookie: cookie, Origin: origin },
    });
    assert(
      freeAccess.response.status === 200 &&
        freeAccess.payload?.data?.plan?.id === "free" &&
        freeAccess.payload?.data?.entitlements?.some(
          (item) => item.key === "product.read" && item.enabled === true,
        ),
      "free entitlement fallback is incorrect",
    );
    const deniedAdminAccess = await request(
      `/api/admin/entitlements/${encodeURIComponent(otherUserId)}`,
      { headers: { Cookie: cookie, Origin: origin } },
    );
    assert(
      deniedAdminAccess.response.status === 403,
      "ordinary user could read another user's entitlements",
    );
    const subscriptionId = `sub_starter_${randomUUID().replaceAll("-", "")}`;
    cleanupSubscriptionIds.push(subscriptionId);
    await database.query(
      `insert into app_subscription (id, plan, reference_id, status, period_end)
       values ($1, 'pro', $2, 'active', current_timestamp + interval '30 days')`,
      [subscriptionId, currentUserId],
    );
    const paidAccess = await request("/api/entitlements/me", {
      headers: { Cookie: cookie, Origin: origin },
    });
    assert(
      paidAccess.response.status === 200 &&
        paidAccess.payload?.data?.plan?.id === "pro" &&
        paidAccess.payload?.data?.entitlements?.some(
          (item) =>
            item.key === "product.actions.monthly" && item.limit === 10000,
        ),
      "active subscription did not resolve paid entitlements",
    );
    await database.query(
      `update app_subscription set period_end = current_timestamp - interval '1 second' where id = $1`,
      [subscriptionId],
    );
    const expiredAccess = await request("/api/entitlements/me", {
      headers: { Cookie: cookie, Origin: origin },
    });
    assert(
      expiredAccess.response.status === 200 &&
        expiredAccess.payload?.data?.plan?.id === "free",
      "expired subscription retained paid entitlements",
    );
    checks.push("entitlements-auth-free-active-expired-isolation");
  }

  if (usageSelected) {
    const consumeUsage = (amount, idempotencyKey, extra = {}) =>
      request("/api/__smoke/consume-usage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
          Origin: origin,
        },
        body: JSON.stringify({
          metricKey: "product.actions.monthly",
          amount,
          idempotencyKey,
          ...extra,
        }),
      });
    const anonymousUsage = await request("/api/usage/me", {
      headers: { Origin: origin },
    });
    const anonymousConsume = await request("/api/__smoke/consume-usage", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({
        metricKey: "product.actions.monthly",
        amount: 1,
        idempotencyKey: `usage-anonymous-${randomUUID()}`,
      }),
    });
    assert(
      anonymousUsage.response.status === 401 &&
        anonymousConsume.response.status === 401,
      "anonymous usage access was not denied",
    );
    const invalidUsage = await consumeUsage(0, `usage-invalid-${randomUUID()}`);
    assert(
      invalidUsage.response.status === 400 &&
        invalidUsage.payload?.error?.code === "INVALID_USAGE",
      "invalid usage amount was accepted",
    );
    const freeDenied = await consumeUsage(1, `usage-free-${randomUUID()}`);
    assert(
      freeDenied.response.status === 200 &&
        freeDenied.payload?.data?.status === "not_entitled",
      "Free plan consumed a paid usage meter",
    );
    const rejectedWrites = await database.query(
      `select
         (select count(*)::int from app_usage_event where subject_user_id = $1) as events,
         (select count(*)::int from app_usage_bucket where subject_user_id = $1) as buckets`,
      [currentUserId],
    );
    assert(
      rejectedWrites.rows[0]?.events === 0 &&
        rejectedWrites.rows[0]?.buckets === 0,
      "rejected usage created an event or bucket",
    );
    const usageSubscriptionId = `sub_usage_${randomUUID().replaceAll("-", "")}`;
    cleanupSubscriptionIds.push(usageSubscriptionId);
    await database.query(
      `insert into app_subscription (id, plan, reference_id, status, period_end)
       values ($1, 'pro', $2, 'active', current_timestamp + interval '30 days')`,
      [usageSubscriptionId, currentUserId],
    );
    const concurrentReplayKey = `usage-replay-${randomUUID()}`;
    const concurrentReplay = await Promise.all(
      Array.from({ length: 10 }, () => consumeUsage(1000, concurrentReplayKey)),
    );
    const replayRecorded = concurrentReplay.filter(
      (entry) => entry.payload?.data?.status === "recorded",
    );
    const replayDuplicates = concurrentReplay.filter(
      (entry) => entry.payload?.data?.status === "duplicate",
    );
    assert(
      replayRecorded.length === 1 &&
        replayDuplicates.length === 9 &&
        concurrentReplay.every(
          (entry) =>
            entry.payload?.data?.eventId ===
            replayRecorded[0]?.payload?.data?.eventId,
        ),
      "concurrent idempotent replay created more than one event",
    );
    const initialKey = `usage-initial-${randomUUID()}`;
    const initialUsage = await consumeUsage(3000, initialKey, {
      userId: otherUserId,
    });
    const duplicateUsage = await consumeUsage(3000, initialKey);
    const conflictingUsage = await consumeUsage(1, initialKey);
    assert(
      initialUsage.payload?.data?.status === "recorded" &&
        initialUsage.payload?.data?.consumed === 4000 &&
        duplicateUsage.payload?.data?.status === "duplicate" &&
        duplicateUsage.payload?.data?.eventId ===
          initialUsage.payload?.data?.eventId &&
        conflictingUsage.response.status === 400,
      "usage idempotency lifecycle is incorrect",
    );
    const concurrentUsage = await Promise.all(
      Array.from({ length: 20 }, (_value, index) =>
        consumeUsage(1000, `usage-concurrent-${index}-${randomUUID()}`),
      ),
    );
    const recorded = concurrentUsage.filter(
      (entry) => entry.payload?.data?.status === "recorded",
    );
    const limited = concurrentUsage.filter(
      (entry) => entry.payload?.data?.status === "limit_exceeded",
    );
    assert(
      recorded.length === 6 && limited.length === 14,
      `concurrent usage expected 6 recorded and 14 limited, received ${recorded.length} and ${limited.length}`,
    );
    const usageEvidence = await database.query(
      `select
         (select count(*)::int from app_usage_event where subject_user_id = $1 and metric_key = 'product.actions.monthly') as events,
         (select coalesce(sum(amount), 0)::int from app_usage_event where subject_user_id = $1 and metric_key = 'product.actions.monthly') as event_total,
         (select consumed::int from app_usage_bucket where subject_user_id = $1 and metric_key = 'product.actions.monthly' and period_start = date_trunc('month', current_timestamp)) as bucket_total,
         (select count(*)::int from app_usage_event where subject_user_id = $2) as foreign_events`,
      [currentUserId, otherUserId],
    );
    assert(
      usageEvidence.rows[0]?.events === 8 &&
        usageEvidence.rows[0]?.event_total === 10000 &&
        usageEvidence.rows[0]?.bucket_total === 10000 &&
        usageEvidence.rows[0]?.foreign_events === 0,
      "usage ledger, bucket, quota, or session ownership evidence is incorrect",
    );
    const usageSnapshot = await request("/api/usage/me", {
      headers: { Cookie: cookie, Origin: origin },
    });
    const deniedUsageAdmin = await request(
      `/api/admin/usage/${encodeURIComponent(otherUserId)}`,
      { headers: { Cookie: cookie, Origin: origin } },
    );
    assert(
      usageSnapshot.response.status === 200 &&
        usageSnapshot.payload?.data?.meters?.some(
          (meter) =>
            meter.key === "product.actions.monthly" &&
            meter.consumed === 10000 &&
            meter.remaining === 0,
        ) &&
        deniedUsageAdmin.response.status === 403,
      "usage readback or ordinary-user Admin denial failed",
    );
    checks.push(
      "usage-auth-validation-free-denial-idempotency-concurrency-quota-isolation-readback",
    );
  }

  const supportTicket = await request("/api/support/tickets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      Origin: origin,
    },
    body: JSON.stringify({
      kind: "bug",
      subject: "Smoke support ticket",
      body: "A reproducible support lifecycle smoke report.",
    }),
  });
  assert(
    supportTicket.response.status === 201 &&
      supportTicket.payload?.data?.status === "open",
    "verified user could not create a support ticket",
  );
  const ticketId = supportTicket.payload.data.id;
  const ownTickets = await request("/api/support/tickets", {
    headers: { Cookie: cookie, Origin: origin },
  });
  assert(
    ownTickets.response.status === 200 &&
      ownTickets.payload?.data?.some((ticket) => ticket.id === ticketId),
    "user support inbox did not return the created ticket",
  );
  const customerReply = await request(
    `/api/support/tickets/${ticketId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        Origin: origin,
      },
      body: JSON.stringify({ body: "Customer adds a reproducible follow-up." }),
    },
  );
  assert(
    customerReply.response.status === 201 &&
      customerReply.payload?.data?.visibility === "public",
    "customer support reply was not recorded",
  );
  const adminTicketNotification = await database.query(
    "select count(*)::int as count from app_notification where recipient_user_id = $1 and category = 'support' and deep_link = '/admin'",
    [otherUserId],
  );
  assert(
    adminTicketNotification.rows[0]?.count === 2,
    "ticket creation and customer reply did not notify the platform admin",
  );
  const deniedAdmin = await request("/api/admin/support/tickets", {
    headers: { Cookie: cookie, Origin: origin },
  });
  assert(
    deniedAdmin.response.status === 403,
    "non-admin user could access the Admin support inbox",
  );
  const deniedUserMutation = await request("/api/auth/admin/ban-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      Origin: origin,
    },
    body: JSON.stringify({ userId: otherUserId, banReason: "denied smoke" }),
  });
  const deniedUserAudit = await database.query(
    "select count(*)::int as count from app_admin_audit_event where target_id = $1 and action = 'admin.user.banned'",
    [otherUserId],
  );
  assert(
    deniedUserMutation.response.status === 403 &&
      deniedUserAudit.rows[0]?.count === 0,
    "non-admin user mutation was accepted or produced false audit evidence",
  );
  const deniedAnnouncement = await request("/api/admin/announcements", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      Origin: origin,
    },
    body: JSON.stringify({
      title: "Denied announcement",
      body: "An ordinary user must not publish this announcement.",
    }),
  });
  assert(
    deniedAnnouncement.response.status === 403,
    "ordinary user could publish a platform announcement",
  );
  const anonymousOperationsHealth = await request("/api/admin/health");
  const deniedOperationsHealth = await request("/api/admin/health", {
    headers: { Cookie: cookie, Origin: origin },
  });
  const deniedImagesTest = cloudflareImagesSelected
    ? await request("/api/admin/images/test", {
        method: "POST",
        headers: { Cookie: cookie, Origin: origin },
      })
    : null;
  assert(
    anonymousOperationsHealth.response.status === 401 &&
      deniedOperationsHealth.response.status === 403,
    "operations health did not enforce platform Admin authority",
  );
  checks.push("support-intake-and-isolation");

  await database.query("update app_user set role = 'admin' where email = $1", [
    email,
  ]);
  if (cloudflareImagesSelected) {
    const imagesTest = await request("/api/admin/images/test", {
      method: "POST",
      headers: { Cookie: cookie, Origin: origin },
    });
    assert(
      deniedImagesTest?.response.status === 403 &&
        imagesTest.response.status === 200 &&
        imagesTest.response.headers.get("content-type")?.startsWith("image/webp") &&
        imagesTest.response.headers.get("x-starter-images-test") === "passed",
      "Cloudflare Images Admin authority or local transform round trip failed",
    );
    checks.push("cloudflare-images-admin-denial-local-png-webp-transform");
  }
  const announcementRecipients = await database.query(
    `select count(*)::int as count from app_user
     where email_verified = true and coalesce(banned, false) = false`,
  );
  const invalidAnnouncement = await request("/api/admin/announcements", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      Origin: origin,
    },
    body: JSON.stringify({
      title: "Invalid destination",
      body: "This announcement must reject an external deep link.",
      deepLink: "https://example.test/phishing",
    }),
  });
  const publishedAnnouncement = await request("/api/admin/announcements", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      Origin: origin,
    },
    body: JSON.stringify({
      title: "Starter maintenance notice",
      body: "The disposable environment will receive a verified maintenance update.",
      deepLink: "/app/notifications",
    }),
  });
  const announcementId = publishedAnnouncement.payload?.data?.id;
  const listedAnnouncements = await request("/api/admin/announcements", {
    headers: { Cookie: cookie, Origin: origin },
  });
  const announcementEvidence = await database.query(
    `select
      (select count(*)::int from app_notification where id like $1 || ':%' and category = 'announcement') as notifications,
      (select count(*)::int from app_admin_audit_event where target_id = $1 and action = 'announcement.published') as audits`,
    [announcementId],
  );
  assert(
    invalidAnnouncement.response.status === 400 &&
      publishedAnnouncement.response.status === 201 &&
      publishedAnnouncement.payload?.data?.recipientCount ===
        announcementRecipients.rows[0]?.count &&
      listedAnnouncements.response.status === 200 &&
      listedAnnouncements.payload?.data?.some(
        (announcement) => announcement.id === announcementId,
      ) &&
      announcementEvidence.rows[0]?.notifications ===
        announcementRecipients.rows[0]?.count &&
      announcementEvidence.rows[0]?.audits === 1,
    "platform announcement delivery, deep-link validation, history, or audit failed",
  );
  checks.push(
    "announcement-admin-only-same-origin-broadcast-history-audit",
  );
  if (onboardingSelected) {
    const adminOnboarding = await request("/api/admin/onboarding", {
      headers: { Cookie: cookie, Origin: origin },
    });
    assert(
      adminOnboarding.response.status === 200 &&
        adminOnboarding.payload?.data?.steps === 1 &&
        adminOnboarding.payload?.data?.completed >= 1,
      "platform Admin could not read onboarding aggregate evidence",
    );
    checks.push("product-onboarding-admin-aggregate");
  }
  if (outgoingWebhooksSelected) {
    const anonymousWebhooks = await request("/api/webhooks");
    assert(
      anonymousWebhooks.response.status === 401,
      "anonymous user could read outgoing webhook endpoints",
    );
    const createEndpoint = async (
      mode,
      eventTypes = ["starter.webhook.test"],
    ) => {
      const created = await request("/api/webhooks/endpoints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
          Origin: origin,
        },
        body: JSON.stringify({
          url: `http://127.0.0.1:${webhookPort}/receiver?mode=${mode}`,
          description: `${mode} receiver`,
          eventTypes,
        }),
      });
      assert(
        created.response.status === 201 &&
          created.payload?.data?.endpoint?.id &&
          created.payload?.data?.secret?.startsWith("whsec_"),
        `webhook endpoint creation failed for ${mode}: ${JSON.stringify(created.payload)}`,
      );
      return created.payload.data;
    };
    const sendTestWebhook = async () => {
      const sent = await request("/api/webhooks/test", {
        method: "POST",
        headers: { Cookie: cookie, Origin: origin },
      });
      assert(
        sent.response.status === 202 &&
          sent.payload?.data?.deliveryIds?.length === 1,
        "webhook test event was not queued",
      );
      return sent.payload.data.deliveryIds[0];
    };
    const archiveEndpoint = async (endpointId) => {
      const archived = await request(
        `/api/webhooks/endpoints/${encodeURIComponent(endpointId)}`,
        {
          method: "DELETE",
          headers: { Cookie: cookie, Origin: origin },
        },
      );
      assert(archived.response.status === 204, "webhook archive failed");
    };

    const successEndpoint = await createEndpoint(
      "success",
      apiPlatformSelected
        ? ["starter.webhook.test", "api.request.completed"]
        : ["starter.webhook.test"],
    );
    const listed = await request("/api/webhooks", {
      headers: { Cookie: cookie, Origin: origin },
    });
    assert(
      listed.response.status === 200 &&
        listed.payload?.data?.endpoints?.some(
          (entry) => entry.id === successEndpoint.endpoint.id,
        ) &&
        !JSON.stringify(listed.payload).includes(successEndpoint.secret),
      "webhook list leaked or omitted endpoint state",
    );
    if (apiPlatformSelected) {
      const createdPlatformKey = await request("/api/auth/api-key/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
          Origin: origin,
        },
        body: JSON.stringify({
          name: "API platform smoke key",
          expiresIn: 2_592_000,
        }),
      });
      const platformKeyId = createdPlatformKey.payload?.id;
      const platformKey = createdPlatformKey.payload?.key;
      await database.query(
        "update app_billing_plan_entitlement set limit_value = 2 where plan_id = 'pro' and feature_key = 'api.requests'",
      );
      const missingKey = await request("/api/v1/me", {
        headers: { "Idempotency-Key": `api-missing-${randomUUID()}` },
      });
      const missingIdempotency = await request("/api/v1/me", {
        headers: { Authorization: `Bearer ${platformKey}` },
      });
      const firstRequestId = `api-first-${randomUUID()}`;
      const firstApiRequest = await request(
        `/api/v1/me?userId=${encodeURIComponent(otherUserId)}`,
        {
          headers: {
            Authorization: `Bearer ${platformKey}`,
            "Idempotency-Key": firstRequestId,
          },
        },
      );
      const replayedApiRequest = await request("/api/v1/me", {
        headers: {
          Authorization: `Bearer ${platformKey}`,
          "Idempotency-Key": firstRequestId,
        },
      });
      const secondRequestId = `api-second-${randomUUID()}`;
      const secondApiRequest = await request("/api/v1/me", {
        headers: {
          "x-api-key": platformKey,
          "Idempotency-Key": secondRequestId,
        },
      });
      const limitedApiRequest = await request("/api/v1/me", {
        headers: {
          Authorization: `Bearer ${platformKey}`,
          "Idempotency-Key": `api-limited-${randomUUID()}`,
        },
      });
      const apiEvidence = await database.query(
        `select
          (select count(*)::int from app_usage_event where subject_user_id = $1 and metric_key = 'api.requests') as events,
          (select consumed::int from app_usage_bucket where subject_user_id = $1 and metric_key = 'api.requests' and period_start = date_trunc('month', current_timestamp)) as consumed,
          (select count(*)::int from app_webhook_event where owner_user_id = $1 and event_type = 'api.request.completed') as webhook_events`,
        [currentUserId],
      );
      const apiDeliveries = await database.query(
        `select d.id
         from app_webhook_delivery d
         join app_webhook_event e on e.id = d.event_id
         where e.owner_user_id = $1 and e.event_type = 'api.request.completed'
         order by d.created_at`,
        [currentUserId],
      );
      for (const delivery of apiDeliveries.rows)
        await waitForWebhookDelivery(delivery.id, "succeeded", 1);
      const revokedPlatformKey = await request("/api/auth/api-key/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
          Origin: origin,
        },
        body: JSON.stringify({ keyId: platformKeyId }),
      });
      const revokedApiRequest = await request("/api/v1/me", {
        headers: {
          Authorization: `Bearer ${platformKey}`,
          "Idempotency-Key": `api-revoked-${randomUUID()}`,
        },
      });
      assert(
        createdPlatformKey.response.status === 200 &&
          platformKeyId &&
          platformKey?.startsWith("app_") &&
          missingKey.response.status === 401 &&
          missingIdempotency.response.status === 400 &&
          firstApiRequest.response.status === 200 &&
          firstApiRequest.payload?.data?.user?.id === currentUserId &&
          firstApiRequest.payload?.data?.user?.id !== otherUserId &&
          firstApiRequest.payload?.data?.usage?.status === "recorded" &&
          replayedApiRequest.response.status === 200 &&
          replayedApiRequest.payload?.data?.usage?.status === "duplicate" &&
          secondApiRequest.response.status === 200 &&
          secondApiRequest.payload?.data?.usage?.consumed === 2 &&
          limitedApiRequest.response.status === 429 &&
          apiEvidence.rows[0]?.events === 2 &&
          apiEvidence.rows[0]?.consumed === 2 &&
          apiEvidence.rows[0]?.webhook_events === 2 &&
          apiDeliveries.rows.length === 2 &&
          revokedPlatformKey.response.status === 200 &&
          revokedApiRequest.response.status === 401,
        "API platform authentication, isolation, idempotency, quota, event, or revoke boundary failed",
      );
      checks.push(
        "api-platform-key-scope-owner-isolation-idempotent-quota-signed-event-revoke",
      );
    }
    const successDeliveryId = await sendTestWebhook();
    await waitForWebhookDelivery(successDeliveryId, "succeeded", 1);
    const successRequest = webhookRequests.find(
      (entry) => entry.deliveryId === successDeliveryId,
    );
    const timestamp = String(successRequest?.headers["webhook-timestamp"] || "");
    const expectedSignature = createHmac("sha256", successEndpoint.secret)
      .update(`${successDeliveryId}.${timestamp}.${successRequest?.body || ""}`)
      .digest("base64url");
    assert(
      successRequest?.headers["webhook-signature"] ===
        `v1,${expectedSignature}` &&
        JSON.parse(successRequest.body).type === "starter.webhook.test",
      "webhook HMAC signature or envelope is invalid",
    );
    const rotated = await request(
      `/api/webhooks/endpoints/${encodeURIComponent(successEndpoint.endpoint.id)}/rotate`,
      {
        method: "POST",
        headers: { Cookie: cookie, Origin: origin },
      },
    );
    assert(
      rotated.response.status === 200 &&
        rotated.payload?.data?.secret !== successEndpoint.secret &&
        rotated.payload?.data?.secretVersion === 2,
      "webhook secret rotation did not invalidate the old version",
    );
    await archiveEndpoint(successEndpoint.endpoint.id);

    const retryEndpoint = await createEndpoint("retry");
    const retryDeliveryId = await sendTestWebhook();
    const retried = await waitForWebhookDelivery(
      retryDeliveryId,
      "succeeded",
      2,
    );
    assert(
      retried.response_status === 200 &&
        webhookRequests.filter(
          (entry) => entry.deliveryId === retryDeliveryId,
        ).length === 2,
      "webhook non-2xx response did not retry exactly once before success",
    );
    await archiveEndpoint(retryEndpoint.endpoint.id);

    const failingEndpoint = await createEndpoint("fail");
    const failingDeliveryId = await sendTestWebhook();
    const failed = await waitForWebhookDelivery(
      failingDeliveryId,
      "failed",
      5,
    );
    assert(
      failed.response_status === 503 &&
        webhookRequests.filter(
          (entry) => entry.deliveryId === failingDeliveryId,
        ).length === 5,
      "webhook terminal retry boundary or response evidence is incorrect",
    );
    const adminEvidence = await request("/api/admin/webhooks", {
      headers: { Cookie: cookie, Origin: origin },
    });
    assert(
      adminEvidence.response.status === 200 &&
        adminEvidence.payload?.data?.some(
          (entry) => entry.id === failingDeliveryId,
        ),
      "platform Admin could not read webhook delivery evidence",
    );
    await archiveEndpoint(failingEndpoint.endpoint.id);
    checks.push(
      "outgoing-webhooks-session-one-time-secret-hmac-queue-retry-terminal-admin",
    );
  }
  const operationsHealth = await request("/api/admin/health", {
    headers: { Cookie: cookie, Origin: origin },
  });
  const healthComponents = new Map(
    (operationsHealth.payload?.data?.components || []).map((component) => [
      component.id,
      component,
    ]),
  );
  const databaseHealth = healthComponents.get("database");
  const emailHealth = healthComponents.get("email");
  const googleHealth = healthComponents.get("google");
  const stripeHealth = healthComponents.get("stripe");
  const queueHealth = healthComponents.get("outgoing-webhooks");
  const turnstileHealth = healthComponents.get("turnstile");
  const workersAiHealth = healthComponents.get("workers-ai");
  const searchHealth = healthComponents.get("product-search");
  const expoPushHealth = healthComponents.get("expo-push");
  const twilioSmsHealth = healthComponents.get("twilio-sms");
  const cloudflareImagesHealth = healthComponents.get("cloudflare-images");
  const cloudflareStreamHealth = healthComponents.get("cloudflare-stream");
  assert(
    operationsHealth.response.status === 200 &&
      operationsHealth.payload?.data?.service === "starter" &&
      databaseHealth?.status === "ok" &&
      typeof databaseHealth?.details?.latencyMs === "number" &&
      emailHealth?.details?.provider === "cfsend" &&
      emailHealth?.details?.configured === true &&
      emailHealth?.details?.sent24h >= 1 &&
      googleHealth?.details?.configured === true,
    "operations health omitted active database, CFsend, or Google evidence",
  );
  assert(
    cloudflareStreamSelected
      ? cloudflareStreamHealth?.status === "ok" && cloudflareStreamHealth?.details?.selected === true && cloudflareStreamHealth?.details?.configured === true && cloudflareStreamHealth?.details?.ledgerReady === true
      : cloudflareStreamHealth?.status === "not-selected" && cloudflareStreamHealth?.details?.selected === false,
    "operations health returned incorrect Cloudflare Stream readiness evidence",
  );
  assert(
    cloudflareImagesSelected
      ? cloudflareImagesHealth?.status === "ok" &&
          cloudflareImagesHealth?.details?.selected === true &&
          cloudflareImagesHealth?.details?.configured === true &&
          cloudflareImagesHealth?.details?.bindingReady === true
      : cloudflareImagesHealth?.status === "not-selected" &&
          cloudflareImagesHealth?.details?.selected === false,
    "operations health returned incorrect Cloudflare Images readiness evidence",
  );
  assert(
    twilioSmsSelected
      ? twilioSmsHealth?.status === "ok" &&
          twilioSmsHealth?.details?.selected === true &&
          twilioSmsHealth?.details?.configured === true &&
          twilioSmsHealth?.details?.ledgerReady === true &&
          twilioSmsHealth?.details?.accepted24h >= 1
      : twilioSmsHealth?.status === "not-selected" &&
          twilioSmsHealth?.details?.selected === false,
    "operations health returned incorrect Twilio SMS readiness evidence",
  );
  assert(
    expoPushSelected
      ? expoPushHealth?.status === "ok" &&
          expoPushHealth?.details?.selected === true &&
          expoPushHealth?.details?.configured === true &&
          expoPushHealth?.details?.registryReady === true
      : expoPushHealth?.status === "not-selected" &&
          expoPushHealth?.details?.selected === false,
    "operations health returned incorrect Expo Push readiness evidence",
  );
  assert(
    vectorizeSelected
      ? searchHealth?.details?.provider === "vectorize" &&
          searchHealth?.details?.configured === true &&
          searchHealth?.details?.bindingReady === true
      : searchProvider === "postgresql"
        ? searchHealth?.status === "ok" &&
            searchHealth?.details?.provider === "postgresql"
      : searchHealth?.status === "not-selected" &&
          searchHealth?.details?.selected === false,
    "operations health returned incorrect search Provider or Vectorize Binding evidence",
  );
  assert(
    workersAiSelected
      ? workersAiHealth?.details?.selected === true &&
          workersAiHealth?.details?.configured === true &&
          workersAiHealth?.details?.bindingReady === true
      : workersAiHealth?.status === "not-selected" &&
          workersAiHealth?.details?.selected === false,
    "operations health returned incorrect Workers AI selection or Binding evidence",
  );
  assert(
    turnstileSelected
      ? turnstileHealth?.status === "ok" &&
          turnstileHealth?.details?.selected === true &&
          turnstileHealth?.details?.configured === true
      : turnstileHealth?.status === "not-selected" &&
          turnstileHealth?.details?.selected === false,
    "operations health returned incorrect Turnstile selection or configuration evidence",
  );
  assert(
    stripeSelected
      ? stripeHealth?.details?.selected === true &&
          stripeHealth?.details?.configured === true &&
          stripeHealth?.details?.ledgerReady === true &&
          stripeHealth?.details?.events24h >= 1
      : stripeHealth?.status === "not-selected" &&
          stripeHealth?.details?.selected === false,
    "operations health misreported optional Stripe readiness",
  );
  assert(
    outgoingWebhooksSelected
      ? queueHealth?.details?.selected === true &&
          queueHealth?.details?.queueBound === true &&
          queueHealth?.details?.ledgerReady === true &&
          queueHealth?.details?.succeeded24h >= 2 &&
          queueHealth?.details?.failed24h >= 1
      : queueHealth?.status === "not-selected" &&
          queueHealth?.details?.selected === false,
    "operations health misreported optional Queue delivery evidence",
  );
  checks.push(
    "operations-health-admin-database-email-google-optional-provider-evidence",
  );
  if (entitlementsSelected) {
    const adminAccess = await request(
      `/api/admin/entitlements/${encodeURIComponent(otherUserId)}`,
      { headers: { Cookie: cookie, Origin: origin } },
    );
    assert(
      adminAccess.response.status === 200 &&
        adminAccess.payload?.data?.plan?.id === "free",
      "platform Admin could not read user entitlements",
    );
    checks.push("entitlements-platform-admin-readback");
  }
  if (usageSelected) {
    const adminUsage = await request(
      `/api/admin/usage/${encodeURIComponent(otherUserId)}`,
      { headers: { Cookie: cookie, Origin: origin } },
    );
    const deniedAdminMutation = await request(
      `/api/admin/usage/${encodeURIComponent(otherUserId)}`,
      {
        method: "POST",
        headers: { Cookie: cookie, Origin: origin },
      },
    );
    assert(
      adminUsage.response.status === 200 &&
        adminUsage.payload?.data?.plan?.id === "free" &&
        deniedAdminMutation.response.status === 404,
      "platform Admin usage readback or read-only boundary failed",
    );
    checks.push("usage-platform-admin-read-only");
  }
  const nonAdminAssigneeId = randomUUID();
  const nonAdminAssigneeEmail = `smoke-assignee+${randomUUID()}@example.test`;
  await database.query(
    "insert into app_user (id, name, email, email_verified, role, banned) values ($1, 'Non-admin Assignee', $2, true, 'user', false)",
    [nonAdminAssigneeId, nonAdminAssigneeEmail],
  );
  cleanupEmails.push(nonAdminAssigneeEmail);
  const adminRequest = (pathname, body, requestCookie = cookie) =>
    request(pathname, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: requestCookie,
        Origin: origin,
      },
      body: JSON.stringify(body || {}),
    });
  const searchedUsers = await request(
    `/api/auth/admin/list-users?searchField=email&searchOperator=contains&searchValue=${encodeURIComponent(nonAdminAssigneeEmail)}&limit=20`,
    { headers: { Cookie: cookie, Origin: origin } },
  );
  const promotedUser = await adminRequest("/api/auth/admin/set-role", {
    userId: nonAdminAssigneeId,
    role: "admin",
  });
  const restoredUserRole = await adminRequest("/api/auth/admin/set-role", {
    userId: nonAdminAssigneeId,
    role: "user",
  });
  const bannedUser = await adminRequest("/api/auth/admin/ban-user", {
    userId: nonAdminAssigneeId,
    banReason: "Admin smoke policy test",
    banExpiresIn: 3600,
  });
  const bannedState = await database.query(
    "select role, banned, ban_reason from app_user where id = $1",
    [nonAdminAssigneeId],
  );
  const unbannedUser = await adminRequest("/api/auth/admin/unban-user", {
    userId: nonAdminAssigneeId,
  });
  assert(
    searchedUsers.response.status === 200 &&
      searchedUsers.payload?.users?.length === 1 &&
      promotedUser.response.status === 200 &&
      restoredUserRole.response.status === 200 &&
      bannedUser.response.status === 200 &&
      bannedState.rows[0]?.role === "user" &&
      bannedState.rows[0]?.banned === true &&
      bannedState.rows[0]?.ban_reason === "Admin smoke policy test" &&
      unbannedUser.response.status === 200,
    "Better Auth Admin search, role, ban, or unban lifecycle failed",
  );
  const firstImpersonation = await adminRequest(
    "/api/auth/admin/impersonate-user",
    { userId: nonAdminAssigneeId },
  );
  const firstImpersonationCookie = responseCookieHeader(
    firstImpersonation.response,
  );
  const impersonatedSession = await request("/api/session", {
    headers: { Cookie: firstImpersonationCookie, Origin: origin },
  });
  const stoppedImpersonation = await adminRequest(
    "/api/auth/admin/stop-impersonating",
    {},
    firstImpersonationCookie,
  );
  const restoredAdminCookie = responseCookieHeader(
    stoppedImpersonation.response,
  );
  const restoredAdminSession = await request("/api/session", {
    headers: { Cookie: restoredAdminCookie, Origin: origin },
  });
  assert(
    firstImpersonation.response.status === 200 &&
      impersonatedSession.response.status === 200 &&
      impersonatedSession.payload?.data?.user?.id === nonAdminAssigneeId &&
      stoppedImpersonation.response.status === 200 &&
      restoredAdminSession.response.status === 200 &&
      restoredAdminSession.payload?.data?.user?.id === currentUserId,
    "Better Auth Admin impersonation or return-to-admin lifecycle failed",
  );
  const secondImpersonation = await adminRequest(
    "/api/auth/admin/impersonate-user",
    { userId: nonAdminAssigneeId },
  );
  const secondImpersonationCookie = responseCookieHeader(
    secondImpersonation.response,
  );
  const listedSessions = await adminRequest(
    "/api/auth/admin/list-user-sessions",
    { userId: nonAdminAssigneeId },
  );
  const revokedSessions = await adminRequest(
    "/api/auth/admin/revoke-user-sessions",
    { userId: nonAdminAssigneeId },
  );
  const revokedImpersonation = await request("/api/session", {
    headers: { Cookie: secondImpersonationCookie, Origin: origin },
  });
  const userAdminAudit = await database.query(
    `select action, count(*)::int as count
     from app_admin_audit_event
     where target_id = $1 and action like 'admin.%'
     group by action`,
    [nonAdminAssigneeId],
  );
  const userAdminAuditCounts = new Map(
    userAdminAudit.rows.map((row) => [row.action, row.count]),
  );
  const securityNotifications = await database.query(
    `select title, count(*)::int as count
     from app_notification
     where recipient_user_id = $1 and category = 'security'
     group by title`,
    [nonAdminAssigneeId],
  );
  const securityNotificationCounts = new Map(
    securityNotifications.rows.map((row) => [row.title, row.count]),
  );
  assert(
    secondImpersonation.response.status === 200 &&
      listedSessions.response.status === 200 &&
      listedSessions.payload?.sessions?.length >= 1 &&
      revokedSessions.response.status === 200 &&
      revokedImpersonation.response.status === 401 &&
      userAdminAuditCounts.get("admin.user.role_set") === 2 &&
      userAdminAuditCounts.get("admin.user.banned") === 1 &&
      userAdminAuditCounts.get("admin.user.unbanned") === 1 &&
      userAdminAuditCounts.get("admin.user.impersonated") === 2 &&
      userAdminAuditCounts.get("admin.impersonation.stopped") === 1 &&
      userAdminAuditCounts.get("admin.user.sessions_revoked") === 1 &&
      securityNotificationCounts.get("Account role changed") === 2 &&
      securityNotificationCounts.get("Account access suspended") === 1 &&
      securityNotificationCounts.get("Account access restored") === 1 &&
      securityNotificationCounts.get("Support access started") === 2 &&
      securityNotificationCounts.get("Sessions revoked") === 1,
    "Better Auth Admin sessions, impersonation, audit, or security notifications failed",
  );
  checks.push(
    "better-auth-admin-user-search-role-ban-session-revoke-impersonation-audit-security-notifications",
  );
  const adminTickets = await request("/api/admin/support/tickets", {
    headers: { Cookie: cookie, Origin: origin },
  });
  assert(
    adminTickets.response.status === 200 &&
      adminTickets.payload?.data?.some((ticket) => ticket.id === ticketId),
    "platform admin could not read the support inbox",
  );
  const betterAuthUsers = await request("/api/auth/admin/list-users?limit=20", {
    headers: { Cookie: cookie, Origin: origin },
  });
  assert(
    betterAuthUsers.response.status === 200 &&
      betterAuthUsers.payload?.users?.some((user) => user.email === email),
    "Better Auth Admin user list is unavailable",
  );
  const invalidAssignee = await request(
    `/api/admin/support/tickets/${ticketId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        Origin: origin,
      },
      body: JSON.stringify({
        status: "in_progress",
        priority: "high",
        assignedToUserId: nonAdminAssigneeId,
      }),
    },
  );
  assert(
    invalidAssignee.response.status === 400 &&
      invalidAssignee.payload?.error?.code === "INVALID_ASSIGNEE",
    "support assignment accepted a non-admin user",
  );
  const assignedTicket = await request(
    `/api/admin/support/tickets/${ticketId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        Origin: origin,
      },
      body: JSON.stringify({
        status: "in_progress",
        priority: "high",
        assignedToUserId: otherUserId,
      }),
    },
  );
  assert(
    assignedTicket.response.status === 200 &&
      assignedTicket.payload?.data?.assigned_to_user_id === otherUserId,
    "Admin could not assign the support ticket to a platform admin",
  );
  const internalNote = await request(
    `/api/admin/support/tickets/${ticketId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        Origin: origin,
      },
      body: JSON.stringify({
        body: "Internal triage evidence.",
        visibility: "internal",
      }),
    },
  );
  const publicReply = await request(
    `/api/admin/support/tickets/${ticketId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        Origin: origin,
      },
      body: JSON.stringify({
        body: "Public resolution guidance.",
        visibility: "public",
      }),
    },
  );
  assert(
    internalNote.response.status === 201 && publicReply.response.status === 201,
    "Admin support thread messages failed",
  );
  const adminThread = await request(`/api/admin/support/tickets/${ticketId}`, {
    headers: { Cookie: cookie, Origin: origin },
  });
  assert(
    adminThread.response.status === 200 &&
      adminThread.payload?.data?.messages?.some(
        (message) => message.visibility === "internal",
      ),
    "Admin thread did not expose its internal note",
  );
  const customerThread = await request(`/api/support/tickets/${ticketId}`, {
    headers: { Cookie: cookie, Origin: origin },
  });
  assert(
    customerThread.response.status === 200 &&
      customerThread.payload?.data?.messages?.some(
        (message) => message.body === "Public resolution guidance.",
      ) &&
      !customerThread.payload?.data?.messages?.some(
        (message) => message.visibility === "internal",
      ),
    "Customer thread visibility leaked an internal note or hid a public reply",
  );
  const overview = await request("/api/admin/overview", {
    headers: { Cookie: cookie, Origin: origin },
  });
  const auditFeed = await request("/api/admin/audit", {
    headers: { Cookie: cookie, Origin: origin },
  });
  assert(
    overview.response.status === 200 &&
      overview.payload?.data?.database === "ok" &&
      auditFeed.response.status === 200,
    "Admin overview or audit reader is unavailable",
  );
  const resolvedTicket = await request(
    `/api/admin/support/tickets/${ticketId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        Origin: origin,
      },
      body: JSON.stringify({
        status: "resolved",
        priority: "high",
        assignedToUserId: otherUserId,
      }),
    },
  );
  assert(
    resolvedTicket.response.status === 200 &&
      resolvedTicket.payload?.data?.status === "resolved",
    `Admin could not resolve the support ticket (${resolvedTicket.response.status}: ${JSON.stringify(resolvedTicket.payload)})`,
  );
  const audit = await database.query(
    "select count(*)::int as count from app_admin_audit_event where target_id = $1 and action in ('support.ticket.updated', 'support.note.created', 'support.reply.created')",
    [ticketId],
  );
  assert(
    audit.rows[0]?.count === 4,
    "support Admin mutations did not write complete audit evidence",
  );
  const filteredAudit = await request(
    `/api/admin/audit?targetType=support_ticket&search=${encodeURIComponent(ticketId)}&limit=2`,
    { headers: { Cookie: cookie, Origin: origin } },
  );
  const filteredEvents = filteredAudit.payload?.data?.events || [];
  const filteredCursor = filteredAudit.payload?.data?.nextCursor;
  const olderAudit = await request(
    `/api/admin/audit?targetType=support_ticket&search=${encodeURIComponent(ticketId)}&limit=2&cursor=${encodeURIComponent(filteredCursor || "")}`,
    { headers: { Cookie: cookie, Origin: origin } },
  );
  const olderEvents = olderAudit.payload?.data?.events || [];
  const invalidAuditCursor = await request(
    "/api/admin/audit?cursor=not-a-valid-cursor",
    { headers: { Cookie: cookie, Origin: origin } },
  );
  assert(
    filteredAudit.response.status === 200 &&
      filteredEvents.length === 2 &&
      Boolean(filteredCursor) &&
      filteredEvents.every(
        (event) =>
          event.target_type === "support_ticket" && event.target_id === ticketId,
      ) &&
      olderAudit.response.status === 200 &&
      olderEvents.length >= 1 &&
      olderEvents.every(
        (event) =>
          event.target_type === "support_ticket" && event.target_id === ticketId,
      ) &&
      !olderEvents.some((event) =>
        filteredEvents.some((firstPage) => firstPage.id === event.id),
      ) &&
      invalidAuditCursor.response.status === 400,
    "Admin audit filtering or stable cursor pagination failed",
  );
  checks.push(
    "better-auth-admin-support-thread-assignment-visibility-notifications-audit-filter-pagination-overview",
  );

  if (twoFactorSelected) {
    const twoFactorIp = `203.0.113.${Math.floor(Math.random() * 254) + 1}`;
    const enrollment = await request("/api/auth/two-factor/enable", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        Origin: origin,
      },
      body: JSON.stringify({ password, method: "totp" }),
    });
    const totpUri = enrollment.payload?.totpURI || "";
    const backupCodes = enrollment.payload?.backupCodes || [];
    const pendingState = await database.query(
      `select u.two_factor_enabled, t.verified
       from app_user u
       left join app_two_factor t on t.user_id = u.id
       where u.email = $1`,
      [email],
    );
    const rejectedEnrollmentCode = await request(
      "/api/auth/two-factor/verify-totp",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
          Origin: origin,
        },
        body: JSON.stringify({ code: "000000", trustDevice: false }),
      },
    );
    const verifiedEnrollment = await request(
      "/api/auth/two-factor/verify-totp",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
          Origin: origin,
        },
        body: JSON.stringify({
          code: totpFromUri(totpUri),
          trustDevice: false,
        }),
      },
    );
    const enabledState = await database.query(
      `select u.two_factor_enabled, t.verified
       from app_user u
       join app_two_factor t on t.user_id = u.id
       where u.email = $1`,
      [email],
    );
    const managementCookie =
      responseCookieHeader(verifiedEnrollment.response) || cookie;
    assert(
      enrollment.response.status === 200 &&
        enrollment.payload?.method === "totp" &&
        totpUri.startsWith("otpauth://") &&
        backupCodes.length === 10 &&
        pendingState.rows[0]?.two_factor_enabled === false &&
        pendingState.rows[0]?.verified === false &&
        rejectedEnrollmentCode.response.status >= 400 &&
        verifiedEnrollment.response.status === 200 &&
        enabledState.rows[0]?.two_factor_enabled === true &&
        enabledState.rows[0]?.verified === true,
      "TOTP enrollment did not require valid verification before activation",
    );

    const challengedLogin = await request("/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": twoFactorIp,
        Origin: origin,
      },
      body: JSON.stringify({ email, password, callbackURL: "/app" }),
    });
    const challengeCookie = responseCookieHeader(challengedLogin.response);
    const pendingChallengeSession = await request("/api/session", {
      headers: { Cookie: challengeCookie, Origin: origin },
    });
    const verifiedChallenge = await request(
      "/api/auth/two-factor/verify-totp",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: challengeCookie,
          Origin: origin,
        },
        body: JSON.stringify({
          code: totpFromUri(totpUri),
          trustDevice: false,
        }),
      },
    );
    const verifiedChallengeCookie = responseCookieHeader(
      verifiedChallenge.response,
    );
    const challengedSession = await request("/api/session", {
      headers: { Cookie: verifiedChallengeCookie, Origin: origin },
    });
    assert(
      challengedLogin.response.status === 200 &&
        challengedLogin.payload?.twoFactorRedirect === true &&
        Boolean(challengeCookie) &&
        pendingChallengeSession.response.status === 401 &&
        verifiedChallenge.response.status === 200 &&
        verifiedChallengeCookie.includes("session") &&
        challengedSession.response.status === 200,
      "Password sign-in did not enforce the TOTP challenge boundary",
    );
    await request("/api/auth/sign-out", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: verifiedChallengeCookie,
        Origin: origin,
      },
      body: "{}",
    });

    const backupLogin = await request("/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": twoFactorIp,
        Origin: origin,
      },
      body: JSON.stringify({ email, password, callbackURL: "/app" }),
    });
    const backupChallengeCookie = responseCookieHeader(backupLogin.response);
    const verifiedBackupCode = await request(
      "/api/auth/two-factor/verify-backup-code",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: backupChallengeCookie,
          Origin: origin,
        },
        body: JSON.stringify({
          code: backupCodes[0],
          trustDevice: false,
        }),
      },
    );
    const backupSessionCookie = responseCookieHeader(
      verifiedBackupCode.response,
    );
    await request("/api/auth/sign-out", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: backupSessionCookie,
        Origin: origin,
      },
      body: "{}",
    });
    const replayLogin = await request("/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": twoFactorIp,
        Origin: origin,
      },
      body: JSON.stringify({ email, password, callbackURL: "/app" }),
    });
    const replayChallengeCookie = responseCookieHeader(replayLogin.response);
    const replayedBackupCode = await request(
      "/api/auth/two-factor/verify-backup-code",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: replayChallengeCookie,
          Origin: origin,
        },
        body: JSON.stringify({
          code: backupCodes[0],
          trustDevice: false,
        }),
      },
    );
    assert(
      backupLogin.payload?.twoFactorRedirect === true &&
        verifiedBackupCode.response.status === 200 &&
        backupSessionCookie.includes("session") &&
        replayLogin.payload?.twoFactorRedirect === true &&
        replayedBackupCode.response.status >= 400,
      "Backup-code recovery was not successful and single-use",
    );

    const rotatedCodes = await request(
      "/api/auth/two-factor/generate-backup-codes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: managementCookie,
          Origin: origin,
        },
        body: JSON.stringify({ password }),
      },
    );
    const disabled = await request("/api/auth/two-factor/disable", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: managementCookie,
        Origin: origin,
      },
      body: JSON.stringify({ password }),
    });
    const disabledState = await database.query(
      `select two_factor_enabled,
        (select count(*)::int from app_two_factor where user_id = app_user.id) as factor_count
       from app_user where email = $1`,
      [email],
    );
    const twoFactorEvidence = await database.query(
      `select
        (select count(*)::int from app_admin_audit_event where target_id = app_user.id and action like 'security.two_factor.%') as audits,
        (select count(*)::int from app_notification where recipient_user_id = app_user.id and category = 'security' and title in ('Two-factor setup started', 'Recovery codes replaced', 'Two-factor authentication disabled')) as notifications
       from app_user where email = $1`,
      [email],
    );
    const postDisableLogin = await request("/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": `192.0.2.${Math.floor(Math.random() * 254) + 1}`,
        Origin: origin,
      },
      body: JSON.stringify({ email, password, callbackURL: "/app" }),
    });
    browserCookie = responseCookieHeader(postDisableLogin.response);
    assert(
      rotatedCodes.response.status === 200 &&
        rotatedCodes.payload?.backupCodes?.length === 10 &&
        disabled.response.status === 200 &&
        disabledState.rows[0]?.two_factor_enabled === false &&
        disabledState.rows[0]?.factor_count === 0 &&
        twoFactorEvidence.rows[0]?.audits === 3 &&
        twoFactorEvidence.rows[0]?.notifications === 3 &&
        postDisableLogin.response.status === 200 &&
        browserCookie.includes("session"),
      "Two-factor recovery rotation, disablement, audit, or notifications failed",
    );
    checks.push(
      "two-factor-pending-enrollment-totp-challenge-backup-single-use-rotation-disable-audit-notifications",
    );
  }

  if (browserAcceptanceEnabled) {
    const browserNotificationId = randomUUID();
    cleanupNotificationIds.push(browserNotificationId);
    await database.query(
      `insert into app_notification (id, recipient_user_id, category, title, body, deep_link)
       values ($1, $2, 'system', 'Browser acceptance notice', 'This disposable notice verifies the real notification bell state.', '/app/notifications')`,
      [browserNotificationId, currentUserId],
    );
    const { runBrowserAcceptance, authenticatedRoutes } = await import(
      "./browser-acceptance.mjs"
    );
    await runBrowserAcceptance({
      mode: "authenticated",
      baseUrl: origin,
      cookieHeader: browserCookie,
      routes: [
        ...authenticatedRoutes,
        ...(organizationsSelected
          ? [{ surface: "organizations", route: "/app/team", status: 200 }]
          : []),
        ...(stripeSelected
          ? [{ surface: "billing", route: "/app/billing", status: 200 }]
          : []),
        ...(twoFactorSelected
          ? [
              {
                surface: "two-factor-settings",
                route: "/app/security/two-factor",
                status: 200,
              },
              {
                surface: "two-factor-challenge",
                route: "/two-factor",
                status: 200,
              },
            ]
          : []),
        ...(apiPlatformSelected
          ? [
              {
                surface: "developer",
                route: "/app/developer",
                status: 200,
              },
            ]
          : []),
      ],
    });
    checks.push(
      "browser-product-shell-account-notifications-settings-support-admin-docs-dp",
    );
  }

  const resetRequest = await request("/api/auth/request-password-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ email, redirectTo: `${origin}/login` }),
  });
  assert(resetRequest.response.status === 200, "password reset request failed");
  let resetUrl = "";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const resetOutbox = await database.query(
      "select action_url from app_auth_email_outbox where recipient = $1 and kind = 'password-reset' order by created_at desc limit 1",
      [email],
    );
    resetUrl = resetOutbox.rows[0]?.action_url || "";
    if (resetUrl) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const resetCallback = await fetch(resetUrl, {
    redirect: "manual",
    headers: { Origin: origin },
  });
  const resetLocation = resetCallback.headers.get("location") || "";
  const resetToken = resetLocation
    ? new URL(resetLocation, origin).searchParams.get("token")
    : null;
  assert(resetToken, "password reset email did not contain a token");
  checks.push("password-reset-request");

  const replacementPassword = `Reset-${randomUUID()}-A1!`;
  const reset = await request("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({
      newPassword: replacementPassword,
      token: resetToken,
    }),
  });
  assert(
    reset.response.status === 200,
    "password reset token was not accepted",
  );
  checks.push("password-reset-token");

  const revoked = await request("/api/session", {
    headers: { Cookie: cookie, Origin: origin },
  });
  assert(
    revoked.response.status === 401,
    "password reset did not revoke the prior session",
  );
  checks.push("reset-session-revocation");

  const replacementLogin = await request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({
      email,
      password: replacementPassword,
      callbackURL: "/app",
    }),
  });
  assert(
    replacementLogin.response.status === 200,
    "replacement password sign-in failed",
  );
  const replacementCookies =
    typeof replacementLogin.response.headers.getSetCookie === "function"
      ? replacementLogin.response.headers.getSetCookie()
      : [replacementLogin.response.headers.get("set-cookie")].filter(Boolean);
  const replacementCookie = replacementCookies
    .map((value) => value.split(";", 1)[0])
    .join("; ");
  checks.push("replacement-password-sign-in");

  const signOut = await request("/api/auth/sign-out", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: replacementCookie,
      Origin: origin,
    },
    body: "{}",
  });
  assert(signOut.response.status === 200, "sign-out failed");
  const signedOut = await request("/api/session", {
    headers: { Cookie: replacementCookie, Origin: origin },
  });
  assert(
    signedOut.response.status === 401,
    "signed-out session remained valid",
  );
  checks.push("sign-out");

  const outbox = await database.query(
    "select count(*)::int as count from app_auth_email_outbox where recipient = $1",
    [email],
  );
  assert(
    outbox.rows[0]?.count >= 2 && mailRequests.length >= 2,
    "auth emails were not sent through the CFsend contract double",
  );
  assert(
    mailRequests.every(
      (entry) =>
        entry.headers["idempotency-key"]?.startsWith("auth-") &&
        entry.body.html &&
        entry.body.text,
    ),
    "CFsend requests are missing stable idempotency or multipart content",
  );
  checks.push("cfsend-delivery");

  console.log(
    JSON.stringify(
      {
        ok: true,
        runtime: "workerd",
        database: scratchDatabase
          ? "temporary-isolated-database"
          : "explicit-test-database",
        checks,
      },
      null,
      2,
    ),
  );
} catch (error) {
  await new Promise((resolve) => setTimeout(resolve, 250));
  console.error(
    JSON.stringify(
      {
        event: "auth_smoke_failed",
        message: error instanceof Error ? error.message : String(error),
        workerdLogs: logs.slice(-4000),
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  if (database._connected) {
    if (!scratchDatabase) {
      if (cleanupSubscriptionIds.length)
        await database
          .query("delete from app_subscription where id = any($1::text[])", [
            cleanupSubscriptionIds,
          ])
          .catch(() => undefined);
      await database
        .query(
          "delete from app_admin_audit_event where target_type = 'support_ticket' and target_id in (select id from app_support_ticket where contact_email = $1)",
          [email],
        )
        .catch(() => undefined);
      await database
        .query("delete from app_support_ticket where contact_email = $1", [
          email,
        ])
        .catch(() => undefined);
      await database
        .query("delete from app_notification where id = any($1::text[])", [
          cleanupNotificationIds,
        ])
        .catch(() => undefined);
      await database
        .query(
          "delete from app_auth_email_outbox where recipient = any($1::text[])",
          [cleanupEmails],
        )
        .catch(() => undefined);
      await database
        .query("delete from app_user where email = any($1::text[])", [
          cleanupEmails,
        ])
        .catch(() => undefined);
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
  if (webhookServer)
    await new Promise((resolve) => webhookServer.close(resolve));
  if (smsServer) await new Promise((resolve) => smsServer.close(resolve));
  if (streamServer) await new Promise((resolve) => streamServer.close(resolve));
  if (scratchAdmin && scratchDatabase) {
    await scratchAdmin
      .query(`drop database if exists "${scratchDatabase}" with (force)`)
      .catch(() => undefined);
    await scratchAdmin.end().catch(() => undefined);
  }
}
