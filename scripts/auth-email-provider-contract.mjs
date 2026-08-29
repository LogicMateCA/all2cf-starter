import assert from "node:assert/strict";
import { AuthEmailProviderError, sendAuthEmail } from "../workers/app/auth-email-provider.ts";

const message = {
  id: "outbox-contract-1",
  to: "recipient@example.test",
  subject: "Verify your email",
  text: "Verify: https://example.test/verify",
  html: "<p>Verify</p>",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function httpSuccess(provider) {
  const requests = [];
  const env = provider === "cfsend"
    ? { AUTH_EMAIL_PROVIDER: "cfsend", CFSEND_API_URL: "https://runtime.example.test", CFSEND_API_KEY: "cfsend-key", CFSEND_FROM: "Starter <auth@example.test>" }
    : { AUTH_EMAIL_PROVIDER: "resend", RESEND_API_URL: "https://api.resend.test", RESEND_API_KEY: "resend-key", RESEND_FROM: "Starter <auth@example.test>" };
  const result = await sendAuthEmail(env, message, {
    request: async (url, init) => { requests.push({ url, init }); return jsonResponse({ id: `${provider}-message-1` }); },
    pause: async () => undefined,
  });
  assert.equal(result.provider, provider);
  assert.equal(result.providerMessageId, `${provider}-message-1`);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, `${provider === "cfsend" ? "https://runtime.example.test" : "https://api.resend.test"}/emails`);
  const headers = new Headers(requests[0].init.headers);
  assert.equal(headers.get("Authorization"), `Bearer ${provider}-key`);
  assert.equal(headers.get("Idempotency-Key"), "auth-outbox-contract-1");
  const payload = JSON.parse(requests[0].init.body);
  assert.deepEqual(payload.to, [message.to]);
  assert.equal(payload.text, message.text);
  assert.equal(payload.html, message.html);
}

await httpSuccess("cfsend");
await httpSuccess("resend");

{
  const keys = [];
  let attempt = 0;
  const result = await sendAuthEmail({ AUTH_EMAIL_PROVIDER: "cfsend", CFSEND_API_URL: "https://runtime.example.test", CFSEND_API_KEY: "key", CFSEND_FROM: "auth@example.test" }, message, {
    request: async (_url, init) => {
      keys.push(new Headers(init.headers).get("Idempotency-Key"));
      attempt += 1;
      if (attempt === 1) return jsonResponse({ error: "temporary" }, 500);
      if (attempt === 2) return jsonResponse({ error: "limited" }, 429);
      return jsonResponse({ message_id: "cfsend-retried-1" });
    },
    pause: async () => undefined,
  });
  assert.equal(result.attempts, 3);
  assert.deepEqual(keys, ["auth-outbox-contract-1", "auth-outbox-contract-1", "auth-outbox-contract-1"]);
}

{
  let attempts = 0;
  await assert.rejects(
    sendAuthEmail({ AUTH_EMAIL_PROVIDER: "cfsend", CFSEND_API_URL: "https://runtime.example.test", CFSEND_API_KEY: "invalid", CFSEND_FROM: "auth@example.test" }, message, {
      request: async () => { attempts += 1; return jsonResponse({ error: "unauthorized" }, 401); },
      pause: async () => undefined,
    }),
    (error) => error instanceof AuthEmailProviderError && error.code === "cfsend_http_401" && !error.retryable,
  );
  assert.equal(attempts, 1);
}

{
  let sent;
  const result = await sendAuthEmail({
    AUTH_EMAIL_PROVIDER: "cloudflare-email",
    CLOUDFLARE_EMAIL_FROM: "auth@example.test",
    EMAIL: { async send(input) { sent = input; return { messageId: "cloudflare-email-1" }; } },
  }, message);
  assert.equal(result.providerMessageId, "cloudflare-email-1");
  assert.equal(sent.to[0], message.to);
}

await assert.rejects(
  sendAuthEmail({ AUTH_EMAIL_PROVIDER: "cfsend", CFSEND_FROM: "auth@example.test" }, message),
  (error) => error instanceof AuthEmailProviderError && error.code === "provider_not_configured",
);

console.log(JSON.stringify({ ok: true, providers: ["cfsend", "resend", "cloudflare-email"], checks: ["payload", "authorization", "stable-idempotency", "retry-429-5xx", "permanent-401", "provider-message-id", "missing-config-fails-closed"] }, null, 2));
