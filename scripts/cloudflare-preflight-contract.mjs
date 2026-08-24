import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const temporary = await mkdtemp(path.join(os.tmpdir(), "starter-preflight-contract-"));
try {
  await mkdir(path.join(temporary, "scripts"), { recursive: true });
  await cp(path.join(root, "scripts/record-cloudflare-preflight.mjs"), path.join(temporary, "scripts/record-cloudflare-preflight.mjs"));
  const config = {
    project: { slug: "proof" },
    cloudflare: { accountId: "a".repeat(32) },
    development: { worker: "proof-dev", domain: "proof-dev.example.test", database: { vpcServiceName: "proof-db", hyperdriveName: "proof-dev-db" } },
    production: { worker: "proof", domain: "proof.example.test", database: { hyperdriveName: "proof-prod-db" } },
  };
  const configSource = `${JSON.stringify(config, null, 2)}\n`;
  await writeFile(path.join(temporary, "starter.config.json"), configSource);
  const { createHash } = await import("node:crypto");
  const configHash = createHash("sha256").update(configSource).digest("hex");
  const targets = {
    workers: ["proof-dev", "proof"].map((name) => ({ name, status: "absent" })),
    domains: ["proof-dev.example.test", "proof.example.test"].map((hostname) => ({ hostname, status: "absent" })),
    vpcServices: [{ name: "proof-db", status: "absent" }],
    hyperdrives: ["proof-dev-db", "proof-prod-db"].map((name) => ({ name, status: "absent" })),
  };
  const run = async (snapshot) => {
    await writeFile(path.join(temporary, "snapshot.json"), `${JSON.stringify(snapshot)}\n`);
    execFileSync(process.execPath, [path.join(temporary, "scripts/record-cloudflare-preflight.mjs"), "--snapshot", "snapshot.json"], { cwd: temporary, stdio: "pipe" });
    return JSON.parse(await readFile(path.join(temporary, ".all2cf/preflight.local.json"), "utf8"));
  };
  const common = { configHash, accountId: config.cloudflare.accountId, checkedAt: new Date().toISOString(), workerStudio: "unavailable", ...targets };
  const mcp = await run({ schemaVersion: "starter-cloudflare-mcp-snapshot/v1", source: "official-cloudflare-mcp", ...common });
  assert.equal(mcp.evidence, "official-cloudflare-mcp-snapshot");
  const all2cf = await run({ schemaVersion: "starter-cloudflare-control-plane-snapshot/v1", source: "all2cf-control-plane", controlPlane: { service: "all2cf", authorization: "saved-owner-connection", projectId: "project-proof" }, ...common });
  assert.equal(all2cf.evidence, "all2cf-control-plane-snapshot");
  assert.equal(all2cf.authority.projectId, "project-proof");
  await assert.rejects(() => run({ schemaVersion: "starter-cloudflare-control-plane-snapshot/v1", source: "all2cf-control-plane", controlPlane: { service: "unknown", authorization: "saved-owner-connection", projectId: "project-proof" }, ...common }));
  const starterctl = await readFile(path.join(root, "scripts/starterctl.mjs"), "utf8");
  assert.match(starterctl, /STARTER_CONTROL_PLANE === "all2cf"/u);
  assert.match(starterctl, /STARTER_EXISTING_HYPERDRIVE_ID/u);
  console.log(JSON.stringify({ ok: true, authorities: [mcp.evidence, all2cf.evidence], untrustedRejected: true, environmentGate: true, existingHyperdrive: true }, null, 2));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
