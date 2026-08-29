import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { gunzipSync, gzipSync } from "node:zlib";
import os from "node:os";
import path from "node:path";

const projectRoot = process.cwd();
const command = process.argv.slice(2).find((value) => !value.startsWith("--")) || "status";
const receiptPath = path.join(projectRoot, ".starter/source.json");
const materializationPath = path.join(projectRoot, ".starter/materialization.json");
const localAuthPath = path.join(projectRoot, ".starter/update-auth.local.json");
const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const maxArtifactBytes = 96 * 1024 * 1024;

function safeRelativePath(value) {
  const normalized = String(value || "").replaceAll("\\", "/");
  if (!normalized || path.posix.isAbsolute(normalized) || normalized.split("/").includes("..")) return null;
  return normalized;
}

async function createUpdateBackup(plan) {
  const materialization = JSON.parse(await readFile(materializationPath, "utf8"));
  const paths = new Set([".starter/source.json", ".starter/materialization.json", "starter.blueprint.json", "package-lock.json"]);
  for (const pack of Object.values(materialization.packs || {})) for (const file of Object.keys(pack.files || {})) paths.add(file);
  for (const dependency of Object.values(materialization.dependencies || {})) paths.add(dependency.packageFile);
  for (const change of plan.changes || []) {
    const target = String(change.target || "");
    paths.add(target.match(/^(.+\.json):[^/]+$/u)?.[1] || target);
  }
  const files = {};
  for (const relative of paths) {
    const safe = safeRelativePath(relative);
    if (!safe || safe.includes(":")) continue;
    files[safe] = await readFile(path.join(projectRoot, safe)).then((bytes) => Buffer.from(bytes).toString("base64"), () => null);
  }
  const backupRoot = path.join(projectRoot, ".starter/backups");
  await mkdir(backupRoot, { recursive: true });
  const backupPath = path.join(backupRoot, `pre-update-${Date.now()}.json.gz`);
  await writeFile(backupPath, gzipSync(Buffer.from(JSON.stringify({ schemaVersion: "starter-update-backup/v1", createdAt: new Date().toISOString(), files }))), { mode: 0o600 });
  return backupPath;
}

async function restoreUpdateBackup(backupPath) {
  const backup = JSON.parse(gunzipSync(await readFile(backupPath)).toString("utf8"));
  if (backup.schemaVersion !== "starter-update-backup/v1") throw new Error("Starter update backup schema is invalid");
  for (const [relative, encoded] of Object.entries(backup.files || {})) {
    const file = path.join(projectRoot, relative);
    if (encoded === null) await unlink(file).catch((error) => { if (error?.code !== "ENOENT") throw error; });
    else { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, Buffer.from(encoded, "base64")); }
  }
}

function verifyProject(phase) {
  for (const script of ["typecheck", "build"]) {
    const result = spawnSync("npm", ["run", script], { cwd: projectRoot, encoding: "utf8" });
    if (result.status !== 0) throw new Error(`${phase} ${script} failed\n${result.stderr || result.stdout}`);
  }
  if (phase === "post-update" && process.env.STARTER_UPDATE_TEST_FORCE_VERIFY_FAILURE === "true") throw new Error("Forced post-update verification failure");
}

function runFactory(sourceRoot, args, env = {}) {
  const result = spawnSync(process.execPath, [
    path.join(sourceRoot, "scripts/starter-factory.mjs"),
    ...args,
    `--project-root=${projectRoot}`,
  ], { cwd: projectRoot, encoding: "utf8", env: { ...process.env, ...env } });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "Starter maintenance failed");
  return result.stdout.trim();
}

function allowedChannelUrl(value) {
  const url = new URL(value);
  if (url.protocol === "https:") return url;
  if (url.protocol === "http:" && new Set(["127.0.0.1", "localhost", "::1"]).has(url.hostname)) return url;
  throw new Error("Starter Channel must use HTTPS; loopback HTTP is allowed only for local verification");
}

