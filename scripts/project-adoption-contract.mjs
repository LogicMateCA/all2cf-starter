import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const fixture = await mkdtemp(path.join(os.tmpdir(), "starter-adoption-"));
const blockedFixture = await mkdtemp(path.join(os.tmpdir(), "starter-adoption-blocked-"));
const runAt = (target, ...args) => spawnSync(process.execPath, [path.join(root, "scripts/project-adoption.mjs"), ...args, "--root", target], { cwd: root, encoding: "utf8" });
const run = (...args) => runAt(fixture, ...args);

try {
  await mkdir(path.join(fixture, "src", "features", "orders"), { recursive: true });
  await writeFile(path.join(fixture, "package.json"), `${JSON.stringify({ name: "legacy-proof", private: true, scripts: { test: "node test.mjs" }, dependencies: { react: "19.2.3", postgres: "3.4.7" } }, null, 2)}\n`);
  await writeFile(path.join(fixture, "AGENTS.md"), "# Legacy instructions\n\nKeep this line.\n");

  const scan = run("scan");
  assert.equal(scan.status, 0, scan.stderr);
  const scanReport = JSON.parse(scan.stdout);
  assert.equal(scanReport.projectName, "legacy-proof");
  assert.equal(scanReport.signals.web, true);
  assert.equal(scanReport.featureCandidates[0].id, "orders");
  assert.equal(await readFile(path.join(fixture, "AGENTS.md"), "utf8"), "# Legacy instructions\n\nKeep this line.\n", "Scan mutated the legacy project");

  const plan = run("plan");
  assert.equal(plan.status, 0, plan.stderr);
  assert.equal(JSON.parse(plan.stdout).decisions.find(({ area }) => area === "business-code").action, "keep");

  const apply = run("apply");
  assert.equal(apply.status, 0, apply.stderr || apply.stdout);
  const agents = await readFile(path.join(fixture, "AGENTS.md"), "utf8");
  assert.match(agents, /Keep this line/u);
  assert.match(agents, /BEGIN ALL2CF STARTER ADOPTION/u);
  const packageJson = JSON.parse(await readFile(path.join(fixture, "package.json"), "utf8"));
  assert.equal(packageJson.scripts.test, "node test.mjs");
  assert.equal(packageJson.scripts["starter:adoption:verify"], "node scripts/starter-adoption.mjs verify");
  const candidates = JSON.parse(await readFile(path.join(fixture, ".ai", "feature-adoption-candidates.json"), "utf8"));
  assert.equal(candidates.candidates[0].path, "src/features/orders");
  const receipt = JSON.parse(await readFile(path.join(fixture, ".starter", "adoption.json"), "utf8"));
  assert.equal(receipt.schemaVersion, "starter-adoption/v1");
  assert.match(receipt.backup, /^\.starter\/adoption-backups\//u);

  const localVerify = spawnSync(process.execPath, [path.join(fixture, "scripts", "starter-adoption.mjs"), "verify"], { cwd: fixture, encoding: "utf8" });
  assert.equal(localVerify.status, 0, localVerify.stderr);
  assert.equal(JSON.parse(localVerify.stdout).ok, true);
  const verify = run("verify");
  assert.equal(verify.status, 0, verify.stderr);
  await mkdir(path.join(blockedFixture, ".ai"), { recursive: true });
  await writeFile(path.join(blockedFixture, "package.json"), `${JSON.stringify({ name: "unknown-map", scripts: { keep: "yes" } }, null, 2)}\n`);
  await writeFile(path.join(blockedFixture, ".ai", "agent-map.json"), `${JSON.stringify({ schemaVersion: "foreign-agent-map/v9", routes: [] }, null, 2)}\n`);
  const blocked = runAt(blockedFixture, "apply");
  assert.notEqual(blocked.status, 0, "Unknown Agent Map schema was overwritten");
  assert.match(blocked.stderr, /unsupported schema/u);
  const blockedPackage = JSON.parse(await readFile(path.join(blockedFixture, "package.json"), "utf8"));
  assert.deepEqual(blockedPackage.scripts, { keep: "yes" });
  console.log(JSON.stringify({ ok: true, scanIsReadOnly: true, existingFilesPreserved: true, unknownSchemasFailClosed: true, selfContainedVerification: true, featureCandidates: 1 }, null, 2));
} finally {
  await rm(fixture, { recursive: true, force: true });
  await rm(blockedFixture, { recursive: true, force: true });
}
