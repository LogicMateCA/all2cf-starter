import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [readme, guide, agents, pkg] = await Promise.all([
  readFile(new URL("../README.md", import.meta.url), "utf8"),
  readFile(new URL("../AI-FIRST.md", import.meta.url), "utf8"),
  readFile(new URL("../AGENTS.md", import.meta.url), "utf8"),
  readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
]);

for (const marker of ["AGENT_MAP.md", "ai:context", "Blueprint", "materialization", "/dp", "Development", "Production", "upstreamed"]) assert.match(`${readme}\n${guide}`, new RegExp(marker.replace("/", "\\/"), "u"));
assert.match(guide, /Generated projects own[\s\S]*They do not require All2CF to build or run/u);
assert.match(guide, /What it does not replace/u);
assert.match(agents, /foundation bug is not complete/u);
assert.equal(pkg.scripts["ai:first:contract"], "node scripts/ai-first-positioning-contract.mjs");

console.log(JSON.stringify({ ok: true, positioning: "AI-first Cloudflare product factory", independentOutput: true }, null, 2));
