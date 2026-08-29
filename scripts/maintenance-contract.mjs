import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [app, setup, page, projectScript, codex, agents, skill, docs] = await Promise.all([
  read("apps/web/src/App.tsx"),
  read("apps/web/src/components/setup-page.tsx"),
  read("apps/web/src/components/update-page.tsx"),
  read("scripts/all2cf-project.mjs"),
  read("CODEX.md"),
  read("AGENTS.md"),
  read("plugins/all2cf-project/skills/starter-update/SKILL.md"),
  read("apps/docs/src/content/docs/docs/guides/all2cf-connection.md"),
]);

assert.match(app, /path === "\/maintenance"/u);
assert.match(app, /path === "\/update" \|\| path === "\/all2cf"/u);
assert.match(setup, /href="\/maintenance">Maintenance/u);
assert.match(setup, /Continue independently/u);
assert.match(setup, /Connect All2CF for paid MCP and updates/u);
assert.match(page, /Connect with Codex and All2CF MCP/u);
assert.match(page, /OAuth proves the All2CF user/u);
assert.match(page, /Manual project receipt/u);
assert.match(page, /server\. A local token never grants features by itself/u);
assert.match(page, /Use official Cloudflare MCP for Cloudflare resources/u);
assert.match(projectScript, /starter-update-auth\/v1/u);
assert.match(projectScript, /projectId: connected \? authorization\.projectId/u);
assert.match(projectScript, /workspace: receipt \? "generated-project" : "canonical-source"/u);
for (const source of [codex, agents, skill, docs]) assert.match(source, /\/maintenance/u);
for (const source of [codex, agents, skill, docs]) assert.match(source, /Cloudflare MCP/u);
assert.doesNotMatch(page, /localStorage/u);

console.log("All2CF MCP project maintenance contract passed");
