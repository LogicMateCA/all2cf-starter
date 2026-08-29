import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "./lib/env-profile.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const providers = JSON.parse(await readFile(path.join(root, "profiles/providers.json"), "utf8"));
const profilePath = process.env.STARTER_DEV_PROFILE_PATH || providers.defaultPath;
const shared = parseEnv(await readFile(profilePath, "utf8"));
let project = new Map();
try { project = parseEnv(await readFile(path.join(root, ".dev.vars"), "utf8")); } catch {}
const credential = (name) => process.env[name] || project.get(name) || shared.get(name) || "";
const token = credential("CLOUDFLARE_API_TOKEN");
const accountId = credential("CLOUDFLARE_ACCOUNT_ID");
if (!token || !accountId) throw new Error("Cloudflare API token and account ID are required");

const indexName = `starter-contract-${Date.now()}-${randomUUID().slice(0, 8)}`.toLowerCase();
const vectorId = `vector-${randomUUID()}`;
const vector = Array.from({ length: 32 }, (_value, index) => index === 0 ? 1 : 0);
const api = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/vectorize/v2/indexes`;
const authorization = { Authorization: `Bearer ${token}` };

async function jsonRequest(url, init = {}) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false)
    throw new Error(payload?.errors?.map(({ code, message }) => `${code}: ${message}`).join("; ") || `HTTP ${response.status}`);
  return payload;
}

let created = false;
try {
  const createdPayload = await jsonRequest(api, {
    method: "POST",
    headers: { ...authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ name: indexName, description: "Disposable Starter Vectorize contract", config: { dimensions: 32, metric: "cosine" } }),
  });
  created = true;
  if (createdPayload.result?.name !== indexName || createdPayload.result?.config?.dimensions !== 32 || createdPayload.result?.config?.metric !== "cosine")
    throw new Error("Created Vectorize index identity is incorrect");

  const base = `${api}/${encodeURIComponent(indexName)}`;
  const form = new FormData();
  form.set("vectors", new Blob([`${JSON.stringify({ id: vectorId, values: vector, metadata: { purpose: "starter-contract" } })}\n`], { type: "application/x-ndjson" }), "vector.ndjson");
  const upsert = await jsonRequest(`${base}/upsert`, { method: "POST", headers: authorization, body: form });
  let match = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const queried = await jsonRequest(`${base}/query`, {
      method: "POST",
      headers: { ...authorization, "Content-Type": "application/json" },
      body: JSON.stringify({ vector, topK: 1, returnMetadata: "all" }),
    });
    match = queried.result?.matches?.find(({ id }) => id === vectorId) || null;
    if (match) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!match) throw new Error("Vectorize upsert did not become queryable");
  const deleted = await jsonRequest(`${base}/delete_by_ids`, {
    method: "POST",
    headers: { ...authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ ids: [vectorId] }),
  });
  console.log(JSON.stringify({ ok: true, indexName, dimensions: 32, metric: "cosine", mutationId: upsert.result?.mutationId || null, match: { id: match.id, score: match.score ?? null }, deleteMutationId: deleted.result?.mutationId || null }, null, 2));
} finally {
  if (created)
    await fetch(`${api}/${encodeURIComponent(indexName)}`, { method: "DELETE", headers: authorization }).catch(() => undefined);
}
