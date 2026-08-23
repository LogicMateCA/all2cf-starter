import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const work = await mkdtemp(path.join(os.tmpdir(), "starter-channel-contract-"));
const channelRoot = path.join(work, "channel");
const projectSlug = `channel-proof-${process.pid}`;
const projectRoot = path.join(root, ".factory-output", projectSlug);
const archive = path.join(channelRoot, "engine.tar.gz");
const installedCommit = "1".repeat(40);
const availableCommit = "2".repeat(40);
const runSync = (command, args, options = {}) => {
  const result = spawnSync(command, args, { cwd: options.cwd || root, encoding: "utf8", env: { ...process.env, ...options.env } });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${command} failed`);
  return result.stdout.trim();
};
const runAsync = (command, args, options = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { cwd: options.cwd || root, env: { ...process.env, ...options.env }, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = ""; let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("error", reject);
  child.on("close", (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(stderr || stdout || `${command} failed`)));
});

let server;
try {
  await rm(projectRoot, { recursive: true, force: true });
  runSync("mkdir", ["-p", channelRoot]);
  runSync("tar", [
    "--exclude=.git", "--exclude=.all2cf", "--exclude=.factory-output", "--exclude=node_modules",
    "--exclude=dist", "--exclude=test-results", "--exclude=tmp", "-czf", archive, "-C", root, ".",
  ]);
  const artifactSha256 = createHash("sha256").update(await readFile(archive)).digest("hex");
  server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url || "/", "http://127.0.0.1").pathname;
    if (pathname === "/channel.json") {
      response.setHeader("content-type", "application/json");
      return response.end(JSON.stringify({
        schemaVersion: "all2cf-starter-channel/v1",
        channel: "contract",
        engine: { version: "2.0.0-dev.10", sourceCommit: availableCommit, artifactSha256, artifactUrl: "engine.tar.gz", manifestUrl: "manifest.json", packVersions: {} },
        publishedAt: new Date().toISOString(),
      }));
    }
    if (pathname === "/engine.tar.gz") {
      const bytes = await readFile(archive);
      response.setHeader("content-length", String(bytes.length));
      response.setHeader("content-type", "application/gzip");
      return response.end(bytes);
    }
    response.statusCode = 404; response.end("not found");
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  assert.equal(typeof address, "object");
  const channelUrl = `http://127.0.0.1:${address.port}/channel.json`;
  const created = JSON.parse(await runAsync(process.execPath, [
    path.join(root, "scripts/starter-factory.mjs"), "create", `--slug=${projectSlug}`, "--name=Engine Channel Proof",
  ], { env: {
    STARTER_FACTORY_SOURCE_COMMIT: installedCommit,
    STARTER_FACTORY_PORTABLE: "true",
    STARTER_FACTORY_PACKAGE_LOCK_ONLY: "true",
    STARTER_FACTORY_SOURCE_URL: "https://updates.example.invalid/engine/2.0.0-dev.9",
    STARTER_FACTORY_CHANNEL_URL: channelUrl,
    STARTER_FACTORY_ENGINE_VERSION: "2.0.0-dev.9",
    STARTER_FACTORY_ARTIFACT_SHA256: "1".repeat(64),
  } }));
  assert.equal(created.ok, true);
  await runAsync("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: projectRoot });
  const status = JSON.parse(await runAsync("npm", ["run", "starter:status", "--silent"], { cwd: projectRoot }));
  assert.equal(status.source.installedVersion, "2.0.0-dev.9");
  assert.equal(status.source.availableVersion, "2.0.0-dev.10");
  assert.equal(status.source.updateAvailable, true);
  const diff = JSON.parse(await runAsync("npm", ["run", "starter:diff", "--silent"], { cwd: projectRoot }));
  assert.equal(diff.ok, true);
  assert.equal(diff.changes.length, 0);
  await runAsync("npm", ["run", "starter:add", "--silent", "--", "saas.account-security-2fa"], { cwd: projectRoot });
  let receipt = JSON.parse(await readFile(path.join(projectRoot, ".starter/source.json"), "utf8"));
  assert.equal(receipt.engineVersion, "2.0.0-dev.10");
  assert.equal(receipt.sourceCommit, availableCommit);
  receipt.engineVersion = "2.0.0-dev.9";
  receipt.sourceCommit = installedCommit;
  receipt.artifactSha256 = "1".repeat(64);
  await writeFile(path.join(projectRoot, ".starter/source.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  await runAsync("npm", ["run", "starter:update", "--silent"], { cwd: projectRoot });
  receipt = JSON.parse(await readFile(path.join(projectRoot, ".starter/source.json"), "utf8"));
  assert.equal(receipt.engineVersion, "2.0.0-dev.10");
  const ownedPath = path.join(projectRoot, "workers/app/features/object-storage-worker.ts");
  const owned = await readFile(ownedPath, "utf8");
  await writeFile(ownedPath, `${owned}\n// product-owned conflict proof\n`);
  await assert.rejects(
    runAsync("npm", ["run", "starter:update", "--silent"], { cwd: projectRoot }),
    /modified|conflict|refus|hash|receipt/iu,
  );
  await writeFile(ownedPath, owned);
  console.log(JSON.stringify({ ok: true, project: projectSlug, installedVersion: "2.0.0-dev.9", availableVersion: "2.0.0-dev.10", artifactSha256, status: true, diff: true, add: true, update: true, conflictProtection: true }, null, 2));
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  await rm(projectRoot, { recursive: true, force: true });
  await rm(path.join(root, ".factory-output", `${projectSlug}.tar.gz`), { force: true });
  await rm(work, { recursive: true, force: true });
}
