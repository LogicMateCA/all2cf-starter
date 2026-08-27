import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginRoot = path.join(root, "plugins/all2cf-project");
const failures = [];
const manifest = JSON.parse(await readFile(path.join(pluginRoot, ".codex-plugin/plugin.json"), "utf8"));
if (manifest.name !== "all2cf-project") failures.push("Plugin name must be all2cf-project");
if (manifest.mcpServers !== "./.mcp.json" || manifest.apps || manifest.hooks) failures.push("Plugin must declare only the available hosted MCP capability");
const mcp = JSON.parse(await readFile(path.join(pluginRoot, ".mcp.json"), "utf8"));
if (mcp.mcpServers?.all2cf?.type !== "http" || mcp.mcpServers?.all2cf?.url !== "https://app.all2cf.com/api/platform/mcp") failures.push("Plugin hosted MCP endpoint is invalid");
if (await stat(path.join(pluginRoot, "scripts")).then(() => true, () => false)) failures.push("Customer plugin must not ship execution scripts");
const expected = new Set(["cloudflare-release", "expo-release", "project-change", "project-doctor", "project-onboarding", "runtime-upgrade", "starter-update"]);
const actual = new Set(await readdir(path.join(pluginRoot, "skills")));
for (const name of expected) if (!actual.has(name)) failures.push(`Plugin is missing Skill ${name}`);
for (const name of actual) if (!expected.has(name)) failures.push(`Unexpected plugin Skill ${name}`);
for (const name of actual) {
  const source = await readFile(path.join(pluginRoot, "skills", name, "SKILL.md"), "utf8");
  if (!source.startsWith("---\n") || source.includes("[TODO:")) failures.push(`Plugin Skill ${name} is invalid or unfinished`);
}
if (failures.length) throw new Error(`All2CF plugin contract failed:\n- ${failures.join("\n- ")}`);
console.log(JSON.stringify({ ok: true, plugin: manifest.name, version: manifest.version, skills: [...actual].sort(), mcp: mcp.mcpServers.all2cf.url }, null, 2));
