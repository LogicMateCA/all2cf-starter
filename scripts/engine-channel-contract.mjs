import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
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
let availableCommit = "2".repeat(40);
let availableVersion = "2.0.0-dev.10";
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
    "--exclude=dist", "--exclude=test-results", "--exclude=tmp", "--exclude=apps/mobile/android", "--exclude=apps/mobile/ios", "-czf", archive, "-C", root, ".",
  ]);
  let artifactSha256 = createHash("sha256").update(await readFile(archive)).digest("hex");
  server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url || "/", "http://127.0.0.1").pathname;
    if (pathname === "/api/starter-updates/resolve" && request.method === "POST") {
      if (request.headers.authorization !== "Bearer contract-token") {
        response.statusCode = 401;
        response.setHeader("content-type", "application/json");
        return response.end(JSON.stringify({ error: "Unauthorized" }));
      }
      response.setHeader("content-type", "application/json");
      return response.end(JSON.stringify({
        schemaVersion: "all2cf-starter-update-resolution/v1",
        authorized: true,
        channel: "contract",
        engine: { version: availableVersion, sourceCommit: availableCommit, artifactSha256, artifactUrl: "/engine.tar.gz", manifestUrl: "/manifest.json", packVersions: {} },
        publishedAt: new Date().toISOString(),
      }));
    }
    if (pathname === "/channel.json") {
      response.setHeader("content-type", "application/json");
      return response.end(JSON.stringify({
        schemaVersion: "all2cf-starter-channel/v1",
        channel: "contract",
        engine: { version: availableVersion, sourceCommit: availableCommit, artifactSha256, artifactUrl: "engine.tar.gz", manifestUrl: "manifest.json", packVersions: {} },
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
  const updateServiceUrl = `http://127.0.0.1:${address.port}/api/starter-updates/`;
  const created = JSON.parse(await runAsync(process.execPath, [
    path.join(root, "scripts/starter-factory.mjs"), "create", `--slug=${projectSlug}`, "--name=Engine Channel Proof",
  ], { env: {
    STARTER_FACTORY_SOURCE_COMMIT: installedCommit,
    STARTER_FACTORY_PORTABLE: "true",
    STARTER_FACTORY_PACKAGE_LOCK_ONLY: "true",
    STARTER_FACTORY_SOURCE_URL: "https://updates.example.invalid/engine/2.0.0-dev.9",
    STARTER_FACTORY_CHANNEL_URL: channelUrl,
    STARTER_FACTORY_UPDATE_SERVICE_URL: updateServiceUrl,
    STARTER_FACTORY_ENGINE_VERSION: "2.0.0-dev.9",
    STARTER_FACTORY_ARTIFACT_SHA256: "1".repeat(64),
  } }));
  assert.equal(created.ok, true);
  await runAsync("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: projectRoot });
  await assert.rejects(runAsync("npm", ["run", "starter:status", "--silent"], { cwd: projectRoot }), /connect.*All2CF/iu);
  await writeFile(path.join(projectRoot, ".starter/update-auth.local.json"), `${JSON.stringify({ schemaVersion: "starter-update-auth/v1", accessToken: "contract-token", installationId: "installation-contract", projectId: "project-contract", expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() }, null, 2)}\n`, { mode: 0o600 });
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
  await assert.rejects(runAsync("npm", ["run", "starter:update", "--silent"], { cwd: projectRoot, env: { STARTER_UPDATE_TEST_FORCE_VERIFY_FAILURE: "true" } }), /Forced post-update verification failure/u);
  receipt = JSON.parse(await readFile(path.join(projectRoot, ".starter/source.json"), "utf8"));
  assert.equal(receipt.engineVersion, "2.0.0-dev.9");
  assert.ok((await readdir(path.join(projectRoot, ".starter/backups"))).some((name) => name.endsWith(".json.gz")), "failed update must leave a recovery snapshot");
  await runAsync("npm", ["run", "starter:update", "--silent"], { cwd: projectRoot });
  receipt = JSON.parse(await readFile(path.join(projectRoot, ".starter/source.json"), "utf8"));
  assert.equal(receipt.engineVersion, "2.0.0-dev.10");
  const ownedPath = path.join(projectRoot, "workers/app/features/object-storage-worker.ts");
  const owned = await readFile(ownedPath, "utf8");
  const localOverride = `${owned}\n// product-owned customization proof\n`;
  await writeFile(ownedPath, localOverride);
  const materialization = JSON.parse(await readFile(path.join(projectRoot, ".starter/materialization.json"), "utf8"));
  const dependencyReceipt = Object.values(materialization.dependencies || {})[0];
  assert.ok(dependencyReceipt, "proof project must have a receipt-owned dependency");
  const packagePath = path.join(projectRoot, dependencyReceipt.packageFile);
  const packageModel = JSON.parse(await readFile(packagePath, "utf8"));
  const productDependencyVersion = "0.0.0-product-override";
  packageModel[dependencyReceipt.section][dependencyReceipt.name] = productDependencyVersion;
  await writeFile(packagePath, `${JSON.stringify(packageModel, null, 2)}\n`);
  const preserveDiff = JSON.parse(await runAsync("npm", ["run", "starter:diff", "--silent"], { cwd: projectRoot }));
  assert.equal(preserveDiff.summary.conflicts, 0);
  assert.equal(preserveDiff.preserved.some(({ target }) => target === "workers/app/features/object-storage-worker.ts"), true);
  assert.equal(preserveDiff.preserved.some(({ target }) => target === `${dependencyReceipt.packageFile}:${dependencyReceipt.name}`), true);
  await runAsync("npm", ["run", "starter:update", "--silent"], { cwd: projectRoot });
  assert.equal(await readFile(ownedPath, "utf8"), localOverride);
  assert.equal(JSON.parse(await readFile(packagePath, "utf8"))[dependencyReceipt.section][dependencyReceipt.name], productDependencyVersion);

  const targetRoot = path.join(work, "target-source");
  runSync("mkdir", ["-p", targetRoot]);
  runSync("tar", ["-xzf", archive, "-C", targetRoot]);
  const upstreamTemplate = path.join(targetRoot, "packs/capabilities/object-storage/templates/object-storage-worker.ts");
  await writeFile(upstreamTemplate, `${await readFile(upstreamTemplate, "utf8")}\n// Starter upstream change proof\n`);
  runSync("tar", ["-czf", archive, "-C", targetRoot, "."]);
  artifactSha256 = createHash("sha256").update(await readFile(archive)).digest("hex");
  availableCommit = "3".repeat(40);
  availableVersion = "2.0.0-dev.11";
  await assert.rejects(
    runAsync("npm", ["run", "starter:diff", "--silent"], { cwd: projectRoot }),
    /both product and Starter changes|conflict|blocked/iu,
  );
  assert.equal(await readFile(ownedPath, "utf8"), localOverride);
  console.log(JSON.stringify({ ok: true, project: projectSlug, installedVersion: "2.0.0-dev.9", availableVersion, artifactSha256, status: true, diff: true, add: true, update: true, localFileOverridePreserved: true, localDependencyOverridePreserved: true, simultaneousConflictBlocked: true, failedVerificationRestored: true, recoverySnapshot: true }, null, 2));
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  await rm(projectRoot, { recursive: true, force: true });
  await rm(path.join(root, ".factory-output", `${projectSlug}.tar.gz`), { force: true });
  await rm(work, { recursive: true, force: true });
}
