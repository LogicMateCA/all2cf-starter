import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [agentMap, manifest, packageModel] = await Promise.all([
  readFile(path.join(root, ".ai/agent-map.json"), "utf8").then(JSON.parse),
  readFile(path.join(root, "starter.manifest.json"), "utf8").then(JSON.parse),
  readFile(path.join(root, "package.json"), "utf8").then(JSON.parse),
]);
const failures = [];
if (agentMap.schemaVersion !== "starter-agent-map/v1") failures.push("Agent Map schemaVersion is invalid");
const routeIds = new Set();
for (const route of agentMap.routes || []) {
  if (routeIds.has(route.id)) failures.push(`Duplicate Agent Map route ${route.id}`);
  routeIds.add(route.id);
  if (!route.summary || !route.triggers?.length || !route.primaryFiles?.length || !route.docs?.length || !route.checks?.length)
    failures.push(`Agent Map route ${route.id} is incomplete`);
  for (const relativePath of [...route.primaryFiles || [], ...route.docs || [], ...route.skills || []])
    try { await access(path.join(root, relativePath)); }
    catch { failures.push(`Agent Map route ${route.id} references missing ${relativePath}`); }
  for (const command of route.checks || []) {
    const match = command.match(/^npm run ([^ ]+)/u);
    if (match && !packageModel.scripts?.[match[1]]) failures.push(`Agent Map route ${route.id} references missing script ${match[1]}`);
  }
}
for (const relativePath of [...agentMap.defaultReads || [], ...agentMap.firstRunReads || []])
  try { await access(path.join(root, relativePath)); }
  catch { failures.push(`Agent Map references missing ${relativePath}`); }
const coveredModules = new Set((agentMap.routes || []).flatMap(({ moduleIds }) => moduleIds || []));
for (const moduleId of manifest.modules || [])
  if (!coveredModules.has(moduleId)) failures.push(`Agent Map does not route module ${moduleId}`);

function context(contextArgs) {
  const output = execFileSync(process.execPath, ["scripts/ai-context.mjs", "--json", ...contextArgs], { cwd: root, encoding: "utf8" });
  return { output, parsed: JSON.parse(output) };
}
const base = context([]);
if (Buffer.byteLength(base.output) > 12_000) failures.push(`Default AI context is ${Buffer.byteLength(base.output)} bytes; maximum is 12000`);
if (base.parsed.mode !== "map" || base.parsed.recommendedReads.length > 6 || base.parsed.currentChanges)
  failures.push("Default AI context is not a bounded map-only response");
const auth = context(["--task", "修复登录邮箱验证"]);
if (auth.parsed.agentMap.matches[0]?.id !== "auth-account" || !auth.parsed.recommendedReads.includes("workers/app/auth-config.ts"))
  failures.push("Task routing did not resolve auth-account");
const mobile = context(["--module", "mobile"]);
if ((manifest.modules || []).includes("mobile")) {
  if (mobile.parsed.agentMap.matches[0]?.id !== "mobile-expo") failures.push("Module routing did not resolve mobile-expo");
} else if (mobile.parsed.agentMap.matches.some(({ id }) => id === "mobile-expo")) {
  failures.push("Mobile route remained selectable after Mobile was removed from the product shape");
}
const setupConnector = context(["--task", "收口 Starter setup database connector 边界"]);
if (setupConnector.parsed.agentMap.matches[0]?.id !== "project-assembly") failures.push("Starter connector task escaped project-assembly");

console.log(JSON.stringify({
  ok: failures.length === 0,
  routes: routeIds.size,
  coveredModules: coveredModules.size,
  defaultBytes: Buffer.byteLength(base.output),
  defaultReads: base.parsed.recommendedReads.length,
  authRoute: auth.parsed.agentMap.matches[0]?.id || null,
  mobileRoute: mobile.parsed.agentMap.matches[0]?.id || null,
  setupConnectorRoute: setupConnector.parsed.agentMap.matches[0]?.id || null,
  failures,
}, null, 2));
if (failures.length) process.exitCode = 1;
