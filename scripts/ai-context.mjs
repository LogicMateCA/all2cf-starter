import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectKnowledge } from "./lib/knowledge.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const context = await collectKnowledge(root);
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
  recommendedReads: ["AGENTS.md", "PROJECT.md"],
};

console.log(JSON.stringify(compact, null, 2));

