import { defineConfig } from "vite";
import type { Plugin, ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { createHash, createPrivateKey, randomUUID, sign as cryptoSign } from "node:crypto";
import path from "node:path";
import { promisify } from "node:util";
import type { IncomingMessage, ServerResponse } from "node:http";
import { validateAssemblyContracts } from "../../scripts/lib/assembly.mjs";
import {
  resolveCfpgConnectCommand,
  validateCfpgConnection,
} from "../../scripts/lib/cfpg.mjs";
import {
  AuthEmailProviderError,
  sendAuthEmail,
} from "../../workers/app/auth-email-provider.ts";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const execFileAsync = promisify(execFile);
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

function providerFetch(input: string | URL | Request, init: RequestInit = {}) {
  return fetch(input, { ...init, signal: init.signal || AbortSignal.timeout(30_000) });
}

const providerCredentialFields = {
  google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  github: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
  apple: [
    "APPLE_CLIENT_ID",
    "APPLE_TEAM_ID",
    "APPLE_KEY_ID",
    "APPLE_PRIVATE_KEY_BASE64",
    "APPLE_APP_BUNDLE_IDENTIFIER",
  ],
  cfsend: ["CFSEND_API_URL", "CFSEND_API_KEY", "CFSEND_FROM"],
  resend: ["RESEND_API_KEY", "RESEND_FROM"],
  "cloudflare-email-service": ["CLOUDFLARE_EMAIL_FROM"],
  stripe: [
    "STRIPE_SECRET_KEY",
    "STRIPE_PUBLISHABLE_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_PRO",
  ],
  "s3-compatible": ["S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"],
  turnstile: ["TURNSTILE_SECRET_KEY", "STARTER_PRODUCTION_TURNSTILE_SECRET_KEY"],
  "expo-push": ["EXPO_PUSH_ACCESS_TOKEN", "STARTER_PRODUCTION_EXPO_PUSH_ACCESS_TOKEN"],
  "twilio-sms": ["TWILIO_ACCOUNT_SID", "TWILIO_API_KEY", "TWILIO_API_SECRET", "TWILIO_FROM", "STARTER_PRODUCTION_TWILIO_ACCOUNT_SID", "STARTER_PRODUCTION_TWILIO_API_KEY", "STARTER_PRODUCTION_TWILIO_API_SECRET", "STARTER_PRODUCTION_TWILIO_FROM"],
  "cloudflare-stream": ["CLOUDFLARE_STREAM_TOKEN", "STREAM_WEBHOOK_SECRET", "STARTER_PRODUCTION_CLOUDFLARE_STREAM_TOKEN", "STARTER_PRODUCTION_STREAM_WEBHOOK_SECRET"],
  "cloudflare-release": ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"],
  "github-release": ["GITHUB_TOKEN"],
  "expo-eas": ["EXPO_TOKEN", "EXPO_OWNER", "EXPO_PROJECT_ID"],
  "apple-app-store": ["ASC_KEY_ID", "ASC_ISSUER_ID", "ASC_API_KEY_BASE64", "ASC_APP_ID"],
  "google-play": ["GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64", "GOOGLE_PLAY_PACKAGE_NAME"],
} as const;
const allowedProviderSecrets = new Set<string>(
  Object.values(providerCredentialFields).flat(),
);

function parseEnvSource(source: string) {
  const values = new Map<string, string>();
  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const name = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1);
    values.set(name, value);
  }
  return values;
}

