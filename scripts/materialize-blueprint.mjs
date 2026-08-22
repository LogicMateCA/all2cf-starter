import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateAssemblyContracts,
  validateMaterializerDeliveryContracts,
} from "./lib/assembly.mjs";
import {
  renderDesignCSS,
  renderMobileDesign,
  renderStyleKitAdapterCSS,
  renderStyleKitCSS,
  renderStyleKitMobile,
} from "./lib/design-engine.mjs";
import {
  CFPG_CONNECTOR_PACKAGE,
  CFPG_CONNECTOR_VERSION,
  configureDatabaseRuntime,
} from "./lib/cfpg.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apply = process.argv.includes("--apply");
const check = process.argv.includes("--check");
const blueprintPath = path.join(root, "starter.blueprint.json");
const statePath = path.join(root, ".starter/materialization.json");
const routeRegistryPath = path.join(
  root,
  "apps/web/src/generated/capability-routes.tsx",
);
const workerCapabilityRoutesPath = path.join(
  root,
  "workers/app/generated/capability-routes.ts",
);
const serverAuthRegistryPath = path.join(
  root,
  "workers/app/generated/auth-plugins.ts",
);
const clientAuthRegistryPath = path.join(
  root,
  "apps/web/src/generated/auth-plugins.ts",
);
const workerFeatureRegistryPath = path.join(
  root,
  "workers/app/generated/worker-features.ts",
);
const workerEventRegistryPath = path.join(
  root,
  "workers/app/generated/worker-events.ts",
);
const storageAdapterPath = path.join(
  root,
  "workers/app/generated/storage-adapter.ts",
);
const mobileConfigPluginsPath = path.join(
  root,
  "apps/mobile/generated/optional-config-plugins.json",
);
const webDesignPath = path.join(
  root,
  "apps/web/src/generated/design-profile.css",
);
const marketingDesignPath = path.join(
  root,
  "apps/marketing/src/styles/generated-design-profile.css",
);
const docsDesignPath = path.join(
  root,
  "apps/docs/src/styles/generated-design-profile.css",
);
const webStyleAdapterPath = path.join(
  root,
  "apps/web/src/generated/stylekit-adapter.css",
);
const marketingStyleAdapterPath = path.join(
  root,
  "apps/marketing/src/styles/generated-stylekit-adapter.css",
);
const docsStyleAdapterPath = path.join(
  root,
  "apps/docs/src/styles/generated-stylekit-adapter.css",
);
const mobileDesignPath = path.join(
  root,
  "apps/mobile/generated/design-profile.ts",
);
const marketingProjectPath = path.join(
  root,
  "apps/marketing/src/generated/project.ts",
);
const packageLockPath = path.join(root, "package-lock.json");
const workerFirstConfigPaths = [
  path.join(root, "cloudflare/wrangler.development.jsonc"),
  path.join(root, "cloudflare/wrangler.production.jsonc"),
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

async function optionalRead(file) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function safeProjectPath(relativePath, label) {
  if (
    !relativePath ||
    path.isAbsolute(relativePath) ||
    relativePath.split(/[\\/]/u).includes("..")
  )
    throw new Error(`${label} must be a project-relative path`);
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`))
    throw new Error(`${label} escapes the project root`);
  return resolved;
}

function safePackPath(packRoot, relativePath, label) {
  if (
    !relativePath ||
    path.isAbsolute(relativePath) ||
    relativePath.split(/[\\/]/u).includes("..")
  )
    throw new Error(`${label} must remain inside its pack`);
  const resolved = path.resolve(packRoot, relativePath);
  if (!resolved.startsWith(`${packRoot}${path.sep}`))
    throw new Error(`${label} escapes its pack`);
  return resolved;
}

async function readState() {
  const source = await optionalRead(statePath);
  return source
    ? JSON.parse(source)
    : {
        schemaVersion: "starter-materialization/v1",
        packs: {},
        dependencies: {},
        generatedRoutesHash: null,
        generatedWorkerFirstRoutes: [],
      };
}

async function readPackManifests() {
  const packsRoot = path.join(root, "packs");
  const entries = await readdir(packsRoot, { recursive: true });
  const manifests = [];
  for (const entry of entries
    .filter((name) => String(name).endsWith("pack.json"))
    .sort()) {
    const file = path.join(packsRoot, String(entry));
    const packRoot = path.dirname(file);
    const manifest = JSON.parse(await readFile(file, "utf8"));
    if (manifest.schemaVersion !== "starter-pack/v1")
      throw new Error(`${path.relative(root, file)} must use starter-pack/v1`);
    for (const field of ["files", "dependencies", "routes"])
      if (!Array.isArray(manifest[field]))
        throw new Error(
          `${path.relative(root, file)} must declare ${field} as an array`,
        );
    for (const [pageId, entries] of Object.entries(manifest.pageFiles || {})) {
      if (!Array.isArray(entries) || !entries.length)
        throw new Error(
          `${path.relative(root, file)} must declare pageFiles.${pageId} as a non-empty array`,
        );
    }
    for (const [side, plugin] of Object.entries(manifest.authPlugins || {})) {
      if (
        !new Set(["server", "client"]).has(side) ||
        !plugin ||
        typeof plugin.module !== "string" ||
        typeof plugin.export !== "string"
      )
        throw new Error(
          `${path.relative(root, file)} has an invalid ${side} auth plugin declaration`,
        );
    }
    if (
      manifest.workerFeature &&
      (typeof manifest.workerFeature.module !== "string" ||
        typeof manifest.workerFeature.export !== "string")
    )
      throw new Error(
        `${path.relative(root, file)} has an invalid worker feature declaration`,
      );
    if (
      manifest.workerEvents &&
      (typeof manifest.workerEvents.module !== "string" ||
        typeof manifest.workerEvents.export !== "string")
    )
      throw new Error(
        `${path.relative(root, file)} has an invalid worker event declaration`,
      );
    if (
      manifest.mobileConfigPlugins &&
      (!Array.isArray(manifest.mobileConfigPlugins) ||
        manifest.mobileConfigPlugins.some((plugin) => typeof plugin !== "string" || !plugin.trim()))
    )
      throw new Error(`${path.relative(root, file)} has invalid mobile config plugins`);
    for (const secret of manifest.cloudflare?.requiredSecrets || [])
      if (!/^[A-Z][A-Z0-9_]*$/u.test(secret))
        throw new Error(`${manifest.id} has an invalid required secret ${secret}`);
    for (const queue of manifest.cloudflare?.queues || [])
      if (
        !/^[A-Z][A-Z0-9_]*$/u.test(queue.binding || "") ||
        !/^[a-z0-9][a-z0-9-]*$/u.test(queue.suffix || "")
      )
        throw new Error(`${manifest.id} has an invalid Cloudflare Queue declaration`);
    if (
      manifest.requiresPacks &&
      (!Array.isArray(manifest.requiresPacks) ||
        manifest.requiresPacks.some((id) => typeof id !== "string"))
    )
      throw new Error(
        `${path.relative(root, file)} has invalid required packs`,
      );
    for (const route of manifest.routes) {
      if (typeof route.workerFirst !== "boolean")
        throw new Error(
          `${path.relative(root, file)} route ${route.path || "<missing>"} must declare workerFirst`,
        );
      if (
        typeof route.path !== "string" ||
        !/^\/(?:[A-Za-z0-9._~-]+\/?)*$/u.test(route.path)
      )
        throw new Error(
          `${path.relative(root, file)} route ${route.path || "<missing>"} must be a safe exact application path`,
        );
    }
    if (manifests.some(({ manifest: current }) => current.id === manifest.id))
      throw new Error(`Duplicate materialization pack ${manifest.id}`);
    manifests.push({ file, packRoot, manifest });
  }
  return manifests;
}

function renderRoutes(routes) {
  const lines = [
    "// Generated by scripts/materialize-blueprint.mjs. Do not edit by hand.",
    routes.length
      ? 'import { lazy, type ComponentType, type LazyExoticComponent } from "react";'
      : 'import type { ComponentType, LazyExoticComponent } from "react";',
    "",
    "export type CapabilityRoute = {",
    "  path: string;",
    "  Component: LazyExoticComponent<ComponentType>;",
    "};",
    "",
  ];
  routes.forEach((route, index) => {
    lines.push(`const CapabilityRoute${index} = lazy(async () => {`);
    lines.push(
      `  const module = await import(${JSON.stringify(route.module)});`,
    );
    lines.push(`  return { default: module.${route.export} };`);
    lines.push("});", "");
  });
  lines.push("export const capabilityRoutes: CapabilityRoute[] = [");
  routes.forEach((route, index) =>
    lines.push(
      `  { path: ${JSON.stringify(route.path)}, Component: CapabilityRoute${index} },`,
    ),
  );
  lines.push("];", "");
  return lines.join("\n");
}

function renderWorkerCapabilityRoutes(routes) {
  return [
    "// Generated by scripts/materialize-blueprint.mjs. Do not edit by hand.",
    `export const workerCapabilityRoutePaths = ${JSON.stringify(routes)} as const;`,
    "",
  ].join("\n");
}

function renderWorkerFeatures(entries) {
  const lines = [
    "// Generated by scripts/materialize-blueprint.mjs. Do not edit by hand.",
  ];
  entries.forEach((entry, index) =>
    lines.push(
      `import { ${entry.export} as workerFeature${index} } from ${JSON.stringify(entry.module)};`,
    ),
  );
  lines.push(
    "",
    `export const selectedWorkerFeatures = [${entries.map((_entry, index) => `workerFeature${index}`).join(", ")}];`,
    "",
  );
  return lines.join("\n");
}

function renderWorkerEvents(entries) {
  const lines = [
    "// Generated by scripts/materialize-blueprint.mjs. Do not edit by hand.",
    'import type { WorkerEventFeature } from "../worker-events";',
  ];
  entries.forEach((entry, index) =>
    lines.push(
      `import { ${entry.export} as workerEvent${index} } from ${JSON.stringify(entry.module)};`,
    ),
  );
  lines.push(
    "",
    `export const selectedWorkerEvents: WorkerEventFeature[] = [${entries.map((_entry, index) => `workerEvent${index}`).join(", ")}];`,
    "",
  );
  return lines.join("\n");
}

function renderStorageAdapter(storage) {
  const header = "// Generated by scripts/materialize-blueprint.mjs. Do not edit by hand.";
  const shared = [
    "export type StorageObject = { body: ReadableStream<Uint8Array>; contentType: string; size: number; etag: string | null };",
    "export type StorageAdapter = {",
    '  provider: "none" | "cloudflare-r2" | "s3-compatible";',
    "  bucket: string;",
    "  put(key: string, body: Uint8Array, contentType: string): Promise<{ etag: string | null }>;",
    "  get(key: string): Promise<StorageObject | null>;",
    "  delete(key: string): Promise<void>;",
    "};",
  ];
  if (storage.provider === "cloudflare-r2")
    return [
      header,
      'export type StorageRuntimeEnv = { OBJECTS: R2Bucket; STORAGE_PROVIDER: "cloudflare-r2"; STORAGE_BUCKET: string; STORAGE_ACCESS: string; STORAGE_MAX_UPLOAD_BYTES: string };',
      ...shared,
      "export function createStorageAdapter(env: StorageRuntimeEnv): StorageAdapter {",
      "  return {",
      '    provider: "cloudflare-r2",',
      "    bucket: env.STORAGE_BUCKET,",
      "    async put(key, body, contentType) {",
      "      const result = await env.OBJECTS.put(key, body, { httpMetadata: { contentType } });",
      "      return { etag: result.httpEtag || result.etag || null };",
      "    },",
      "    async get(key) {",
      "      const result = await env.OBJECTS.get(key);",
      "      if (!result) return null;",
      '      return { body: result.body, contentType: result.httpMetadata?.contentType || "application/octet-stream", size: result.size, etag: result.httpEtag || result.etag || null };',
      "    },",
      "    async delete(key) { await env.OBJECTS.delete(key); },",
      "  };",
      "}",
      "",
    ].join("\n");
  if (storage.provider === "s3-compatible")
    return [
      header,
      'import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";',
      'export type StorageRuntimeEnv = { STORAGE_PROVIDER: "s3-compatible"; STORAGE_BUCKET: string; STORAGE_ACCESS: string; STORAGE_MAX_UPLOAD_BYTES: string; S3_ENDPOINT: string; S3_REGION: string; S3_FORCE_PATH_STYLE: string; S3_ACCESS_KEY_ID: string; S3_SECRET_ACCESS_KEY: string };',
      ...shared,
      "export function createStorageAdapter(env: StorageRuntimeEnv): StorageAdapter {",
      "  const client = new S3Client({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, forcePathStyle: env.S3_FORCE_PATH_STYLE === \"true\", credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY } });",
      "  return {",
      '    provider: "s3-compatible",',
      "    bucket: env.STORAGE_BUCKET,",
      "    async put(key, body, contentType) {",
      "      const result = await client.send(new PutObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key, Body: body, ContentType: contentType }));",
      "      return { etag: result.ETag || null };",
      "    },",
      "    async get(key) {",
      "      try {",
      "        const result = await client.send(new GetObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }));",
      "        const body = result.Body?.transformToWebStream();",
      "        if (!body) return null;",
      '        return { body, contentType: result.ContentType || "application/octet-stream", size: result.ContentLength || 0, etag: result.ETag || null };',
      "      } catch (error) {",
      '        if (error && typeof error === "object" && "$metadata" in error && error.$metadata && typeof error.$metadata === "object" && "httpStatusCode" in error.$metadata && error.$metadata.httpStatusCode === 404) return null;',
      "        throw error;",
      "      }",
      "    },",
      "    async delete(key) { await client.send(new DeleteObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key })); },",
      "  };",
      "}",
      "",
    ].join("\n");
  return [
    header,
    "export type StorageRuntimeEnv = Record<string, never>;",
    ...shared,
    "export function createStorageAdapter(_env: StorageRuntimeEnv): StorageAdapter {",
    '  throw new Error("Object storage is not selected.");',
    "}",
    "",
  ].join("\n");
}

const workerFirstExpression = /^(\s*"run_worker_first"\s*:\s*)(\[[\s\S]*?\])/mu;

function readWorkerFirstRoutes(source) {
  const match = source.match(workerFirstExpression);
  if (!match)
    throw new Error(
      "assets.run_worker_first must remain a literal array for pack route materialization",
    );
  const routes = JSON.parse(match[2]);
  if (
    !Array.isArray(routes) ||
    routes.some((routePath) => typeof routePath !== "string")
  )
    throw new Error("assets.run_worker_first must contain only route strings");
  return routes;
}

function renderWorkerFirstConfig(source, routes) {
  const match = source.match(workerFirstExpression);
  if (!match)
    throw new Error(
      "assets.run_worker_first must remain a literal array for pack route materialization",
    );
  const indentation = match[1].match(/^\s*/u)?.[0] || "";
  const rendered = routes.length
    ? `[\n${routes.map((routePath) => `${indentation}  ${JSON.stringify(routePath)}`).join(",\n")}\n${indentation}]`
    : "[]";
  return source.replace(workerFirstExpression, `${match[1]}${rendered}`);
}

function renderCloudflareRuntimeConfig(source, configPath, previousRuntime) {
  const model = JSON.parse(source);
  const environment = configPath.includes(".development.") ? "development" : "production";
  const receiptDatabase = configureDatabaseRuntime(model, {
    provider: blueprint.providers.database.provider,
    environment,
    connection: blueprint.providers.database.cfpg[environment],
    previous: previousRuntime?.database,
    label: path.relative(root, configPath),
  });
  const r2Buckets = Array.isArray(model.r2_buckets) ? structuredClone(model.r2_buckets) : [];
  for (const previous of previousRuntime?.r2Buckets || []) {
    const index = r2Buckets.findIndex(
      (entry) => entry.binding === previous.binding && entry.bucket_name === previous.bucket,
    );
    if (index < 0)
      throw new Error(`${path.relative(root, configPath)} changed materializer-owned R2 binding ${previous.binding}`);
    r2Buckets.splice(index, 1);
  }
  model.vars ||= {};
  for (const [name, value] of Object.entries(previousRuntime?.storageVars || {})) {
    if (model.vars[name] !== value)
      throw new Error(`${path.relative(root, configPath)} changed materializer-owned storage variable ${name}`);
    delete model.vars[name];
  }
  for (const [name, value] of Object.entries(previousRuntime?.antiAbuseVars || {})) {
    if (model.vars[name] !== value)
      throw new Error(`${path.relative(root, configPath)} changed materializer-owned anti-abuse variable ${name}`);
    delete model.vars[name];
  }
  for (const [name, value] of Object.entries(previousRuntime?.aiVars || {})) {
    if (model.vars[name] !== value)
      throw new Error(`${path.relative(root, configPath)} changed materializer-owned AI variable ${name}`);
    delete model.vars[name];
  }
  if (previousRuntime?.aiBinding) {
    if (model.ai?.binding !== previousRuntime.aiBinding.binding)
      throw new Error(`${path.relative(root, configPath)} changed materializer-owned AI binding`);
    delete model.ai;
  }
  for (const [name, value] of Object.entries(previousRuntime?.vectorizeVars || {})) {
    if (model.vars[name] !== value)
      throw new Error(`${path.relative(root, configPath)} changed materializer-owned Vectorize variable ${name}`);
    delete model.vars[name];
  }
  for (const [name, value] of Object.entries(previousRuntime?.pushVars || {})) {
    if (model.vars[name] !== value)
      throw new Error(`${path.relative(root, configPath)} changed materializer-owned push variable ${name}`);
    delete model.vars[name];
  }
  for (const [name, value] of Object.entries(previousRuntime?.smsVars || {})) {
    if (model.vars[name] !== value)
      throw new Error(`${path.relative(root, configPath)} changed materializer-owned SMS variable ${name}`);
    delete model.vars[name];
  }
  const vectorize = Array.isArray(model.vectorize) ? structuredClone(model.vectorize) : [];
  if (previousRuntime?.vectorizeBinding) {
    const index = vectorize.findIndex(
      (entry) => entry.binding === previousRuntime.vectorizeBinding.binding && entry.index_name === previousRuntime.vectorizeBinding.indexName,
    );
    if (index < 0)
      throw new Error(`${path.relative(root, configPath)} changed materializer-owned Vectorize binding`);
    vectorize.splice(index, 1);
  }
  const storage = blueprint.providers.storage;
  const storageEnvironment = storage[environment];
  const storageVars = {};
  const setStorageVar = (name, value) => {
    model.vars[name] = String(value);
    storageVars[name] = String(value);
  };
  const receiptR2Buckets = [];
  if (storage.provider !== "none") {
    setStorageVar("STORAGE_PROVIDER", storage.provider);
    setStorageVar("STORAGE_BUCKET", storageEnvironment.bucket);
    setStorageVar("STORAGE_ACCESS", storage.access);
    setStorageVar("STORAGE_MAX_UPLOAD_BYTES", storage.maxUploadBytes);
    setStorageVar("STORAGE_PUBLIC_DOMAIN", storageEnvironment.publicDomain || "");
    if (storage.provider === "cloudflare-r2") {
      if (r2Buckets.some((entry) => entry.binding === "OBJECTS"))
        throw new Error(`${path.relative(root, configPath)} already owns R2 binding OBJECTS`);
      r2Buckets.push({ binding: "OBJECTS", bucket_name: storageEnvironment.bucket });
      receiptR2Buckets.push({ binding: "OBJECTS", bucket: storageEnvironment.bucket });
    } else {
      setStorageVar("S3_ENDPOINT", storageEnvironment.s3Endpoint);
      setStorageVar("S3_REGION", storageEnvironment.s3Region);
      setStorageVar("S3_FORCE_PATH_STYLE", storageEnvironment.s3ForcePathStyle);
    }
  }
  if (r2Buckets.length) model.r2_buckets = r2Buckets;
  else delete model.r2_buckets;
  const antiAbuseVars = {};
  if (blueprint.providers.antiAbuse.provider === "turnstile") {
    model.vars.TURNSTILE_PROVIDER = "turnstile";
    model.vars.TURNSTILE_SITE_KEY = blueprint.providers.antiAbuse[environment].siteKey;
    antiAbuseVars.TURNSTILE_PROVIDER = "turnstile";
    antiAbuseVars.TURNSTILE_SITE_KEY = blueprint.providers.antiAbuse[environment].siteKey;
  }
  const aiVars = {};
  let aiBinding = null;
  if (blueprint.providers.ai.provider === "workers-ai") {
    if (model.ai)
      throw new Error(`${path.relative(root, configPath)} already owns an AI binding`);
    model.ai = { binding: "AI" };
    aiBinding = { binding: "AI" };
    model.vars.AI_PROVIDER = "workers-ai";
    model.vars.AI_MODEL = blueprint.providers.ai[environment].model;
    model.vars.AI_GATEWAY_ID = blueprint.providers.ai[environment].gatewayId;
    aiVars.AI_PROVIDER = "workers-ai";
    aiVars.AI_MODEL = blueprint.providers.ai[environment].model;
    aiVars.AI_GATEWAY_ID = blueprint.providers.ai[environment].gatewayId;
  }
  const vectorizeVars = {};
  let vectorizeBinding = null;
  if (blueprint.providers.search.provider === "vectorize") {
    const search = blueprint.providers.search[environment];
    if (vectorize.some((entry) => entry.binding === "VECTOR_INDEX"))
      throw new Error(`${path.relative(root, configPath)} already owns Vectorize binding VECTOR_INDEX`);
    vectorize.push({ binding: "VECTOR_INDEX", index_name: search.indexName });
    vectorizeBinding = { binding: "VECTOR_INDEX", indexName: search.indexName };
    model.vars.SEARCH_PROVIDER = "vectorize";
    model.vars.VECTORIZE_INDEX_NAME = search.indexName;
    model.vars.VECTORIZE_DIMENSIONS = String(search.dimensions);
    model.vars.VECTORIZE_METRIC = search.metric;
    vectorizeVars.SEARCH_PROVIDER = "vectorize";
    vectorizeVars.VECTORIZE_INDEX_NAME = search.indexName;
    vectorizeVars.VECTORIZE_DIMENSIONS = String(search.dimensions);
    vectorizeVars.VECTORIZE_METRIC = search.metric;
  }
  if (vectorize.length) model.vectorize = vectorize;
  else delete model.vectorize;
  const pushVars = {};
  if (blueprint.providers.push.provider === "expo-push") {
    model.vars.PUSH_PROVIDER = "expo-push";
    model.vars.EXPO_PUSH_PROJECT_ID = blueprint.providers.push[environment].projectId;
    model.vars.EXPO_PUSH_ACCESS_TOKEN_REQUIRED = String(blueprint.providers.push.accessTokenRequired);
    pushVars.PUSH_PROVIDER = "expo-push";
    pushVars.EXPO_PUSH_PROJECT_ID = blueprint.providers.push[environment].projectId;
    pushVars.EXPO_PUSH_ACCESS_TOKEN_REQUIRED = String(blueprint.providers.push.accessTokenRequired);
  }
  const smsVars = {};
  if (blueprint.providers.sms.provider === "twilio") {
    model.vars.SMS_PROVIDER = "twilio";
    model.vars.TWILIO_API_BASE_URL = blueprint.providers.sms[environment].apiBaseUrl;
    smsVars.SMS_PROVIDER = "twilio";
    smsVars.TWILIO_API_BASE_URL = blueprint.providers.sms[environment].apiBaseUrl;
  }
  const queues = model.queues || { producers: [], consumers: [] };
  queues.producers ||= [];
  queues.consumers ||= [];
  const requiredSecrets = new Set(model.secrets?.required || []);

  for (const previous of previousRuntime?.queues || []) {
    const producerIndex = queues.producers.findIndex(
      (entry) =>
        entry.binding === previous.binding && entry.queue === previous.queue,
    );
    if (producerIndex < 0)
      throw new Error(
        `${path.relative(root, configPath)} changed materializer-owned Queue producer ${previous.binding}`,
      );
    queues.producers.splice(producerIndex, 1);
    const consumerIndex = queues.consumers.findIndex(
      (entry) => entry.queue === previous.queue,
    );
    if (consumerIndex < 0)
      throw new Error(
        `${path.relative(root, configPath)} changed materializer-owned Queue consumer ${previous.queue}`,
      );
    queues.consumers.splice(consumerIndex, 1);
  }
  for (const previous of previousRuntime?.requiredSecrets || []) {
    if (!requiredSecrets.has(previous))
      throw new Error(
        `${path.relative(root, configPath)} changed materializer-owned secret requirement ${previous}`,
      );
    requiredSecrets.delete(previous);
  }

  const receipt = {
    queues: [],
    requiredSecrets: [],
    database: receiptDatabase,
    antiAbuseVars,
    aiBinding,
    aiVars,
    vectorizeBinding,
    vectorizeVars,
    pushVars,
    smsVars,
    r2Buckets: receiptR2Buckets,
    storageVars,
  };
  for (const [binding, declaration] of desiredCloudflareQueues) {
    if (queues.producers.some((entry) => entry.binding === binding))
      throw new Error(
        `${path.relative(root, configPath)} already owns Queue binding ${binding}`,
      );
    const queueName = `${model.name}-${declaration.suffix}`;
    if (queues.consumers.some((entry) => entry.queue === queueName))
      throw new Error(
        `${path.relative(root, configPath)} already consumes Queue ${queueName}`,
      );
    queues.producers.push({ binding, queue: queueName });
    queues.consumers.push({
      queue: queueName,
      ...(declaration.maxBatchSize === undefined
        ? {}
        : { max_batch_size: declaration.maxBatchSize }),
      ...(declaration.maxBatchTimeout === undefined
        ? {}
        : { max_batch_timeout: declaration.maxBatchTimeout }),
      ...(declaration.maxRetries === undefined
        ? {}
        : { max_retries: declaration.maxRetries }),
      ...(declaration.retryDelay === undefined
        ? {}
        : { retry_delay: declaration.retryDelay }),
      ...(declaration.maxConcurrency === undefined
        ? {}
        : { max_concurrency: declaration.maxConcurrency }),
    });
    receipt.queues.push({ binding, queue: queueName });
  }
  for (const secret of desiredCloudflareSecrets.keys()) {
    requiredSecrets.add(secret);
    receipt.requiredSecrets.push(secret);
  }

  if (queues.producers.length || queues.consumers.length) model.queues = queues;
  else delete model.queues;
  if (requiredSecrets.size) {
    model.secrets ||= {};
    model.secrets.required = [...requiredSecrets].sort();
  } else if (model.secrets) {
    delete model.secrets.required;
    if (!Object.keys(model.secrets).length) delete model.secrets;
  }
  return { source: json(model), receipt };
}

function renderServerAuthPlugins(entries, features) {
  const lines = [
    "// Generated by scripts/materialize-blueprint.mjs. Do not edit by hand.",
    'import type { Pool } from "pg";',
    'import type { AuthEmail } from "../auth-config";',
  ];
  entries.forEach((entry, index) =>
    lines.push(
      `import { ${entry.export} as createAuthPlugin${index} } from ${JSON.stringify(entry.module)};`,
    ),
  );
  lines.push(
    "",
    "export type SelectedAuthPluginInput = {",
    "  appName: string;",
    "  baseURL: string;",
    "  appEnvironment: string;",
    "  database: Pool;",
    "  enqueueEmail: (email: AuthEmail) => Promise<void>;",
    "  stripeSecretKey?: string;",
    "  stripeWebhookSecret?: string;",
    "  stripePricePro?: string;",
    "  turnstileSecretKey?: string;",
    "};",
    "",
    `export const selectedAuthFeatures = ${JSON.stringify(features)} as const;`,
    "",
    "export function createSelectedAuthPlugins(input: SelectedAuthPluginInput) {",
    "  return [",
  );
  entries.forEach((entry, index) =>
    lines.push(`    createAuthPlugin${index}(input, selectedAuthFeatures),`),
  );
  lines.push("  ];", "}", "");
  return lines.join("\n");
}

function renderClientAuthPlugins(entries) {
  const lines = [
    "// Generated by scripts/materialize-blueprint.mjs. Do not edit by hand.",
  ];
  entries.forEach((entry, index) =>
    lines.push(
      `import { ${entry.export} as createAuthClientPlugin${index} } from ${JSON.stringify(entry.module)};`,
    ),
  );
  lines.push(
    "",
    "export function createSelectedAuthClientPlugins() {",
    "  return [",
  );
  entries.forEach((_entry, index) =>
    lines.push(`    createAuthClientPlugin${index}(),`),
  );
  lines.push("  ];", "}", "");
  return lines.join("\n");
}

function renderMarketingProject(
  blueprint,
  pageCatalog,
  selectedPacks,
  selectedPages,
) {
  const pages = pageCatalog.pages
    .filter(({ id }) => selectedPages.has(id))
    .map(({ id, route, renderer }) => ({ id, route, renderer }));
  const value = {
    name: blueprint.project.name,
    slug: blueprint.project.slug,
    brief: blueprint.project.brief,
    defaultLocale: blueprint.project.defaultLocale,
    locales: blueprint.project.locales,
    platforms: blueprint.project.platforms,
    designProfile: blueprint.designProfile,
    stylekit: blueprint.stylekit,
    pages,
    publicPageCount: pages.filter(({ renderer }) => renderer === "astro-static")
      .length,
    selectedPackCount: selectedPacks.size,
    billingSelected: selectedPacks.has("saas.billing-stripe"),
  };
  return [
    "// Generated by scripts/materialize-blueprint.mjs. Do not edit by hand.",
    `export const project = ${JSON.stringify(value, null, 2)} as const;`,
    "const selectedPageIds = new Set<string>(project.pages.map(({ id }) => id));",
    "export function routeSelected(id: string) { return selectedPageIds.has(id); }",
    "",
  ].join("\n");
}

const blueprint = JSON.parse(await readFile(blueprintPath, "utf8"));
const state = await readState();
const starterManifest = JSON.parse(
  await readFile(path.join(root, "starter.manifest.json"), "utf8"),
);
const catalog = JSON.parse(
  await readFile(path.join(root, "catalog/catalog.json"), "utf8"),
);
const designCatalog = JSON.parse(
  await readFile(path.join(root, "design/catalog.json"), "utf8"),
);
const pageCatalog = JSON.parse(
  await readFile(path.join(root, "pages/catalog.json"), "utf8"),
);
const stylekitCatalog = JSON.parse(
  await readFile(
    path.join(root, "design/stylekit/source-catalog.json"),
    "utf8",
  ),
);
if (!/^[a-z0-9][a-z0-9-]*$/u.test(blueprint.stylekit?.slug || ""))
  throw new Error("Blueprint StyleKit slug is invalid");
const stylekitSnapshotSource = await readFile(
  path.join(root, "design/stylekit", blueprint.stylekit.slug, "snapshot.json"),
  "utf8",
);
const stylekitSnapshot = JSON.parse(stylekitSnapshotSource);
const stylekitSnapshotHash = sha256(stylekitSnapshotSource);
const catalogPacks = new Map(catalog.packs.map((pack) => [pack.id, pack]));
const selected = new Set(
  Object.values(blueprint.selections)
    .flat()
    .filter(({ lifecycle }) => lifecycle.selected)
    .map(({ id }) => id),
);
const selectedPages = new Set(blueprint.pageSet.selected);
const pageDefinitions = new Map(
  pageCatalog.pages.map((page) => [page.id, page]),
);
const selectedProfile = designCatalog.profiles.find(
  ({ id }) => id === blueprint.designProfile.id,
);
const selectedDesignPackId = blueprint.stylekit?.slug
  ? "design.stylekit-adapted"
  : selectedProfile?.packId;
if (!selectedDesignPackId)
  throw new Error(
    `Selected Design Profile ${blueprint.designProfile.id}@${blueprint.designProfile.version} is missing from the Design Catalog`,
  );
const manifests = await readPackManifests();
const contractFailures = validateAssemblyContracts(
  starterManifest,
  blueprint,
  catalog,
  designCatalog,
  pageCatalog,
  {
    catalog: stylekitCatalog,
    snapshot: stylekitSnapshot,
    snapshotHash: stylekitSnapshotHash,
  },
);
if (contractFailures.length)
  throw new Error(
    `Assembly contract failed:\n- ${contractFailures.join("\n- ")}`,
  );
const deliveryFailures = validateMaterializerDeliveryContracts(
  catalog,
  manifests,
);
if (deliveryFailures.length)
  throw new Error(
    `Materializer delivery contract failed:\n- ${deliveryFailures.join("\n- ")}`,
  );
const selectedManifests = manifests.filter(({ manifest }) =>
  selected.has(manifest.id),
);
const desiredFiles = new Map();
const desiredDependencies = new Map();
const desiredRoutes = [];
const desiredServerAuthPlugins = [];
const desiredClientAuthPlugins = [];
const desiredWorkerFeatures = [];
const desiredWorkerEvents = [];
const desiredMobileConfigPlugins = new Set();
const desiredCloudflareSecrets = new Map();
const desiredCloudflareQueues = new Map();

if (blueprint.providers.database.provider === "cfpg") {
  for (const environment of ["development", "production"])
    if (!blueprint.providers.database.cfpg?.[environment])
      throw new Error(
        `CFPG ${environment} connection command must be saved before materialization.`,
      );
  desiredDependencies.set(
    `workers/app/package.json|dependencies|${CFPG_CONNECTOR_PACKAGE}`,
    {
      packageFile: "workers/app/package.json",
      section: "dependencies",
      name: CFPG_CONNECTOR_PACKAGE,
      version: CFPG_CONNECTOR_VERSION,
      packId: "provider.database.cfpg",
    },
  );
}
if (blueprint.providers.storage.provider === "s3-compatible") {
  desiredDependencies.set(
    "workers/app/package.json|dependencies|@aws-sdk/client-s3",
    {
      packageFile: "workers/app/package.json",
      section: "dependencies",
      name: "@aws-sdk/client-s3",
      version: "3.1116.0",
      packId: "capability.object-storage",
    },
  );
}

for (const { file, packRoot, manifest } of manifests) {
  const catalogPack = catalogPacks.get(manifest.id);
  if (!catalogPack)
    throw new Error(
      `${path.relative(root, file)} references a pack missing from the Catalog`,
    );
  if (catalogPack.version !== manifest.version)
    throw new Error(
      `${manifest.id} manifest version ${manifest.version} does not match Catalog version ${catalogPack.version}`,
    );
  for (const pageId of Object.keys(manifest.pageFiles || {})) {
    const page = pageDefinitions.get(pageId);
    if (!page)
      throw new Error(
        `${manifest.id} references missing Page Catalog entry ${pageId}`,
      );
    if (page.packId !== manifest.id)
      throw new Error(
        `${manifest.id} cannot own ${pageId}, which belongs to ${page.packId}`,
      );
  }
}

async function addDesiredFile(packRoot, manifest, entry) {
  const target = path.relative(
    root,
    safeProjectPath(entry.target, `${manifest.id} target`),
  );
  if (desiredFiles.has(target))
    throw new Error(`Materialization file collision at ${target}`);
  const source = safePackPath(packRoot, entry.source, `${manifest.id} source`);
  desiredFiles.set(target, {
    packId: manifest.id,
    version: manifest.version,
    content: await readFile(source, "utf8"),
  });
}

for (const { packRoot, manifest } of selectedManifests) {
  for (const requiredPack of manifest.requiresPacks || [])
    if (!selected.has(requiredPack))
      throw new Error(`${manifest.id} requires selected pack ${requiredPack}`);
  for (const entry of manifest.files)
    await addDesiredFile(packRoot, manifest, entry);
  for (const [pageId, entries] of Object.entries(manifest.pageFiles || {}))
    if (selectedPages.has(pageId))
      for (const entry of entries)
        await addDesiredFile(packRoot, manifest, entry);
  for (const dependency of manifest.dependencies) {
    safeProjectPath(dependency.packageFile, `${manifest.id} packageFile`);
    const key = [
      dependency.packageFile,
      dependency.section,
      dependency.name,
    ].join("|");
    const current = desiredDependencies.get(key);
    if (current && current.version !== dependency.version)
      throw new Error(`Dependency version collision for ${dependency.name}`);
    desiredDependencies.set(key, { ...dependency, packId: manifest.id });
  }
  for (const route of manifest.routes) {
    if (desiredRoutes.some(({ path: current }) => current === route.path))
      throw new Error(`Capability route collision at ${route.path}`);
    desiredRoutes.push({ ...route, packId: manifest.id });
  }
  if (manifest.authPlugins?.server)
    desiredServerAuthPlugins.push({
      ...manifest.authPlugins.server,
      packId: manifest.id,
    });
  if (manifest.authPlugins?.client)
    desiredClientAuthPlugins.push({
      ...manifest.authPlugins.client,
      packId: manifest.id,
    });
  if (manifest.workerFeature)
    desiredWorkerFeatures.push({
      ...manifest.workerFeature,
      packId: manifest.id,
    });
  if (manifest.workerEvents)
    desiredWorkerEvents.push({
      ...manifest.workerEvents,
      packId: manifest.id,
    });
  for (const plugin of manifest.mobileConfigPlugins || [])
    desiredMobileConfigPlugins.add(plugin);
  for (const secret of manifest.cloudflare?.requiredSecrets || []) {
    const owner = desiredCloudflareSecrets.get(secret);
    if (owner && owner !== manifest.id)
      throw new Error(`Cloudflare secret ${secret} is owned by multiple packs`);
    desiredCloudflareSecrets.set(secret, manifest.id);
  }
  for (const queue of manifest.cloudflare?.queues || []) {
    if (desiredCloudflareQueues.has(queue.binding))
      throw new Error(`Cloudflare Queue binding collision at ${queue.binding}`);
    desiredCloudflareQueues.set(queue.binding, {
      ...queue,
      packId: manifest.id,
    });
  }
}

const storagePackSelected = selected.has("capability.object-storage");
if (storagePackSelected !== (blueprint.providers.storage.provider !== "none"))
  throw new Error(
    "Object Storage Pack selection must match the Blueprint storage Provider.",
  );
if (blueprint.providers.storage.provider === "s3-compatible") {
  for (const secret of ["S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"])
    desiredCloudflareSecrets.set(secret, "capability.object-storage");
}
const turnstilePackSelected = selected.has("capability.turnstile");
if (turnstilePackSelected !== (blueprint.providers.antiAbuse.provider === "turnstile"))
  throw new Error(
    "Turnstile Pack selection must match the Blueprint anti-abuse Provider.",
  );
const workersAiPackSelected = selected.has("capability.workers-ai");
if (workersAiPackSelected !== (blueprint.providers.ai.provider === "workers-ai"))
  throw new Error(
    "Workers AI Pack selection must match the Blueprint AI Provider.",
  );
const vectorizePackSelected = selected.has("capability.vectorize");
if (vectorizePackSelected !== (blueprint.providers.search.provider === "vectorize"))
  throw new Error(
    "Vectorize Pack selection must match the Blueprint search Provider.",
  );
const expoPushPackSelected = selected.has("capability.expo-push");
if (expoPushPackSelected !== (blueprint.providers.push.provider === "expo-push"))
  throw new Error(
    "Expo Push Pack selection must match the Blueprint push Provider.",
  );
if (expoPushPackSelected && blueprint.providers.push.accessTokenRequired)
  desiredCloudflareSecrets.set("EXPO_PUSH_ACCESS_TOKEN", "capability.expo-push");
const twilioSmsPackSelected = selected.has("capability.twilio-sms");
if (twilioSmsPackSelected !== (blueprint.providers.sms.provider === "twilio"))
  throw new Error(
    "Twilio SMS Pack selection must match the Blueprint SMS Provider.",
  );

desiredRoutes.sort((left, right) => left.path.localeCompare(right.path));
const desiredWorkerFirstRoutes = desiredRoutes
  .filter(({ workerFirst }) => workerFirst)
  .map(({ path: routePath }) => routePath);
const desiredRouteSource = renderRoutes(desiredRoutes);
const desiredWorkerCapabilityRouteSource = renderWorkerCapabilityRoutes(
  desiredWorkerFirstRoutes,
);
const desiredAuthFeatures = {
  organizations: selected.has("saas.team-organizations"),
  stripeBilling: selected.has("saas.billing-stripe"),
  apiKeys: selected.has("saas.api-keys"),
  twoFactor: selected.has("saas.account-security-2fa"),
  turnstile: selected.has("capability.turnstile"),
};
const desiredServerAuthSource = renderServerAuthPlugins(
  desiredServerAuthPlugins,
  desiredAuthFeatures,
);
const desiredClientAuthSource = renderClientAuthPlugins(
  desiredClientAuthPlugins,
);
const desiredWorkerFeatureSource = renderWorkerFeatures(desiredWorkerFeatures);
const desiredWorkerEventSource = renderWorkerEvents(desiredWorkerEvents);
const desiredMobileConfigPluginSource = `${JSON.stringify([...desiredMobileConfigPlugins].sort(), null, 2)}\n`;
const desiredStorageAdapterSource = renderStorageAdapter(
  blueprint.providers.storage,
);
const desiredDesignCSS = blueprint.stylekit?.slug
  ? renderStyleKitCSS(stylekitSnapshot)
  : renderDesignCSS(selectedProfile);
const desiredWebStyleAdapterCSS = blueprint.stylekit?.slug
  ? renderStyleKitAdapterCSS(stylekitSnapshot, "web")
  : "/* No StyleKit component adapter selected. */\n";
const desiredMarketingStyleAdapterCSS = blueprint.stylekit?.slug
  ? renderStyleKitAdapterCSS(stylekitSnapshot, "marketing")
  : "/* No StyleKit component adapter selected. */\n";
const desiredDocsStyleAdapterCSS = blueprint.stylekit?.slug
  ? renderStyleKitAdapterCSS(stylekitSnapshot, "docs")
  : "/* No StyleKit component adapter selected. */\n";
const desiredMobileDesign = blueprint.stylekit?.slug
  ? renderStyleKitMobile(stylekitSnapshot)
  : renderMobileDesign(selectedProfile);
const desiredMarketingProject = renderMarketingProject(
  blueprint,
  pageCatalog,
  selected,
  selectedPages,
);
const changes = [];
const failures = [];
const previousFiles = new Map(
  Object.entries(state.packs || {}).flatMap(([packId, pack]) =>
    Object.entries(pack.files || {}).map(([target, hash]) => [
      target,
      { packId, hash },
    ]),
  ),
);

for (const [target, desired] of desiredFiles) {
  const current = await optionalRead(
    safeProjectPath(target, "materialized target"),
  );
  if (current === desired.content) continue;
  const previous = previousFiles.get(target);
  if (current !== null && (!previous || sha256(current) !== previous.hash))
    failures.push(
      `${target} exists outside the matching materialization receipt`,
    );
  else
    changes.push({
      kind: current === null ? "add-file" : "update-file",
      target,
      packId: desired.packId,
    });
}

for (const [target, previous] of previousFiles) {
  if (desiredFiles.has(target)) continue;
  const current = await optionalRead(safeProjectPath(target, "owned target"));
  if (current === null) continue;
  if (sha256(current) !== previous.hash)
    failures.push(
      `${target} changed after materialization and cannot be removed automatically`,
    );
  else changes.push({ kind: "remove-file", target, packId: previous.packId });
}

const packageModels = new Map();
for (const dependency of [
  ...desiredDependencies.values(),
  ...Object.values(state.dependencies || {}),
]) {
  if (!packageModels.has(dependency.packageFile))
    packageModels.set(
      dependency.packageFile,
      JSON.parse(
        await readFile(
          safeProjectPath(dependency.packageFile, "packageFile"),
          "utf8",
        ),
      ),
    );
}
for (const [key, desired] of desiredDependencies) {
  const model = packageModels.get(desired.packageFile);
  const current = model?.[desired.section]?.[desired.name];
  if (current === desired.version) continue;
  const previous = state.dependencies?.[key];
  if (current !== undefined && (!previous || current !== previous.version))
    failures.push(
      `${desired.packageFile} already owns ${desired.name}@${current}`,
    );
  else
    changes.push({
      kind: current === undefined ? "add-dependency" : "update-dependency",
      target: `${desired.packageFile}:${desired.name}`,
      packId: desired.packId,
    });
}
for (const [key, previous] of Object.entries(state.dependencies || {})) {
  if (desiredDependencies.has(key)) continue;
  const model = packageModels.get(previous.packageFile);
  const current = model?.[previous.section]?.[previous.name];
  if (current === undefined) continue;
  if (current !== previous.version)
    failures.push(
      `${previous.packageFile} changed ${previous.name} after materialization and cannot remove it automatically`,
    );
  else
    changes.push({
      kind: "remove-dependency",
      target: `${previous.packageFile}:${previous.name}`,
      packId: previous.packId,
    });
}

const currentRouteSource = await optionalRead(routeRegistryPath);
if (currentRouteSource !== desiredRouteSource) {
  const baseline = renderRoutes([]);
  const safeCurrent = state.generatedRoutesHash
    ? sha256(currentRouteSource || "") === state.generatedRoutesHash
    : currentRouteSource === baseline;
  if (!safeCurrent)
    failures.push(
      `${path.relative(root, routeRegistryPath)} changed outside the materializer`,
    );
  else
    changes.push({
      kind: "update-route-registry",
      target: path.relative(root, routeRegistryPath),
    });
}

const previousWorkerFirstRoutes = new Set(
  state.generatedWorkerFirstRoutes || [],
);
const workerFirstRegistries = [];
const desiredCloudflareConfigReceipts = {};
for (const configPath of workerFirstConfigPaths) {
  const current = await readFile(configPath, "utf8");
  let currentRoutes;
  try {
    currentRoutes = readWorkerFirstRoutes(current);
  } catch (error) {
    failures.push(`${path.relative(root, configPath)} ${error.message}`);
    continue;
  }
  const baseRoutes = currentRoutes.filter(
    (routePath) => !previousWorkerFirstRoutes.has(routePath),
  );
  const routes = [
    ...baseRoutes,
    ...desiredWorkerFirstRoutes.filter(
      (routePath) => !baseRoutes.includes(routePath),
    ),
  ];
  let desired = renderWorkerFirstConfig(current, routes);
  const relativeConfigPath = path.relative(root, configPath);
  try {
    const runtime = renderCloudflareRuntimeConfig(
      desired,
      configPath,
      state.generatedCloudflareConfigs?.[relativeConfigPath],
    );
    desired = runtime.source;
    desiredCloudflareConfigReceipts[relativeConfigPath] = runtime.receipt;
  } catch (error) {
    failures.push(error.message);
    continue;
  }
  workerFirstRegistries.push({ path: configPath, desired });
  if (current !== desired)
    changes.push({
      kind: "update-worker-first-routes",
      target: path.relative(root, configPath),
    });
}

const generatedRegistries = [
  {
    path: workerCapabilityRoutesPath,
    desired: desiredWorkerCapabilityRouteSource,
    stateKey: "generatedWorkerCapabilityRoutesHash",
    baseline: renderWorkerCapabilityRoutes([]),
  },
  {
    path: serverAuthRegistryPath,
    desired: desiredServerAuthSource,
    stateKey: "generatedAuthServerHash",
    baseline: renderServerAuthPlugins([], {
      organizations: false,
      stripeBilling: false,
      apiKeys: false,
      twoFactor: false,
      turnstile: false,
    }),
  },
  {
    path: clientAuthRegistryPath,
    desired: desiredClientAuthSource,
    stateKey: "generatedAuthClientHash",
    baseline: renderClientAuthPlugins([]),
  },
  {
    path: workerFeatureRegistryPath,
    desired: desiredWorkerFeatureSource,
    stateKey: "generatedWorkerFeaturesHash",
    baseline: renderWorkerFeatures([]),
  },
  {
    path: workerEventRegistryPath,
    desired: desiredWorkerEventSource,
    stateKey: "generatedWorkerEventsHash",
    baseline: renderWorkerEvents([]),
  },
  {
    path: storageAdapterPath,
    desired: desiredStorageAdapterSource,
    stateKey: "generatedStorageAdapterHash",
    baseline: renderStorageAdapter({ provider: "none" }),
    packId: storagePackSelected ? "capability.object-storage" : undefined,
  },
  {
    path: mobileConfigPluginsPath,
    desired: desiredMobileConfigPluginSource,
    stateKey: "generatedMobileConfigPluginsHash",
    baseline: "[]\n",
  },
  {
    path: webDesignPath,
    desired: desiredDesignCSS,
    stateKey: "generatedDesignWebHash",
    baseline: null,
    packId: selectedDesignPackId,
  },
  {
    path: marketingDesignPath,
    desired: desiredDesignCSS,
    stateKey: "generatedDesignMarketingHash",
    baseline: null,
    packId: selectedDesignPackId,
  },
  {
    path: docsDesignPath,
    desired: desiredDesignCSS,
    stateKey: "generatedDesignDocsHash",
    baseline: null,
    packId: selectedDesignPackId,
  },
  {
    path: webStyleAdapterPath,
    desired: desiredWebStyleAdapterCSS,
    stateKey: "generatedStyleAdapterWebHash",
    baseline: null,
    packId: selectedDesignPackId,
  },
  {
    path: marketingStyleAdapterPath,
    desired: desiredMarketingStyleAdapterCSS,
    stateKey: "generatedStyleAdapterMarketingHash",
    baseline: null,
    packId: selectedDesignPackId,
  },
  {
    path: docsStyleAdapterPath,
    desired: desiredDocsStyleAdapterCSS,
    stateKey: "generatedStyleAdapterDocsHash",
    baseline: null,
    packId: selectedDesignPackId,
  },
  {
    path: mobileDesignPath,
    desired: desiredMobileDesign,
    stateKey: "generatedDesignMobileHash",
    baseline: null,
    packId: selectedDesignPackId,
  },
  {
    path: marketingProjectPath,
    desired: desiredMarketingProject,
    stateKey: "generatedMarketingProjectHash",
    baseline: null,
    packId: "page.core-product-site",
  },
];
for (const registry of generatedRegistries) {
  const current = await optionalRead(registry.path);
  if (current === registry.desired) continue;
  const safeCurrent = state[registry.stateKey]
    ? sha256(current || "") === state[registry.stateKey]
    : current === registry.baseline;
  if (!safeCurrent)
    failures.push(
      `${path.relative(root, registry.path)} changed outside the materializer`,
    );
  else
    changes.push({
      kind: "update-generated-artifact",
      target: path.relative(root, registry.path),
      ...(registry.packId ? { packId: registry.packId } : {}),
    });
}

const desiredState = {
  schemaVersion: "starter-materialization/v1",
  packs: {},
  dependencies: Object.fromEntries(desiredDependencies),
  generatedRoutesHash: sha256(desiredRouteSource),
  generatedWorkerFirstRoutes: desiredWorkerFirstRoutes,
  generatedWorkerCapabilityRoutesHash: sha256(
    desiredWorkerCapabilityRouteSource,
  ),
  generatedAuthServerHash: sha256(desiredServerAuthSource),
  generatedAuthClientHash: sha256(desiredClientAuthSource),
  generatedWorkerFeaturesHash: sha256(desiredWorkerFeatureSource),
  generatedWorkerEventsHash: sha256(desiredWorkerEventSource),
  generatedStorageAdapterHash: sha256(desiredStorageAdapterSource),
  generatedMobileConfigPluginsHash: sha256(desiredMobileConfigPluginSource),
  generatedCloudflareConfigs: desiredCloudflareConfigReceipts,
  generatedDesignWebHash: sha256(desiredDesignCSS),
  generatedDesignMarketingHash: sha256(desiredDesignCSS),
  generatedDesignDocsHash: sha256(desiredDesignCSS),
  generatedStyleAdapterWebHash: sha256(desiredWebStyleAdapterCSS),
  generatedStyleAdapterMarketingHash: sha256(desiredMarketingStyleAdapterCSS),
  generatedStyleAdapterDocsHash: sha256(desiredDocsStyleAdapterCSS),
  generatedDesignMobileHash: sha256(desiredMobileDesign),
  generatedMarketingProjectHash: sha256(desiredMarketingProject),
};
for (const { manifest } of selectedManifests)
  desiredState.packs[manifest.id] = { version: manifest.version, files: {} };
for (const [target, desired] of desiredFiles)
  desiredState.packs[desired.packId].files[target] = sha256(desired.content);
if (JSON.stringify(state) !== JSON.stringify(desiredState))
  changes.push({
    kind: "update-receipt",
    target: path.relative(root, statePath),
  });

for (const { manifest } of manifests) {
  const selection = Object.values(blueprint.selections)
    .flat()
    .find(({ id }) => id === manifest.id);
  if (!selection)
    throw new Error(`Blueprint is missing materializable pack ${manifest.id}`);
  const shouldBeMaterialized = selected.has(manifest.id);
  if (
    selection.lifecycle.materialized !== shouldBeMaterialized ||
    (!shouldBeMaterialized && Object.values(selection.lifecycle).some(Boolean))
  )
    changes.push({
      kind: "update-lifecycle",
      target: manifest.id,
      packId: manifest.id,
    });
}

if (failures.length) {
  console.error(json({ ok: false, failures, changes }));
  process.exit(1);
}
if (check && changes.length) {
  console.error(json({ ok: false, drift: changes }));
  process.exit(1);
}
if (!apply) {
  console.log(
    json({
      ok: true,
      mode: check ? "check" : "plan",
      selectedPacks: selectedManifests.map(({ manifest }) => manifest.id),
      changes,
    }),
  );
  process.exit(0);
}
if (!changes.length) {
  console.log(
    json({
      ok: true,
      mode: "apply",
      selectedPacks: selectedManifests.map(({ manifest }) => manifest.id),
      changes,
    }),
  );
  process.exit(0);
}

const touchedPaths = new Set([
  blueprintPath,
  routeRegistryPath,
  ...workerFirstRegistries.map(({ path: file }) => file),
  ...generatedRegistries.map(({ path: file }) => file),
  statePath,
  packageLockPath,
]);
for (const target of new Set([...desiredFiles.keys(), ...previousFiles.keys()]))
  touchedPaths.add(safeProjectPath(target, "materialization target"));
for (const packageFile of packageModels.keys())
  touchedPaths.add(safeProjectPath(packageFile, "packageFile"));
const backups = new Map();
for (const file of touchedPaths) backups.set(file, await optionalRead(file));

async function restore() {
  for (const [file, content] of backups) {
    if (content === null)
      await unlink(file).catch((error) => {
        if (error?.code !== "ENOENT") throw error;
      });
    else {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, content);
    }
  }
}

try {
  for (const [target, desired] of desiredFiles) {
    const file = safeProjectPath(target, "materialized target");
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, desired.content);
  }
  for (const target of previousFiles.keys()) {
    if (!desiredFiles.has(target))
      await unlink(safeProjectPath(target, "owned target")).catch((error) => {
        if (error?.code !== "ENOENT") throw error;
      });
  }

  for (const [key, desired] of desiredDependencies) {
    const model = packageModels.get(desired.packageFile);
    model[desired.section] ||= {};
    model[desired.section][desired.name] = desired.version;
  }
  for (const [key, previous] of Object.entries(state.dependencies || {})) {
    if (!desiredDependencies.has(key))
      delete packageModels.get(previous.packageFile)?.[previous.section]?.[
        previous.name
      ];
  }
  for (const [packageFile, model] of packageModels) {
    for (const section of ["dependencies", "devDependencies"])
      if (model[section])
        model[section] = Object.fromEntries(
          Object.entries(model[section]).sort(([left], [right]) =>
            left.localeCompare(right),
          ),
        );
    await writeFile(safeProjectPath(packageFile, "packageFile"), json(model));
  }
  await writeFile(routeRegistryPath, desiredRouteSource);
  for (const registry of workerFirstRegistries)
    await writeFile(registry.path, registry.desired);
  for (const registry of generatedRegistries) {
    await mkdir(path.dirname(registry.path), { recursive: true });
    await writeFile(registry.path, registry.desired);
  }

  for (const { manifest } of manifests) {
    const selection = Object.values(blueprint.selections)
      .flat()
      .find(({ id }) => id === manifest.id);
    const invalidated =
      changes.some(({ packId }) => packId === manifest.id) ||
      state.packs?.[manifest.id]?.version !== manifest.version;
    if (selected.has(manifest.id))
      selection.lifecycle = {
        ...selection.lifecycle,
        selected: true,
        materialized: true,
        localVerified: invalidated ? false : selection.lifecycle.localVerified,
        developmentVerified: invalidated
          ? false
          : selection.lifecycle.developmentVerified,
        productionReleased: invalidated
          ? false
          : selection.lifecycle.productionReleased,
      };
    else
      selection.lifecycle = {
        selected: false,
        materialized: false,
        localVerified: false,
        developmentVerified: false,
        productionReleased: false,
      };
  }
  await writeFile(blueprintPath, json(blueprint));

  if (packageModels.size) {
    const install = spawnSync(
      "npm",
      ["install", "--ignore-scripts", "--no-audit", "--no-fund"],
      { cwd: root, encoding: "utf8" },
    );
    if (install.status !== 0)
      throw new Error(
        `npm install failed\n${install.stderr || install.stdout}`,
      );
  }

  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(statePath, json(desiredState));
  const knowledge = spawnSync(
    process.execPath,
    [path.join(root, "scripts/build-dp.mjs")],
    { cwd: root, encoding: "utf8" },
  );
  if (knowledge.status !== 0)
    throw new Error(
      `knowledge sync failed\n${knowledge.stderr || knowledge.stdout}`,
    );
  console.log(
    json({
      ok: true,
      mode: "apply",
      selectedPacks: selectedManifests.map(({ manifest }) => manifest.id),
      changes,
    }),
  );
} catch (error) {
  await restore();
  throw error;
}
