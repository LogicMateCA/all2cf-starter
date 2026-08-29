import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "AGENTS.md",
  "PROJECT.md",
  "ARCHITECTURE.md",
  "DESIGN.md",
  "PERFORMANCE.md",
  "RELEASE.md",
  ".ai/manifest.json",
  ".ai/orchestration.yaml",
  ".mcp.json",
  "starter.manifest.json",
  "cloudflare/wrangler.development.jsonc",
  "cloudflare/wrangler.production.jsonc",
];

const failures = required.filter((relativePath) => !existsSync(path.join(root, relativePath)));
const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor !== 24) failures.push(`Node 24 required; found ${process.versions.node}`);

const mcp = JSON.parse(readFileSync(path.join(root, ".mcp.json"), "utf8"));
for (const name of ["cloudflare-docs", "cloudflare-api", "all2cf-worker-studio"]) {
  if (!mcp.mcpServers?.[name]) failures.push(`Missing MCP server ${name}`);
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    node: process.versions.node,
    cloudflareMcp: "configured",
    workerStudioMode: "capability-detected at task runtime",
    releaseDefault: "development",
  }, null, 2));
}