async function readOptionalEnv(file: string) {
  try {
    return parseEnvSource(await readFile(file, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return new Map<string, string>();
    throw error;
  }
}

async function providerCredentialStatus() {
  const providers = JSON.parse(
    await readFile(path.join(repositoryRoot, "profiles/providers.json"), "utf8"),
  ) as { defaultPath: string };
  const profilePath = process.env.STARTER_DEV_PROFILE_PATH || providers.defaultPath;
  const [project, shared] = await Promise.all([
    readOptionalEnv(path.join(repositoryRoot, ".dev.vars")),
    readOptionalEnv(profilePath),
  ]);
  return Object.fromEntries(
    Object.entries(providerCredentialFields).map(([provider, fields]) => {
      const missing = fields.filter(
        (field) => !(project.get(field) || shared.get(field) || "").trim(),
      );
      const projectFields = fields.filter((field) => Boolean(project.get(field)?.trim()));
      const sharedFields = fields.filter(
        (field) => !project.get(field)?.trim() && Boolean(shared.get(field)?.trim()),
      );
      return [
        provider,
        {
          configured: missing.length === 0,
          source:
            projectFields.length === fields.length
              ? "project"
              : sharedFields.length === fields.length
                ? "shared"
                : projectFields.length || sharedFields.length
                  ? "mixed"
                  : "missing",
          missing,
        },
      ];
    }),
  );
}

async function writeProviderSecrets(input: unknown): Promise<() => Promise<void>> {
  if (!input || typeof input !== "object") return async () => {};
  const entries = Object.entries(input as Record<string, unknown>)
    .filter(([name, value]) => allowedProviderSecrets.has(name) && typeof value === "string" && value.trim())
    .map(([name, value]) => [name, String(value).trim()] as const);
  if (!entries.length) return async () => {};
  if (entries.some(([, value]) => /[\r\n\0]/u.test(value)))
    throw new Error("Provider credentials cannot contain line breaks.");
  const envPath = path.join(repositoryRoot, ".dev.vars");
  let source = "";
  let existed = true;
  try {
    source = await readFile(envPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    existed = false;
  }
  const lines = source ? source.replace(/\n?$/u, "").split(/\r?\n/u) : [];
  for (const [name, value] of entries) {
    const index = lines.findIndex((line) => line.trimStart().startsWith(`${name}=`));
    const next = `${name}=${value}`;
    if (index >= 0) lines[index] = next;
    else lines.push(next);
  }
  const temporaryPath = `${envPath}.setup-${process.pid}.tmp`;
  await writeFile(temporaryPath, `${lines.join("\n")}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, envPath);
  return async () => {
    if (existed) await writeFile(envPath, source, { encoding: "utf8", mode: 0o600 });
    else await unlink(envPath).catch((error) => { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; });
  };
}

async function readRequestJson(request: IncomingMessage, maximum = 32768) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > maximum) throw new Error("Request payload is too large.");
  }
  return JSON.parse(body || "{}");
}

async function testEmailProvider(input: unknown) {
  if (!input || typeof input !== "object")
    throw new Error("Provider test payload is required.");
  const body = input as {
    provider?: unknown;
    recipient?: unknown;
    providerSecrets?: unknown;
  };
  const provider = String(body.provider || "").trim().toLowerCase();
  if (provider !== "cfsend" && provider !== "resend")
    throw new Error("Local email testing supports CFsend or Resend.");
  const recipient = String(body.recipient || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(recipient) || recipient.length > 254)
    throw new Error("Enter a valid test recipient email address.");

  const providers = JSON.parse(
    await readFile(path.join(repositoryRoot, "profiles/providers.json"), "utf8"),
  ) as { defaultPath: string };
  const profilePath = process.env.STARTER_DEV_PROFILE_PATH || providers.defaultPath;
  const [project, shared] = await Promise.all([
    readOptionalEnv(path.join(repositoryRoot, ".dev.vars")),
    readOptionalEnv(profilePath),
  ]);
  const values = new Map([...shared, ...project]);
  if (body.providerSecrets && typeof body.providerSecrets === "object") {
    for (const name of providerCredentialFields[provider]) {
      const value = (body.providerSecrets as Record<string, unknown>)[name];
      if (typeof value === "string" && value.trim()) {
        if (/[\r\n\0]/u.test(value))
          throw new Error("Provider credentials cannot contain line breaks.");
        values.set(name, value.trim());
      }
    }
  }

  const id = randomUUID();
  const result = await sendAuthEmail(
    {
      AUTH_EMAIL_PROVIDER: provider,
      CFSEND_API_URL: values.get("CFSEND_API_URL"),
      CFSEND_API_KEY: values.get("CFSEND_API_KEY"),
      CFSEND_FROM: values.get("CFSEND_FROM"),
      RESEND_API_URL: "https://api.resend.com",
      RESEND_API_KEY: values.get("RESEND_API_KEY"),
      RESEND_FROM: values.get("RESEND_FROM"),
    },
    {
      id,
      to: recipient,
      subject: `Starter ${provider} delivery test`,
      text: `This is a real ${provider} delivery test from the local Starter Setup. Test ID: ${id}`,
      html: `<p>This is a real <strong>${provider}</strong> delivery test from the local Starter Setup.</p><p>Test ID: <code>${id}</code></p>`,
    },
  );
  return {
    provider: result.provider,
    providerMessageId: result.providerMessageId,
    attempts: result.attempts,
    recipient,
  };
}

async function testTurnstileProvider(input: unknown) {
  if (!input || typeof input !== "object")
    throw new Error("Provider test payload is required.");
  const body = input as { token?: unknown; providerSecrets?: unknown };
  const token = String(body.token || "").trim();
  if (!token || token.length > 2048)
    throw new Error("Complete the Turnstile challenge before testing.");
  const providers = JSON.parse(
    await readFile(path.join(repositoryRoot, "profiles/providers.json"), "utf8"),
  ) as { defaultPath: string };
  const profilePath = process.env.STARTER_DEV_PROFILE_PATH || providers.defaultPath;
  const [project, shared] = await Promise.all([
    readOptionalEnv(path.join(repositoryRoot, ".dev.vars")),
    readOptionalEnv(profilePath),
  ]);
  const replacement =
    body.providerSecrets && typeof body.providerSecrets === "object"
      ? (body.providerSecrets as Record<string, unknown>).TURNSTILE_SECRET_KEY
      : undefined;
  const secret =
    (typeof replacement === "string" ? replacement.trim() : "") ||
    project.get("TURNSTILE_SECRET_KEY") ||
    shared.get("TURNSTILE_SECRET_KEY") ||
    "";
  if (!secret) throw new Error("Development Turnstile secret key is missing.");
  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  const response = await providerFetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: form },
  );
  const result = (await response.json()) as {
    success?: boolean;
    hostname?: string;
    action?: string;
    "error-codes"?: string[];
  };
  if (!response.ok || !result.success)
    throw new Error(
      `Turnstile rejected the token${result["error-codes"]?.length ? `: ${result["error-codes"].join(", ")}` : "."}`,
    );
  return {
    provider: "turnstile",
    verified: true,
    hostname: result.hostname || "unknown",
    action: result.action || "unspecified",
  };
}

async function testWorkersAiProvider(input: unknown) {
  if (!input || typeof input !== "object")
    throw new Error("Provider test payload is required.");
  const body = input as { model?: unknown; gatewayId?: unknown };
  const model = String(body.model || "").trim();
  const gatewayId = String(body.gatewayId || "").trim();
  if (!/^@cf\/[a-z0-9._-]+\/[a-z0-9._-]+$/u.test(model))
    throw new Error("Enter a valid Workers AI model such as @cf/meta/llama-3.1-8b-instruct.");
  if (!/^(?:|[a-z0-9][a-z0-9_-]{0,63})$/u.test(gatewayId))
    throw new Error("AI Gateway ID contains unsupported characters.");
  const providers = JSON.parse(
    await readFile(path.join(repositoryRoot, "profiles/providers.json"), "utf8"),
  ) as { defaultPath: string };
  const profilePath = process.env.STARTER_DEV_PROFILE_PATH || providers.defaultPath;
  const [project, shared] = await Promise.all([
    readOptionalEnv(path.join(repositoryRoot, ".dev.vars")),
    readOptionalEnv(profilePath),
  ]);
  const token = project.get("CLOUDFLARE_API_TOKEN") || shared.get("CLOUDFLARE_API_TOKEN") || "";
  const accountId = project.get("CLOUDFLARE_ACCOUNT_ID") || shared.get("CLOUDFLARE_ACCOUNT_ID") || "";
  if (!token || !accountId)
    throw new Error("Cloudflare API token and account ID are required for the real Workers AI test.");
  const response = await providerFetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(gatewayId ? { "cf-aig-gateway-id": gatewayId } : {}),
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Reply with exactly STARTER_AI_OK." }],
        max_tokens: 32,
      }),
    },
  );
  const payload = (await response.json()) as {
    success?: boolean;
    result?: { response?: string } | string;
    errors?: Array<{ code?: number; message?: string }>;
  };
  if (!response.ok || payload.success === false)
    throw new Error(
      payload.errors?.map(({ code, message }) => `${code || "error"}: ${message || "unknown"}`).join("; ") ||
        `Workers AI returned HTTP ${response.status}.`,
    );
  const text = typeof payload.result === "string"
    ? payload.result
    : String(payload.result?.response || "");
  return {
    provider: "workers-ai",
    model,
    gatewayId: gatewayId || null,
    response: text.slice(0, 160),
  };
}

async function testVectorizeProvider(input: unknown) {
  if (!input || typeof input !== "object")
    throw new Error("Provider test payload is required.");
  const body = input as { indexName?: unknown; dimensions?: unknown; metric?: unknown };
  const indexName = String(body.indexName || "").trim();
  const dimensions = Number(body.dimensions);
  const metric = String(body.metric || "").trim();
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/u.test(indexName))
    throw new Error("Vectorize index name is invalid.");
  if (!Number.isInteger(dimensions) || dimensions < 32 || dimensions > 1536)
    throw new Error("Vectorize dimensions must be between 32 and 1536.");
  if (!new Set(["cosine", "euclidean", "dot-product"]).has(metric))
    throw new Error("Vectorize metric is invalid.");
  const providers = JSON.parse(
    await readFile(path.join(repositoryRoot, "profiles/providers.json"), "utf8"),
  ) as { defaultPath: string };
  const profilePath = process.env.STARTER_DEV_PROFILE_PATH || providers.defaultPath;
  const [project, shared] = await Promise.all([
    readOptionalEnv(path.join(repositoryRoot, ".dev.vars")),
    readOptionalEnv(profilePath),
  ]);
  const token = project.get("CLOUDFLARE_API_TOKEN") || shared.get("CLOUDFLARE_API_TOKEN") || "";
  const accountId = project.get("CLOUDFLARE_ACCOUNT_ID") || shared.get("CLOUDFLARE_ACCOUNT_ID") || "";
  if (!token || !accountId)
    throw new Error("Cloudflare API token and account ID are required for the real Vectorize test.");
  const base = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/vectorize/v2/indexes/${encodeURIComponent(indexName)}`;
  const headers = { Authorization: `Bearer ${token}` };
  const indexResponse = await providerFetch(base, { headers });
  const indexPayload = (await indexResponse.json()) as { success?: boolean; result?: { name?: string; config?: { dimensions?: number; metric?: string } }; errors?: Array<{ code?: number; message?: string }> };
  if (!indexResponse.ok || !indexPayload.success || !indexPayload.result)
    throw new Error(indexPayload.errors?.map(({ code, message }) => `${code || "error"}: ${message || "unknown"}`).join("; ") || "Development Vectorize index is not provisioned.");
  if (Number(indexPayload.result.config?.dimensions) !== dimensions || indexPayload.result.config?.metric !== metric)
    throw new Error("The live Vectorize index dimensions or metric do not match Setup.");
  const id = `starter-setup-${randomUUID()}`;
  const vector = Array.from({ length: dimensions }, () => 0);
  vector[0] = 1;
  const form = new FormData();
  form.set("vectors", new Blob([`${JSON.stringify({ id, values: vector, metadata: { purpose: "starter-setup-test" } })}\n`], { type: "application/x-ndjson" }), "vector.ndjson");
  const upsertResponse = await providerFetch(`${base}/upsert`, { method: "POST", headers, body: form });
  const upsertPayload = (await upsertResponse.json()) as { success?: boolean; result?: { mutationId?: string }; errors?: Array<{ message?: string }> };
  if (!upsertResponse.ok || !upsertPayload.success)
    throw new Error(upsertPayload.errors?.map(({ message }) => message).join("; ") || "Vectorize upsert failed.");
  try {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const queryResponse = await providerFetch(`${base}/query`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ vector, topK: 1, returnMetadata: "all" }) });
      const queryPayload = (await queryResponse.json()) as { success?: boolean; result?: { matches?: Array<{ id?: string; score?: number }> } };
      const match = queryPayload.result?.matches?.find((entry) => entry.id === id);
      if (queryResponse.ok && queryPayload.success && match)
        return { provider: "vectorize", indexName, dimensions, metric, mutationId: upsertPayload.result?.mutationId || null, match: { id: match.id, score: match.score ?? null } };
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error("Vectorize mutation did not become queryable in time.");
  } finally {
    await providerFetch(`${base}/delete_by_ids`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ ids: [id] }) }).catch(() => undefined);
  }
}

