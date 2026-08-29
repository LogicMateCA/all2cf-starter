import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [app, setup, page, projectScript, updateClient, vite, gitignore, codex, agents, skill, docs] = await Promise.all([
  read("apps/web/src/App.tsx"),
  read("apps/web/src/components/setup-page.tsx"),
  read("apps/web/src/components/update-page.tsx"),
  read("scripts/all2cf-project.mjs"),
  read("scripts/starter-link.mjs"),
  read("apps/web/vite.config.ts"),
  read(".gitignore"),
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
assert.match(page, /Connect All2CF MCP/u);
assert.match(page, /all2cf\/authorize/u);
assert.match(page, /all2cf\/complete/u);
assert.match(page, /Local version/u);
assert.match(page, /Cloud version/u);
assert.match(page, /What changed/u);
assert.match(page, /Update to \$\{available\.engineVersion\}/u);
assert.match(page, /Advanced recovery/u);
assert.match(projectScript, /starter-update-auth\/v1/u);
assert.match(projectScript, /projectId: connected \? authorization\.projectId/u);
assert.match(projectScript, /workspace: receipt \? "generated-project" : "canonical-source"/u);
assert.match(updateClient, /resolution\.entitlement/u);
assert.match(updateClient, /resolution\.release\?\.notes/u);
assert.match(updateClient, /resolution\.release\?\.url/u);
assert.match(vite, /code_challenge_method: "S256"/u);
assert.match(vite, /starter-connections\/authorization-requests/u);
assert.match(vite, /starter-connections\/token/u);
assert.match(vite, /pending\.state !== payload\.state/u);
assert.match(vite, /all2cf-project-connection\/v1/u);
assert.match(gitignore, /all2cf-connection-oauth\.local\.json/u);
assert.match(gitignore, /installation\.local\.json/u);
for (const source of [codex, agents, skill, docs]) assert.match(source, /\/maintenance/u);
for (const source of [codex, agents, skill, docs]) assert.match(source, /Cloudflare MCP/u);
assert.doesNotMatch(page, /localStorage/u);

console.log("All2CF MCP project maintenance contract passed");
