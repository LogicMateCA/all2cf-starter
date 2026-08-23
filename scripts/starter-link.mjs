import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const projectRoot = process.cwd();
const command = process.argv.slice(2).find((value) => !value.startsWith("--")) || "status";
const receiptPath = path.join(projectRoot, ".starter/source.json");
const materializationPath = path.join(projectRoot, ".starter/materialization.json");
const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const maxArtifactBytes = 96 * 1024 * 1024;

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
  if (!receipt.channelUrl) throw new Error("This portable project has no update Channel in .starter/source.json");
  const channelUrl = allowedChannelUrl(receipt.channelUrl);
  const bytes = await fetchBytes(channelUrl, "Starter Channel");
  return validateChannel(JSON.parse(bytes.toString("utf8")), channelUrl);
}

async function statusRemote() {
  const channel = await remoteChannel();
  const materialization = JSON.parse(await readFile(materializationPath, "utf8"));
  const installedVersions = new Map(Object.entries(materialization.packs || {}).map(([id, value]) => [id, value.version]));
  const packs = Object.entries(channel.engine.packVersions || {})
    .filter(([id]) => installedVersions.has(id))
    .map(([id, available]) => ({ id, installed: installedVersions.get(id), available, updateAvailable: installedVersions.get(id) !== available }));
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
  next.sourceCommit = channel.engine.sourceCommit;
  next.sourceDirty = false;
  next.engineVersion = channel.engine.version;
  next.artifactSha256 = channel.engine.artifactSha256;
  next.updatedAt = new Date().toISOString();
  await writeFile(receiptPath, json(next));
}

async function main() {
  if (receipt.sourceRoot) {
    const output = runFactory(receipt.sourceRoot, process.argv.slice(2));
    if (output) process.stdout.write(`${output}\n`);
    return;
  }
  if (command === "status") {
    process.stdout.write(json(await statusRemote()));
    return;
  }
  if (!new Set(["diff", "add", "update"]).has(command)) throw new Error(`Unknown Starter maintenance command ${command}`);
  const { result, channel } = await withRemoteEngine(async (sourceRoot, descriptor) => {
    const output = runFactory(sourceRoot, process.argv.slice(2), {
      STARTER_FACTORY_SOURCE_COMMIT: descriptor.engine.sourceCommit,
      STARTER_FACTORY_PORTABLE: "true",
      STARTER_FACTORY_SOURCE_URL: receipt.sourceUrl || descriptor.engine.artifactUrl,
      STARTER_FACTORY_CHANNEL_URL: receipt.channelUrl,
      STARTER_FACTORY_ENGINE_VERSION: descriptor.engine.version,
      STARTER_FACTORY_ARTIFACT_SHA256: descriptor.engine.artifactSha256,
    });
    if (command === "add" || command === "update") await updateReceipt(descriptor);
    return output;
  });
  if (result) process.stdout.write(`${result}\n`);
  if (command !== "diff") process.stderr.write(`Starter receipt advanced to ${channel.engine.version} after successful materialization.\n`);
}

main().catch((error) => {
  console.error(json({ ok: false, command, error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
});