async function testExpoPushProvider(input: unknown) {
  if (!input || typeof input !== "object")
    throw new Error("Provider test payload is required.");
  const body = input as { token?: unknown; accessTokenRequired?: unknown; providerSecrets?: unknown };
  const token = String(body.token || "").trim();
  if (!/^(?:Exponent|Expo)PushToken\[[A-Za-z0-9_-]{8,256}\]$/u.test(token))
    throw new Error("Enter a valid ExpoPushToken from a physical Development build.");
  const providers = JSON.parse(
    await readFile(path.join(repositoryRoot, "profiles/providers.json"), "utf8"),
  ) as { defaultPath: string };
  const profilePath = process.env.STARTER_DEV_PROFILE_PATH || providers.defaultPath;
  const [project, shared] = await Promise.all([
    readOptionalEnv(path.join(repositoryRoot, ".dev.vars")),
    readOptionalEnv(profilePath),
  ]);
  const replacement = body.providerSecrets && typeof body.providerSecrets === "object"
    ? (body.providerSecrets as Record<string, unknown>).EXPO_PUSH_ACCESS_TOKEN
    : undefined;
  const accessToken = (typeof replacement === "string" ? replacement.trim() : "") || project.get("EXPO_PUSH_ACCESS_TOKEN") || shared.get("EXPO_PUSH_ACCESS_TOKEN") || "";
  if (body.accessTokenRequired && !accessToken)
    throw new Error("Expo Push access token is required by this project configuration.");
  const response = await providerFetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify([{ to: token, title: "Starter push test", body: "Expo Push delivery is configured.", sound: "default", channelId: "default", data: { purpose: "starter-setup-test" } }]),
  });
  const payload = (await response.json()) as { data?: Array<{ status?: string; id?: string; message?: string; details?: { error?: string } }>; errors?: unknown };
  const ticket = payload.data?.[0];
  if (!response.ok || !ticket || ticket.status !== "ok" || !ticket.id)
    throw new Error(ticket?.details?.error || ticket?.message || `Expo Push returned HTTP ${response.status}.`);
  return { provider: "expo-push", ticketId: ticket.id, status: ticket.status };
}

