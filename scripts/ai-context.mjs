import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { collectKnowledge } from "./lib/knowledge.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const context = await collectKnowledge(root);
let operationalState = null;
try { operationalState = JSON.parse(await readFile(path.join(root, ".all2cf/state.local.json"), "utf8")); }
catch {}
const compact = {
  project: context.project,
  source: context.source,
  modules: context.modules.map(({ id, status, summary, path: modulePath }) => ({ id, status, summary, path: modulePath })),
  environments: context.environments.map(({ id, worker, domain, appEnv }) => ({ id, worker, domain, appEnv })),
  cloudflare: context.cloudflare.mcpPolicy,
  orchestration: {
    controller: context.orchestration.controller,
    workers: context.orchestration.workers,
  },
  currentChanges: context.changes.map(({ id, status, title }) => ({ id, status, title })),
  infrastructure: operationalState ? {
    resources: operationalState.resources,
    releases: operationalState.releases,
    observedAt: operationalState.updatedAt,
  } : null,
  recommendedReads: ["AGENTS.md", "PROJECT.md"],
};

console.log(JSON.stringify(compact, null, 2));
