import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) args.set(process.argv[index], process.argv[index + 1]);
const snapshotArgument = args.get("--snapshot");
if (!snapshotArgument) throw new Error("--snapshot is required");

const configSource = await readFile(path.join(root, "starter.config.json"), "utf8");
const config = JSON.parse(configSource);
const configHash = createHash("sha256").update(configSource).digest("hex");
const snapshot = JSON.parse(await readFile(path.resolve(root, snapshotArgument), "utf8"));
const snapshotAge = Date.now() - new Date(snapshot.checkedAt).getTime();
const officialMcp = snapshot.schemaVersion === "starter-cloudflare-mcp-snapshot/v1" && snapshot.source === "official-cloudflare-mcp";
const all2cfControlPlane = snapshot.schemaVersion === "starter-cloudflare-control-plane-snapshot/v1" && snapshot.source === "all2cf-control-plane" && snapshot.controlPlane?.service === "all2cf" && snapshot.controlPlane?.authorization === "saved-owner-connection" && typeof snapshot.controlPlane?.projectId === "string";
if ((!officialMcp && !all2cfControlPlane) || snapshot.configHash !== configHash || snapshot.accountId !== config.cloudflare.accountId || !Number.isFinite(snapshotAge) || snapshotAge < 0 || snapshotAge > 15 * 60 * 1000) throw new Error("Cloudflare preflight snapshot is stale, untrusted, or does not match starter.config.json");
if (!new Set(["available", "unavailable"]).has(snapshot.workerStudio)) throw new Error("Cloudflare MCP snapshot has an invalid Worker Studio capability state");

const expected = {
  workers: [config.development.worker, config.production.worker],
  domains: [config.development.domain, config.production.domain],
  vpcServices: [config.development.database.vpcServiceName],
  hyperdrives: [config.development.database.hyperdriveName, config.production.database.hyperdriveName]
};
const fields = { workers: "name", domains: "hostname", vpcServices: "name", hyperdrives: "name" };
const collisions = [];
for (const [group, targets] of Object.entries(expected)) {
  const items = snapshot[group] || [];
  const actualTargets = items.map((item) => item[fields[group]]).sort();
  if (JSON.stringify(actualTargets) !== JSON.stringify([...targets].sort())) throw new Error(`Cloudflare MCP snapshot ${group} targets do not match starter.config.json`);
  for (const item of items) {
    if (!new Set(["absent", "matching", "collision"]).has(item.status)) throw new Error(`Cloudflare MCP snapshot has an invalid ${group} status`);
    if (item.status === "matching" && !item.id) throw new Error(`Cloudflare MCP snapshot matching ${group} item is missing its ID`);
    if (item.status === "collision") collisions.push({ group, target: item[fields[group]] });
  }
}
if (collisions.length) throw new Error(`Provisioning blocked by Cloudflare collisions: ${collisions.map((item) => `${item.group}:${item.target}`).join(", ")}`);
const receipt = {
  schemaVersion: "starter-cloudflare-preflight/v1",
  evidence: officialMcp ? "official-cloudflare-mcp-snapshot" : "all2cf-control-plane-snapshot",
  authority: officialMcp ? { source: "official-cloudflare-mcp" } : snapshot.controlPlane,
  checkedAt: new Date().toISOString(),
  snapshotCheckedAt: snapshot.checkedAt,
  snapshotHash: createHash("sha256").update(JSON.stringify(snapshot)).digest("hex"),
  configHash,
  accountId: config.cloudflare.accountId,
  projectSlug: config.project.slug,
  collisions: [],
  workerStudio: snapshot.workerStudio,
  targets: expected,
  evidenceSummary: Object.fromEntries(Object.entries(fields).map(([group]) => [group, snapshot[group].map((item) => ({ target: item[fields[group]], status: item.status, id: item.id || null }))]))
};
const output = path.join(root, ".all2cf/preflight.local.json");
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ ok: true, receipt: path.relative(root, output), snapshot: snapshotArgument, checkedAt: receipt.checkedAt, projectSlug: receipt.projectSlug, workerStudio: receipt.workerStudio }, null, 2));