async function testTwilioSmsProvider(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Provider test payload is required.");
  const body = input as { recipient?: unknown; apiBaseUrl?: unknown; providerSecrets?: unknown };
  const recipient = String(body.recipient || "").trim();
  const apiBaseUrl = String(body.apiBaseUrl || "https://api.twilio.com").trim().replace(/\/$/u, "");
  if (!/^\+[1-9][0-9]{7,14}$/u.test(recipient)) throw new Error("Enter a valid E.164 test phone number.");
  if (!apiBaseUrl.startsWith("https://")) throw new Error("Twilio API base URL must use HTTPS.");
  const providers = JSON.parse(await readFile(path.join(repositoryRoot, "profiles/providers.json"), "utf8")) as { defaultPath: string };
  const profilePath = process.env.STARTER_DEV_PROFILE_PATH || providers.defaultPath;
  const [project, shared] = await Promise.all([readOptionalEnv(path.join(repositoryRoot, ".dev.vars")), readOptionalEnv(profilePath)]);
  const values = new Map([...shared, ...project]);
  if (body.providerSecrets && typeof body.providerSecrets === "object")
    for (const name of ["TWILIO_ACCOUNT_SID", "TWILIO_API_KEY", "TWILIO_API_SECRET", "TWILIO_FROM"]) {
      const value = (body.providerSecrets as Record<string, unknown>)[name];
      if (typeof value === "string" && value.trim()) values.set(name, value.trim());
    }
  const account = values.get("TWILIO_ACCOUNT_SID") || "";
  const key = values.get("TWILIO_API_KEY") || "";
  const secret = values.get("TWILIO_API_SECRET") || "";
  const from = values.get("TWILIO_FROM") || "";
  if (!/^AC[0-9a-f]{32}$/iu.test(account) || !/^SK[0-9a-f]{32}$/iu.test(key) || !secret || !/^\+[1-9][0-9]{7,14}$/u.test(from))
    throw new Error("Development Twilio Account SID, API Key, API Secret or sender is incomplete.");
  const response = await providerFetch(`${apiBaseUrl}/2010-04-01/Accounts/${account}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${key}:${secret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: recipient, From: from, Body: "Starter Twilio SMS delivery is configured." }),
  });
  const payload = (await response.json()) as { sid?: string; status?: string; code?: number; message?: string };
  if (!response.ok || !payload.sid || !new Set(["queued", "accepted", "sending", "sent"]).has(String(payload.status)))
    throw new Error(payload.message || (payload.code ? `Twilio error ${payload.code}` : `Twilio returned HTTP ${response.status}.`));
  return { provider: "twilio-sms", providerSid: payload.sid, status: payload.status, recipientLast4: recipient.slice(-4) };
}

async function testCloudflareStreamProvider(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Provider test payload is required.");
  const body = input as { accountId?: unknown; apiBaseUrl?: unknown; allowedOrigins?: unknown; providerSecrets?: unknown };
  const accountId = String(body.accountId || "").trim();
  const apiBaseUrl = String(body.apiBaseUrl || "").trim().replace(/\/$/u, "");
  const allowedOrigins = Array.isArray(body.allowedOrigins) ? body.allowedOrigins.map(String) : [];
  if (!/^[a-f0-9]{32}$/u.test(accountId) || !apiBaseUrl.startsWith("https://") || !allowedOrigins.length)
    throw new Error("Development Stream account, API URL or allowed origins are invalid.");
  const providers = JSON.parse(await readFile(path.join(repositoryRoot, "profiles/providers.json"), "utf8")) as { defaultPath: string };
  const profilePath = process.env.STARTER_DEV_PROFILE_PATH || providers.defaultPath;
  const [project, shared] = await Promise.all([readOptionalEnv(path.join(repositoryRoot, ".dev.vars")), readOptionalEnv(profilePath)]);
  const replacement = body.providerSecrets && typeof body.providerSecrets === "object" ? (body.providerSecrets as Record<string, unknown>).CLOUDFLARE_STREAM_TOKEN : undefined;
  const token = (typeof replacement === "string" ? replacement.trim() : "") || project.get("CLOUDFLARE_STREAM_TOKEN") || shared.get("CLOUDFLARE_STREAM_TOKEN") || "";
  if (!token) throw new Error("Development Cloudflare Stream token is missing.");
  const endpoint = `${apiBaseUrl}/accounts/${accountId}/stream/direct_upload`;
  const response = await providerFetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Upload-Creator": "starter-setup-test" },
    body: JSON.stringify({ maxDurationSeconds: 1, allowedOrigins, creator: "starter-setup-test", expiry: new Date(Date.now() + 10 * 60_000).toISOString(), meta: { name: "starter-setup-test.mp4" }, requireSignedURLs: false }),
  });
  const payload = (await response.json()) as { success?: boolean; result?: { uid?: string; uploadURL?: string }; errors?: Array<{ code?: number; message?: string }> };
  const uid = String(payload.result?.uid || "");
  if (!response.ok || !payload.success || !uid || !payload.result?.uploadURL)
    throw new Error(payload.errors?.map(({ code, message }) => `${code || "error"}: ${message || "unknown"}`).join("; ") || `Stream returned HTTP ${response.status}.`);
  const deleted = await providerFetch(`${apiBaseUrl}/accounts/${accountId}/stream/${encodeURIComponent(uid)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  if (!deleted.ok) throw new Error(`Stream test upload ${uid} could not be deleted.`);
  return { provider: "cloudflare-stream", uid, uploadUrlCreated: true, deleted: true };
}

const encodedJson = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

async function testReleasePlatformProvider(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Provider test payload is required.");
  const body = input as { provider?: unknown; providerSecrets?: unknown };
  const provider = String(body.provider || "").trim().toLowerCase();
  if (!new Set(["cloudflare-release", "github-release", "expo-eas", "apple-app-store", "google-play"]).has(provider))
    throw new Error("Unknown release platform.");
  const profiles = JSON.parse(await readFile(path.join(repositoryRoot, "profiles/providers.json"), "utf8")) as { defaultPath: string };
  const profilePath = process.env.STARTER_DEV_PROFILE_PATH || profiles.defaultPath;
  const [project, shared] = await Promise.all([readOptionalEnv(path.join(repositoryRoot, ".dev.vars")), readOptionalEnv(profilePath)]);
  const values = new Map([...shared, ...project]);
  if (body.providerSecrets && typeof body.providerSecrets === "object")
    for (const name of providerCredentialFields[provider as keyof typeof providerCredentialFields]) {
      const replacement = (body.providerSecrets as Record<string, unknown>)[name];
      if (typeof replacement === "string" && replacement.trim()) values.set(name, replacement.trim());
    }
  const requiredValue = (name: string) => {
    const value = String(values.get(name) || "").trim();
    if (!value) throw new Error(`${name} is required.`);
    return value;
  };

  if (provider === "cloudflare-release") {
    const token = requiredValue("CLOUDFLARE_API_TOKEN");
    const accountId = requiredValue("CLOUDFLARE_ACCOUNT_ID");
    const headers = { Authorization: `Bearer ${token}` };
    const [tokenResponse, accountResponse] = await Promise.all([
      providerFetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/tokens/verify`, { headers }),
      providerFetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}`, { headers }),
    ]);
    const tokenPayload = await tokenResponse.json() as { success?: boolean; result?: { status?: string }; errors?: Array<{ message?: string }> };
    const accountPayload = await accountResponse.json() as { success?: boolean; result?: { id?: string; name?: string }; errors?: Array<{ message?: string }> };
    if (!tokenResponse.ok || !tokenPayload.success || tokenPayload.result?.status !== "active" || !accountResponse.ok || !accountPayload.success || accountPayload.result?.id !== accountId)
      throw new Error([...tokenPayload.errors || [], ...accountPayload.errors || []].map(({ message }) => message).filter(Boolean).join("; ") || "Cloudflare token or account access failed.");
    return { provider, identity: accountPayload.result.name || accountId, verified: true };
  }
  if (provider === "github-release") {
    const response = await providerFetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${requiredValue("GITHUB_TOKEN")}`, Accept: "application/vnd.github+json", "User-Agent": "starter-setup" } });
    const payload = await response.json() as { login?: string; id?: number; message?: string };
    if (!response.ok || !payload.login) throw new Error(payload.message || `GitHub returned HTTP ${response.status}.`);
    return { provider, identity: payload.login, verified: true };
  }
  if (provider === "expo-eas") {
    const { stdout: output } = await execFileAsync("npx", ["--yes", "eas-cli@22.0.0", "project:info", "--json", "--non-interactive"], {
      cwd: path.join(repositoryRoot, "apps/mobile"),
      encoding: "utf8",
      timeout: 120_000,
      maxBuffer: 2 * 1024 * 1024,
      env: { ...process.env, EXPO_TOKEN: requiredValue("EXPO_TOKEN"), EXPO_OWNER: requiredValue("EXPO_OWNER"), EXPO_PROJECT_ID: requiredValue("EXPO_PROJECT_ID") },
    });
    const payload = JSON.parse(output.slice(output.indexOf("{"))) as { id?: string; name?: string; ownerAccount?: { name?: string } };
    if (payload.id !== requiredValue("EXPO_PROJECT_ID")) throw new Error("EAS returned a different project ID.");
    return { provider, identity: `${payload.ownerAccount?.name || requiredValue("EXPO_OWNER")}/${payload.name || payload.id}`, verified: true };
  }
  if (provider === "apple-app-store") {
    const now = Math.floor(Date.now() / 1000);
    const header = encodedJson({ alg: "ES256", kid: requiredValue("ASC_KEY_ID"), typ: "JWT" });
    const claims = encodedJson({ iss: requiredValue("ASC_ISSUER_ID"), iat: now - 5, exp: now + 600, aud: "appstoreconnect-v1" });
    const signingInput = `${header}.${claims}`;
    const key = createPrivateKey(Buffer.from(requiredValue("ASC_API_KEY_BASE64"), "base64").toString("utf8"));
    const signature = cryptoSign("sha256", Buffer.from(signingInput), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
    const appId = requiredValue("ASC_APP_ID");
    const response = await providerFetch(`https://api.appstoreconnect.apple.com/v1/apps/${encodeURIComponent(appId)}`, { headers: { Authorization: `Bearer ${signingInput}.${signature}` } });
    const payload = await response.json() as { data?: { id?: string; attributes?: { name?: string; bundleId?: string } }; errors?: Array<{ detail?: string }> };
    if (!response.ok || payload.data?.id !== appId) throw new Error(payload.errors?.map(({ detail }) => detail).filter(Boolean).join("; ") || `App Store Connect returned HTTP ${response.status}.`);
    return { provider, identity: payload.data.attributes?.name || payload.data.attributes?.bundleId || appId, verified: true };
  }
  const serviceAccount = JSON.parse(Buffer.from(requiredValue("GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64"), "base64").toString("utf8")) as { client_email?: string; private_key?: string; token_uri?: string };
  if (!serviceAccount.client_email || !serviceAccount.private_key) throw new Error("Google Play service account JSON is incomplete.");
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = serviceAccount.token_uri || "https://oauth2.googleapis.com/token";
  const signingInput = `${encodedJson({ alg: "RS256", typ: "JWT" })}.${encodedJson({ iss: serviceAccount.client_email, scope: "https://www.googleapis.com/auth/androidpublisher", aud: tokenUri, iat: now - 5, exp: now + 600 })}`;
  const assertion = `${signingInput}.${cryptoSign("RSA-SHA256", Buffer.from(signingInput), serviceAccount.private_key).toString("base64url")}`;
  const tokenResponse = await providerFetch(tokenUri, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
  const tokenPayload = await tokenResponse.json() as { access_token?: string; error_description?: string };
  if (!tokenResponse.ok || !tokenPayload.access_token) throw new Error(tokenPayload.error_description || "Google service-account token exchange failed.");
  const packageName = requiredValue("GOOGLE_PLAY_PACKAGE_NAME");
  const appResponse = await providerFetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/subscriptions?pageSize=1`, { headers: { Authorization: `Bearer ${tokenPayload.access_token}` } });
  const appPayload = await appResponse.json() as { error?: { message?: string } };
  if (!appResponse.ok) throw new Error(appPayload.error?.message || `Google Play returned HTTP ${appResponse.status}.`);
  return { provider, identity: packageName, verified: true };
}

async function normalizedCfpgConnection(input: unknown, command: unknown) {
  const desiredCommand = String(
    command || (input && typeof input === "object" && "connectCommand" in input
      ? (input as { connectCommand?: unknown }).connectCommand
      : "") || "",
  ).trim();
  if (!desiredCommand) return null;
  if (
    input &&
    typeof input === "object" &&
    "connectCommand" in input &&
    String((input as { connectCommand?: unknown }).connectCommand || "").trim() === desiredCommand &&
    validateCfpgConnection(input, "CFPG connection").length === 0
  )
    return input;
  return resolveCfpgConnectCommand(desiredCommand);
}

async function loadStylekitSnapshots(stylekitCatalog: {
  styles: Array<{
    slug: string;
    classification: string;
    globalEligibility: string;
  }>;
}) {
  const summaries = await Promise.all(
    stylekitCatalog.styles
      .filter(
        ({ classification, globalEligibility }) =>
          classification === "base-visual" && globalEligibility === "eligible",
      )
      .map(async ({ slug }) => {
        const source = await readFile(
          path.join(repositoryRoot, "design/stylekit", slug, "snapshot.json"),
          "utf8",
        );
        const snapshot = JSON.parse(source);
        return [
          slug,
          {
            snapshotVersion: snapshot.snapshotVersion,
            snapshotHash: sha256(source),
            immutable: snapshot.immutable,
            targets: snapshot.targets,
            style: snapshot.style,
          },
        ] as const;
      }),
  );
  return Object.fromEntries(summaries);
}

function isLoopbackHost(value: string | undefined) {
  if (!value) return false;
  try {
    return new Set(["localhost", "127.0.0.1", "[::1]"]).has(
      new URL(`http://${value}`).hostname,
    );
  } catch {
    return false;
  }
}

