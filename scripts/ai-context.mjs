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
  assembly: {
    setup: context.assembly.blueprint.setup,
    preset: context.assembly.blueprint.preset,
    designProfile: context.assembly.blueprint.designProfile,
    pageSet: context.assembly.blueprint.pageSet,
    selections: context.assembly.blueprint.selections,
    providers: context.assembly.blueprint.providers,
    catalogVersion: context.assembly.catalog.catalogVersion,
    catalogPresets: context.assembly.catalog.presets,
    catalogPacks: context.assembly.catalog.packs.map(({ id, kind, status, ownership, updatePolicy }) => ({ id, kind, status, ownership, updatePolicy })),
    designProfiles: context.assembly.designCatalog.profiles.map(({ id, version, packId, status, targets, adapters }) => ({ id, version, packId, status, targets, adapters })),
    pages: context.assembly.pageCatalog.pages.map(({ id, packId, route, renderer, required, status }) => ({ id, packId, route, renderer, required, status, selected: context.assembly.blueprint.pageSet.selected.includes(id) })),
  },
  modules: context.modules.map(({ id, status, summary, path: modulePath }) => ({ id, status, summary, path: modulePath })),
  environments: context.environments.map(({ id, worker, domain, appEnv }) => ({ id, worker, domain, appEnv })),
  cloudflare: context.cloudflare.mcpPolicy,
  orchestration: {
    controller: context.orchestration.controller,
    workers: context.orchestration.workers,
  },
  currentChanges: context.changes.map(({ id, status, title }) => ({ id, status, title })),
  infrastructure: operationalState ? {
    source: "local-evidence-cache",
    liveReadbackRequired: true,
    resources: operationalState.resources,
    releases: operationalState.releases,
    observedAt: operationalState.updatedAt,
  } : null,
  releaseAlignment: operationalState ? {
    currentCommit: context.source.commit,
    developmentCommit: operationalState.releases?.development?.commit || null,
    productionCommit: operationalState.releases?.production?.commit || null,
    developmentMatchesCurrent: Boolean(context.source.commit && operationalState.releases?.development?.commit === context.source.commit),
    productionMatchesCurrent: Boolean(context.source.commit && operationalState.releases?.production?.commit === context.source.commit),
    dirty: context.source.dirty
  } : null,
  recommendedReads: ["AGENTS.md", "PROJECT.md", "starter.blueprint.json", "catalog/catalog.json", "design/catalog.json", "pages/catalog.json", "DESIGN.md", ...context.changes.map(({ path: changePath }) => changePath), ...context.modules.map(({ path: modulePath }) => modulePath)],
};

console.log(JSON.stringify(compact, null, 2));
