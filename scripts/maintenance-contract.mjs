import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [app, setup, page, projectScript, updateClient, materializer, foundation, vite, gitignore, codex, agents, skill, docs] = await Promise.all([
  read("apps/web/src/App.tsx"),
  read("apps/web/src/components/setup-page.tsx"),
  read("apps/web/src/components/update-page.tsx"),
  read("scripts/all2cf-project.mjs"),
  read("scripts/starter-link.mjs"),
  read("scripts/materialize-blueprint.mjs"),
  read("foundation/managed-files.json"),
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
assert.match(page, /Component versions/u);
assert.match(page, /Check & review/u);
assert.match(page, /Runtime stack/u);
assert.match(page, /Will update/u);
assert.match(page, /Will keep/u);
assert.match(page, /Blocked conflicts/u);
assert.match(page, /maintenance-toolbar/u);
assert.match(page, /!diffPlan/u);
assert.match(page, /diffPlan\.summary\.conflicts/u);
assert.match(page, /Advanced diagnostics/u);
assert.match(page, /What changed/u);
assert.match(page, /Update to \$\{available\.engineVersion\}/u);
assert.match(page, /Advanced recovery/u);
assert.match(projectScript, /starter-update-auth\/v1/u);
assert.match(projectScript, /projectId: connected \? authorization\.projectId/u);
assert.match(projectScript, /workspace: receipt \? "generated-project" : "canonical-source"/u);
assert.match(updateClient, /resolution\.entitlement/u);
assert.match(updateClient, /resolution\.release\?\.notes/u);
assert.match(updateClient, /resolution\.release\?\.url/u);
assert.match(updateClient, /starter-update-backup\/v1/u);
assert.match(updateClient, /verifyProject\("pre-update"\)/u);
assert.match(updateClient, /restoreUpdateBackup/u);
assert.match(updateClient, /starter-update-lock\/v1/u);
assert.match(updateClient, /Another Starter update is already running/u);
assert.match(materializer, /keep-local-file/u);
assert.match(materializer, /keep-local-generated/u);
assert.match(materializer, /both product and Starter changes/u);
assert.match(materializer, /localOverrides/u);
assert.match(materializer, /assertNoSymlinkTraversal/u);
assert.match(materializer, /collides by case/u);
assert.match(materializer, /functionalUpdateOnly/u);
assert.match(materializer, /frozenPageTargets/u);
assert.match(materializer, /generatedDesign/u);
assert.match(updateClient, /STARTER_UPDATE_SCOPE/u);
assert.match(foundation, /foundation\.core/u);
assert.match(foundation, /apps\/web\/src\/components\/update-page\.tsx/u);
for (const file of ["AGENTS.md", "AGENT_MAP.md", "CODEX.md"]) assert.match(foundation, new RegExp(`"${file.replace(".", "\\.")}"`, "u"));
assert.match(vite, /code_challenge_method: "S256"/u);
assert.match(vite, /starter-connections\/authorization-requests/u);
assert.match(vite, /starter-connections\/token/u);
assert.match(vite, /components: \[\.\.\.\(status\.packs \|\| \[\]\), \.\.\.\(status\.catalog \|\| \[\]\)\]/u);
assert.match(vite, /\["Better Auth", "better-auth"\]/u);
assert.match(vite, /runtime: await starterRuntimeVersions\(\)/u);
assert.match(vite, /pending\.state !== payload\.state/u);
assert.match(vite, /all2cf-project-connection\/v1/u);
assert.match(gitignore, /all2cf-connection-oauth\.local\.json/u);
assert.match(gitignore, /installation\.local\.json/u);
for (const source of [codex, agents, skill, docs]) assert.match(source, /\/maintenance/u);
for (const source of [codex, agents, skill, docs]) assert.match(source, /Cloudflare MCP/u);
assert.doesNotMatch(page, /localStorage/u);

console.log("All2CF MCP project maintenance contract passed");