function isLoopbackOrigin(value: string | undefined) {
  if (!value) return false;
  try {
    return new Set(["localhost", "127.0.0.1", "[::1]"]).has(
      new URL(value).hostname,
    );
  } catch {
    return false;
  }
}

function localSetupApi(): Plugin {
  const recentProviderTests = new Map<string, number>();
  return {
    name: "starter-local-setup-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        async (
          request: IncomingMessage,
          response: ServerResponse,
          next: () => void,
        ) => {
          const url = new URL(request.url || "/", "http://starter.local");
          if (!new Set(["/__starter/setup", "/__starter/provider-test"]).has(url.pathname))
            return next();
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.setHeader("Cache-Control", "no-store");
          if (
            !isLoopbackHost(request.headers.host) ||
            (new Set(["PUT", "POST"]).has(request.method || "") &&
              !isLoopbackOrigin(request.headers.origin))
          ) {
            response.statusCode = 403;
            response.end(
              json({ error: "Setup requests must originate from localhost." }),
            );
            return;
          }

          try {
            if (url.pathname === "/__starter/provider-test") {
              if (request.method !== "POST") {
                response.statusCode = 405;
                response.end(json({ error: "Method not allowed." }));
                return;
              }
              const payload = await readRequestJson(request);
              const provider = String(payload.provider || "").trim().toLowerCase();
              const discriminator = provider === "workers-ai"
                ? `${String(payload.model || "").trim()}:${String(payload.gatewayId || "").trim()}`
                : provider === "vectorize"
                  ? String(payload.indexName || "").trim()
                  : provider === "expo-push"
                    ? String(payload.token || "").trim()
                    : provider === "twilio-sms"
                      ? String(payload.recipient || "").trim()
                      : provider === "cloudflare-stream"
                        ? String(payload.accountId || "").trim()
                      : provider.endsWith("-release") || new Set(["expo-eas", "apple-app-store", "google-play"]).has(provider)
                        ? provider
                : String(payload.recipient || "").trim().toLowerCase();
              const key = `${provider}:${discriminator}`;
              const lastTest = recentProviderTests.get(key) || 0;
              if (Date.now() - lastTest < 10_000) {
                response.statusCode = 429;
                response.end(json({ error: "Wait 10 seconds before repeating this provider test." }));
                return;
              }
              const result = provider === "turnstile"
                ? await testTurnstileProvider(payload)
                : provider === "workers-ai"
                  ? await testWorkersAiProvider(payload)
                  : provider === "vectorize"
                    ? await testVectorizeProvider(payload)
                    : provider === "expo-push"
                      ? await testExpoPushProvider(payload)
                      : provider === "twilio-sms"
                        ? await testTwilioSmsProvider(payload)
                        : provider === "cloudflare-stream"
                          ? await testCloudflareStreamProvider(payload)
                          : provider.endsWith("-release") || new Set(["expo-eas", "apple-app-store", "google-play"]).has(provider)
                            ? await testReleasePlatformProvider(payload)
                  : await testEmailProvider(payload);
              recentProviderTests.set(key, Date.now());
              response.statusCode = 200;
              response.end(json({ ok: true, result }));
              return;
            }
            const [
              manifestSource,
              blueprintSource,
              catalogSource,
              designCatalogSource,
              pageCatalogSource,
              configSource,
              stylekitCatalogSource,
              saasSourcesSource,
              saasCapabilitiesSource,
              providerCatalogSource,
            ] = await Promise.all([
              readFile(
                path.join(repositoryRoot, "starter.manifest.json"),
                "utf8",
              ),
              readFile(
                path.join(repositoryRoot, "starter.blueprint.json"),
                "utf8",
              ),
              readFile(
                path.join(repositoryRoot, "catalog/catalog.json"),
                "utf8",
              ),
              readFile(
                path.join(repositoryRoot, "design/catalog.json"),
                "utf8",
              ),
              readFile(path.join(repositoryRoot, "pages/catalog.json"), "utf8"),
              readFile(
                path.join(repositoryRoot, "starter.config.json"),
                "utf8",
              ),
              readFile(
                path.join(
                  repositoryRoot,
                  "design/stylekit/source-catalog.json",
                ),
                "utf8",
              ),
              readFile(
                path.join(repositoryRoot, "catalog/saas-sources.json"),
                "utf8",
              ),
              readFile(
                path.join(repositoryRoot, "catalog/saas-capabilities.json"),
                "utf8",
              ),
              readFile(
                path.join(repositoryRoot, "catalog/providers.json"),
                "utf8",
              ),
            ]);
            const manifest = JSON.parse(manifestSource);
            const catalog = JSON.parse(catalogSource);
            const designCatalog = JSON.parse(designCatalogSource);
            const pageCatalog = JSON.parse(pageCatalogSource);
            const config = JSON.parse(configSource);
            const stylekitCatalog = JSON.parse(stylekitCatalogSource);
            const setupStylekitCatalog = {
              ...stylekitCatalog,
              styles: stylekitCatalog.styles.filter(
                ({ classification, globalEligibility }: { classification: string; globalEligibility: string }) =>
                  classification === "base-visual" && globalEligibility === "eligible",
              ),
            };
            const saasSources = JSON.parse(saasSourcesSource);
            const saasCapabilities = JSON.parse(saasCapabilitiesSource);
            const providerCatalog = JSON.parse(providerCatalogSource);
            const stylekitSnapshots =
              await loadStylekitSnapshots(stylekitCatalog);
            const initialBlueprint = JSON.parse(blueprintSource);
            const initialSnapshotPath = path.join(
              repositoryRoot,
              "design/stylekit",
              initialBlueprint.stylekit?.slug || "",
              "snapshot.json",
            );
            const initialSnapshotSource = await readFile(
              initialSnapshotPath,
              "utf8",
            );

            if (request.method === "GET") {
              response.statusCode = 200;
              response.end(
                json({
                  blueprint: initialBlueprint,
                  catalog,
                  designCatalog,
                  pageCatalog,
                  stylekitCatalog: setupStylekitCatalog,
                  stylekitSnapshots,
                  stylekitSnapshot: {
                    ...JSON.parse(initialSnapshotSource),
                    snapshotHash: sha256(initialSnapshotSource),
                  },
                  saasSources,
                  saasCapabilities,
                  providerCatalog,
                  providerCredentials: await providerCredentialStatus(),
                  config,
                }),
              );
              return;
            }
            if (request.method !== "PUT") {
              response.statusCode = 405;
              response.end(json({ error: "Method not allowed." }));
              return;
            }

            const payload = await readRequestJson(request, 524288);
            const submittedBlueprint = payload.blueprint;
            const nextConfig = payload.config;
            if (!submittedBlueprint || !nextConfig)
              throw new Error(
                "Blueprint and Starter configuration are required.",
              );
            const cfpgCommands = payload.cfpgCommands || {};
            const blueprint = {
              ...submittedBlueprint,
              providers: {
                ...submittedBlueprint.providers,
                database: {
                  ...submittedBlueprint.providers.database,
                  cfpg: {
                    development: await normalizedCfpgConnection(
                      submittedBlueprint.providers.database.cfpg?.development,
                      cfpgCommands.development,
                    ),
                    production: await normalizedCfpgConnection(
                      submittedBlueprint.providers.database.cfpg?.production,
                      cfpgCommands.production,
                    ),
                  },
                },
              },
            };
            if (
              blueprint.project?.name !== nextConfig.project?.name ||
              blueprint.project?.slug !== nextConfig.project?.slug
            )
              throw new Error(
                "Blueprint and Starter configuration identities must match.",
              );
            const nextManifest = {
              ...manifest,
              project: {
                name: blueprint.project.name,
                slug: blueprint.project.slug,
              },
            };
            const snapshotPath = path.join(
              repositoryRoot,
              "design/stylekit",
              blueprint.stylekit?.slug || "",
              "snapshot.json",
            );
            const snapshotSource = await readFile(snapshotPath, "utf8");
            const failures = validateAssemblyContracts(
              nextManifest,
              blueprint,
              catalog,
              designCatalog,
              pageCatalog,
              {
                catalog: stylekitCatalog,
                snapshot: JSON.parse(snapshotSource),
                snapshotHash: sha256(snapshotSource),
              },
            );
            if (failures.length) {
              response.statusCode = 400;
              response.end(
                json({ error: "Blueprint validation failed.", failures }),
              );
              return;
            }

            const blueprintPath = path.join(
              repositoryRoot,
              "starter.blueprint.json",
            );
            const configPath = path.join(repositoryRoot, "starter.config.json");
            const blueprintTemporaryPath = path.join(
              repositoryRoot,
              ".starter.blueprint.json.tmp",
            );
            const configTemporaryPath = path.join(
              repositoryRoot,
              ".starter.config.json.tmp",
            );
            const resetIdentity =
              manifest.project?.slug === "starter" &&
              blueprint.project.slug !== "starter";
            nextConfig.email.provider =
              blueprint.providers.email.default === "cloudflare-email-service"
                ? "cloudflare-email"
                : blueprint.providers.email.default;
            await Promise.all([
              writeFile(blueprintTemporaryPath, json(blueprint), {
                encoding: "utf8",
                mode: 0o600,
              }),
              writeFile(configTemporaryPath, json(nextConfig), {
                encoding: "utf8",
                mode: 0o600,
              }),
            ]);
            await rename(blueprintTemporaryPath, blueprintPath);
            await rename(configTemporaryPath, configPath);
            let rollbackProviderSecrets: () => Promise<void> = async () => {};
            try {
              rollbackProviderSecrets = await writeProviderSecrets(payload.providerSecrets);
              await execFileAsync(
                process.execPath,
                [
                  "scripts/sync-project-identity.mjs",
                  ...(resetIdentity ? ["--reset"] : []),
                ],
                { cwd: repositoryRoot, maxBuffer: 2 * 1024 * 1024 },
              );
              await execFileAsync(process.execPath, ["scripts/build-dp.mjs"], {
                cwd: repositoryRoot,
                maxBuffer: 2 * 1024 * 1024,
              });
            } catch (error) {
              await rollbackProviderSecrets();
              await Promise.all([
                writeFile(blueprintPath, blueprintSource, "utf8"),
                writeFile(configPath, configSource, "utf8"),
              ]);
              await execFileAsync(
                process.execPath,
                ["scripts/sync-project-identity.mjs"],
                { cwd: repositoryRoot, maxBuffer: 2 * 1024 * 1024 },
              );
              await execFileAsync(process.execPath, ["scripts/build-dp.mjs"], {
                cwd: repositoryRoot,
                maxBuffer: 2 * 1024 * 1024,
              });
              throw error;
            }
            response.statusCode = 200;
            response.end(
              json({
                blueprint,
                catalog,
                designCatalog,
                pageCatalog,
                stylekitCatalog: setupStylekitCatalog,
                stylekitSnapshots,
                stylekitSnapshot: {
                  ...JSON.parse(snapshotSource),
                  snapshotHash: sha256(snapshotSource),
                },
                saasSources,
                saasCapabilities,
                providerCatalog,
                providerCredentials: await providerCredentialStatus(),
                config: nextConfig,
              }),
            );
          } catch (error) {
            response.statusCode =
              error instanceof AuthEmailProviderError
                ? error.code === "provider_not_configured"
                  ? 400
                  : 502
                : 400;
            response.end(
              json({
                error: error instanceof Error ? error.message : String(error),
                ...(error instanceof AuthEmailProviderError
                  ? {
                      code: error.code,
                      attempts: error.attempts,
                      status: error.status,
                    }
                  : {}),
              }),
            );
          }
        },
      );
    },
  };
}

function optionalMapLibreWorker(): Plugin {
  return {
    name: "starter-maplibre-worker",
    async writeBundle(options) {
      if (!options.dir) return;
      for (const filename of [
        "maplibre-gl-worker.mjs",
        "maplibre-gl-shared.mjs",
      ]) {
        const source = path.join(
          repositoryRoot,
          "node_modules/maplibre-gl/dist",
          filename,
        );
        let moduleSource: string;
        try {
          moduleSource = await readFile(source, "utf8");
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
          throw error;
        }
        const target = path.join(options.dir, "assets", filename);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, moduleSource);
      }
    },
  };
}

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/_app/" : "/",
  plugins: [localSetupApi(), react(), tailwindcss(), optionalMapLibreWorker()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: {
    outDir: "../../dist/app-site",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          return /\/node_modules\/(?:react|react-dom|scheduler)\//u.test(id)
            ? "react-vendor"
            : undefined;
        },
      },
    },
  },
}));