async function fetchBytes(url, label) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const headers = process.env.STARTER_UPDATE_TOKEN
      ? { Authorization: `Bearer ${process.env.STARTER_UPDATE_TOKEN}` }
      : undefined;
    const response = await fetch(url, { headers, signal: controller.signal, redirect: "error" });
    if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}`);
    const length = Number(response.headers.get("content-length") || 0);
    if (length > maxArtifactBytes) throw new Error(`${label} exceeds the ${maxArtifactBytes} byte limit`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > maxArtifactBytes) throw new Error(`${label} exceeds the ${maxArtifactBytes} byte limit`);
    return bytes;
  } finally {
    clearTimeout(timeout);
  }
}

function validateChannel(value, channelUrl) {
  if (value?.schemaVersion !== "all2cf-starter-channel/v1") throw new Error("Starter Channel schema is invalid");
  const engine = value.engine;
  if (!engine || !/^\d+\.\d+\.\d+(?:-(?:dev|rc)\.\d+)?$/u.test(engine.version || "")) throw new Error("Starter Channel Engine version is invalid");
  if (!/^[a-f0-9]{40}$/u.test(engine.sourceCommit || "")) throw new Error("Starter Channel source commit is invalid");
  if (!/^[a-f0-9]{64}$/u.test(engine.artifactSha256 || "")) throw new Error("Starter Channel artifact SHA-256 is invalid");
  if (!engine.artifactUrl || typeof engine.artifactUrl !== "string") throw new Error("Starter Channel artifact URL is missing");
  const artifactUrl = new URL(engine.artifactUrl, channelUrl);
  if (artifactUrl.origin !== channelUrl.origin) throw new Error("Starter Channel artifact must use the Channel origin");
  return { ...value, engine: { ...engine, artifactUrl: artifactUrl.href } };
}

async function remoteChannel() {
  if (receipt.updateServiceUrl) return serviceChannel();
  if (!receipt.channelUrl) throw new Error("This portable project has no update Channel in .starter/source.json");
  const channelUrl = allowedChannelUrl(receipt.channelUrl);
  const bytes = await fetchBytes(channelUrl, "Starter Channel");
  return validateChannel(JSON.parse(bytes.toString("utf8")), channelUrl);
}

async function serviceChannel() {
  const serviceUrl = allowedChannelUrl(receipt.updateServiceUrl);
  const localAuth = await readFile(localAuthPath, "utf8").then(JSON.parse, () => null);
  const accessToken = process.env.ALL2CF_UPDATE_TOKEN || localAuth?.accessToken || "";
  if (!accessToken) throw new Error("Connect this project to All2CF from /update before checking paid updates");
  if (localAuth?.expiresAt && Date.parse(localAuth.expiresAt) <= Date.now())
    throw new Error("The local All2CF update authorization expired; reconnect from /update");
  const response = await fetch(new URL("resolve", serviceUrl.href.endsWith("/") ? serviceUrl : `${serviceUrl.href}/`), {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      schemaVersion: "starter-update-request/v1",
      installationId: localAuth?.installationId || null,
      projectId: localAuth?.projectId || null,
      project: receipt.project,
      installed: {
        engineVersion: receipt.engineVersion || null,
        sourceCommit: receipt.sourceCommit,
        artifactSha256: receipt.artifactSha256 || null,
        packs: Object.entries((JSON.parse(await readFile(materializationPath, "utf8"))).packs || {}).map(([id, value]) => ({ id, version: value.version })),
      },
    }),
    redirect: "error",
  });
  const resolution = await response.json().catch(() => null);
  if (!response.ok) throw new Error(resolution?.error || `All2CF update service returned HTTP ${response.status}`);
  if (resolution?.schemaVersion !== "all2cf-starter-update-resolution/v1") throw new Error("All2CF update resolution schema is invalid");
  if (resolution.authorized !== true) {
    const suffix = resolution.checkoutUrl ? ` Subscribe at ${resolution.checkoutUrl}` : "";
    throw new Error(`${resolution.reason || "Starter Updates subscription is required."}${suffix}`);
  }
  return validateChannel({ schemaVersion: "all2cf-starter-channel/v1", channel: resolution.channel, engine: resolution.engine, publishedAt: resolution.publishedAt || null, entitlement: resolution.entitlement || null, releaseNotes: resolution.release?.notes || [], releaseUrl: resolution.release?.url || null }, serviceUrl);
}

async function statusRemote() {
  const channel = await remoteChannel();
  const materialization = JSON.parse(await readFile(materializationPath, "utf8"));
  const installedVersions = new Map(Object.entries(materialization.packs || {}).map(([id, value]) => [id, value.version]));
  const packs = Object.entries(channel.engine.packVersions || {})
    .filter(([id]) => installedVersions.has(id))
    .map(([id, available]) => ({ id, installed: installedVersions.get(id), available, updateAvailable: installedVersions.get(id) !== available }));
  const catalog = Object.entries(channel.engine.packVersions || {}).filter(([id]) => !installedVersions.has(id)).map(([id, available]) => ({ id, available, materialized: false }));
  return {
    ok: true,
    command: "status",
    target: projectRoot,
    source: {
      installedCommit: receipt.sourceCommit,
      availableCommit: channel.engine.sourceCommit,
      installedVersion: receipt.engineVersion || null,
      availableVersion: channel.engine.version,
      updateAvailable: receipt.sourceCommit !== channel.engine.sourceCommit || receipt.artifactSha256 !== channel.engine.artifactSha256,
      channel: channel.channel,
      channelUrl: receipt.channelUrl,
    },
    packs,
    catalog,
    entitlement: channel.entitlement || null,
    releaseNotes: channel.releaseNotes || [],
    releaseUrl: channel.releaseUrl || null,
    publishedAt: channel.publishedAt || null,
  };
}

async function statusDetachedLinkedSource() {
  const materialization = JSON.parse(await readFile(materializationPath, "utf8"));
  return {
    ok: true,
    command: "status",
    target: projectRoot,
    source: {
      installedCommit: receipt.sourceCommit,
      availableCommit: null,
      updateAvailable: null,
      available: false,
      reason: "linked-source-unavailable",
    },
    packs: Object.entries(materialization.packs || {}).map(([id, installed]) => ({
      id,
      installed: installed.version,
      available: null,
      updateAvailable: null,
    })),
  };
}

function safeArchiveListing(archive) {
  const result = spawnSync("tar", ["-tzf", archive], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || "Starter Engine archive cannot be listed");
  const entries = result.stdout.split("\n").filter(Boolean);
  if (!entries.length) throw new Error("Starter Engine archive is empty");
  for (const entry of entries) {
    if (entry === "." || entry === "./") continue;
    const normalized = entry.replace(/^\.\//u, "");
    if (!normalized || path.posix.isAbsolute(normalized) || normalized.split("/").includes("..") || normalized === ".git" || normalized.startsWith(".git/"))
      throw new Error(`Starter Engine archive contains unsafe path ${entry}`);
  }
}

async function withRemoteEngine(callback) {
  const channel = await remoteChannel();
  const work = await mkdtemp(path.join(os.tmpdir(), "starter-engine-update-"));
  const archive = path.join(work, "engine.tar.gz");
  const sourceRoot = path.join(work, "source");
  try {
    const bytes = await fetchBytes(channel.engine.artifactUrl, "Starter Engine artifact");
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== channel.engine.artifactSha256) throw new Error("Starter Engine artifact SHA-256 does not match the Channel");
    await writeFile(archive, bytes, { mode: 0o600 });
    safeArchiveListing(archive);
    const extracted = spawnSync("tar", ["-xzf", archive, "-C", work], { encoding: "utf8" });
    if (extracted.status !== 0) throw new Error(extracted.stderr || "Starter Engine archive extraction failed");
    const actualRoot = await readFile(path.join(work, "scripts/starter-factory.mjs"), "utf8").then(() => work, () => sourceRoot);
    const result = await callback(actualRoot, channel);
    return { result, channel };
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

async function updateReceipt(channel) {
  const next = JSON.parse(await readFile(receiptPath, "utf8"));
  next.schemaVersion = "starter-source/v2";
  next.updateMode = "engine-channel";
  if (next.updateServiceUrl) next.updateMode = "all2cf-service";
  next.sourceCommit = channel.engine.sourceCommit;
  next.sourceDirty = false;
  next.engineVersion = channel.engine.version;
  next.artifactSha256 = channel.engine.artifactSha256;
  next.updatedAt = new Date().toISOString();
  await writeFile(receiptPath, json(next));
}

async function main() {
  if (receipt.sourceRoot) {
    if (existsSync(path.join(receipt.sourceRoot, "scripts/starter-factory.mjs"))) {
      const output = runFactory(receipt.sourceRoot, process.argv.slice(2));
      if (output) process.stdout.write(`${output}\n`);
      return;
    }
    if (command === "status") {
      process.stdout.write(json(await statusDetachedLinkedSource()));
      return;
    }
    throw new Error("The linked Starter source is unavailable. Connect this project to All2CF or restore the pinned source before diff, add, or update.");
  }
  if (command === "status") {
    process.stdout.write(json(await statusRemote()));
    return;
  }
  if (!new Set(["diff", "add", "update"]).has(command)) throw new Error(`Unknown Starter maintenance command ${command}`);
  const { result, channel } = await withRemoteEngine(async (sourceRoot, descriptor) => {
    const factoryEnv = {
      STARTER_FACTORY_SOURCE_COMMIT: descriptor.engine.sourceCommit,
      STARTER_FACTORY_PORTABLE: "true",
      STARTER_FACTORY_SOURCE_URL: receipt.sourceUrl || descriptor.engine.artifactUrl,
      STARTER_FACTORY_CHANNEL_URL: receipt.channelUrl,
      STARTER_FACTORY_ENGINE_VERSION: descriptor.engine.version,
      STARTER_FACTORY_ARTIFACT_SHA256: descriptor.engine.artifactSha256,
    };
    if (command === "update") verifyProject("pre-update");
    const plan = command === "update" ? JSON.parse(runFactory(sourceRoot, ["diff"], factoryEnv)) : null;
    const backupPath = plan ? await createUpdateBackup(plan) : null;
    try {
      const output = runFactory(sourceRoot, process.argv.slice(2), factoryEnv);
      if (command === "add" || command === "update") await updateReceipt(descriptor);
      if (command === "update") verifyProject("post-update");
      return backupPath ? `${output}\nRecovery snapshot: ${path.relative(projectRoot, backupPath)}` : output;
    } catch (error) {
      if (backupPath) await restoreUpdateBackup(backupPath);
      throw error;
    }
  });
  if (result) process.stdout.write(`${result}\n`);
  if (command !== "diff") process.stderr.write(`Starter receipt advanced to ${channel.engine.version} after successful materialization.\n`);
}

main().catch((error) => {
  console.error(json({ ok: false, command, error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
});
