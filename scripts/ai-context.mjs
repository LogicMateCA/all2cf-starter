import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { collectKnowledge } from "./lib/knowledge.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const valueAfter = (name) => {
  const exact = args.indexOf(name);
  if (exact >= 0) return args[exact + 1] || "";
  const prefixed = args.find((value) => value.startsWith(`${name}=`));
  return prefixed ? prefixed.slice(name.length + 1) : "";
};
const full = args.includes("--full") || args.includes("--first-run");
const task = valueAfter("--task").trim();
const requestedModule = valueAfter("--module").trim();
const readJson = async (relativePath) => JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
const git = (gitArgs, fallback = null) => {
  try {
    return execFileSync("git", gitArgs, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || fallback;
  } catch {
    return fallback;
  }
};
const unique = (values) => [...new Set(values.filter(Boolean))];
const normalize = (value) => String(value || "").trim().toLocaleLowerCase();

async function readOperationalState() {
  try { return await readJson(".all2cf/state.local.json"); }
  catch { return null; }
}

function releaseAlignment(commit, dirty, operationalState) {
  if (!operationalState) return null;
  return {
    source: "local-evidence-cache",
    liveReadbackRequired: true,
    currentCommit: commit,
    developmentCommit: operationalState.releases?.development?.commit || null,
    productionCommit: operationalState.releases?.production?.commit || null,
    developmentMatchesCurrent: Boolean(commit && operationalState.releases?.development?.commit === commit),
    productionMatchesCurrent: Boolean(commit && operationalState.releases?.production?.commit === commit),
    dirty,
  };
}

function routeScore(route, query) {
  const normalized = normalize(query);
  if (!normalized) return 0;
  let score = normalize(route.id) === normalized ? 20 : 0;
  for (const trigger of route.triggers || []) {
    const candidate = normalize(trigger);
    if (normalized.includes(candidate)) score += Math.max(3, candidate.length);
    else if (candidate.includes(normalized) && normalized.length >= 3) score += 2;
  }
  for (const moduleId of route.moduleIds || [])
    if (normalized.includes(normalize(moduleId))) score += 8;
  return score;
}

async function relevantChanges(route, query) {
  if (!route || !query) return [];
  const entries = await readdir(path.join(root, "changes"), { withFileTypes: true });
  const matchedTriggers = (route.triggers || []).filter((term) => normalize(query).includes(normalize(term))).map(normalize);
  const ranked = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name.startsWith("_")) continue;
    const relativePath = `changes/${entry.name}`;
    const source = await readFile(path.join(root, relativePath), "utf8");
    const end = source.startsWith("---\n") ? source.indexOf("\n---\n", 4) : -1;
    const frontmatter = end > 0 ? YAML.parse(source.slice(4, end)) || {} : {};
    const affectedModules = new Set((frontmatter.affectedModules || []).map(normalize));
    const header = normalize(`${entry.name}\n${frontmatter.id || ""}\n${frontmatter.title || ""}`);
    const moduleScore = (route.moduleIds || []).reduce((total, moduleId) => total + (affectedModules.has(normalize(moduleId)) ? 20 : 0), 0);
    const triggerScore = matchedTriggers.reduce((total, term) => total + (header.includes(term) ? Math.max(4, term.length) : 0), 0);
    const score = moduleScore + triggerScore;
    if (score) ranked.push({ path: relativePath, score });
  }
  return ranked.sort((left, right) => right.score - left.score || right.path.localeCompare(left.path)).slice(0, 3).map(({ path: changePath }) => changePath);
}

async function lightweightContext() {
  const [manifest, blueprint, materialization, agentMap, starterConfig, operationalState] = await Promise.all([
    readJson("starter.manifest.json"),
    readJson("starter.blueprint.json"),
    readJson(".starter/materialization.json"),
    readJson(".ai/agent-map.json"),
    readJson("starter.config.json"),
    readOperationalState(),
  ]);
  const commit = git(["rev-parse", "HEAD"]);
  const dirty = Boolean(git(["status", "--porcelain"], ""));
  const selected = Object.entries(blueprint.selections || {}).flatMap(([group, selections]) =>
    selections.filter(({ lifecycle }) => lifecycle.selected).map(({ id, lifecycle }) => ({ group, id, materialized: lifecycle.materialized })),
  );
  const query = requestedModule || task;
  const matches = (agentMap.routes || [])
    .map((route) => ({ route, score: requestedModule && route.moduleIds?.includes(requestedModule) ? 100 : routeScore(route, query) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.route.id.localeCompare(right.route.id))
    .slice(0, 3)
    .map(({ route }) => route);
  const primary = matches[0] || null;
  const changes = await relevantChanges(primary, query);
  const recommendedReads = unique([
    ...agentMap.defaultReads,
    ...(primary?.primaryFiles || []),
    ...(primary?.docs || []),
    ...(primary?.skills || []),
    ...changes,
  ]);
  return {
    schemaVersion: "starter-agent-context/v2",
    mode: query ? "task" : "map",
    query: query || null,
    project: { name: manifest.project.name, slug: manifest.project.slug, status: manifest.state },
    source: { commit, branch: git(["branch", "--show-current"]), dirty },
    setup: {
      entry: blueprint.setup.entry,
      status: blueprint.setup.status,
      firstRunComplete: blueprint.setup.status === "ready",
      currentStep: blueprint.setup.currentStep,
    },
    selection: {
      preset: blueprint.preset,
      stylekit: blueprint.stylekit,
      visualIntegration: blueprint.visualIntegration,
      selected,
      materializedPacks: Object.keys(materialization.packs || {}),
    },
    environments: [
      { id: "development", worker: starterConfig.development.worker, domain: starterConfig.development.domain },
      { id: "production", worker: starterConfig.production.worker, domain: starterConfig.production.domain },
    ],
    releaseAlignment: releaseAlignment(commit, dirty, operationalState),
    agentMap: {
      path: ".ai/agent-map.json",
      version: agentMap.version,
      rules: agentMap.rules,
      routeIndex: agentMap.routes.map(({ id, summary, moduleIds }) => ({ id, summary, moduleIds })),
      matches: matches.map(({ id, summary, moduleIds, primaryFiles, docs, checks, skills }) => ({ id, summary, moduleIds, primaryFiles, docs, checks, skills })),
    },
    relevantChanges: changes,
    recommendedReads,
    checks: unique(matches.flatMap((route) => route.checks || [])),
    next: primary
      ? `Read only recommendedReads for route ${primary.id}; widen with rg only if evidence is missing.`
      : "Choose a route with --task or --module before reading feature files. Use --full only for first-run or whole-project work.",
  };
}

async function fullContext() {
  const [context, operationalState, agentMap] = await Promise.all([
    collectKnowledge(root),
    readOperationalState(),
    readJson(".ai/agent-map.json"),
  ]);
  return {
    schemaVersion: "starter-agent-context/v2",
    mode: "full",
    project: context.project,
    source: context.source,
    assembly: {
      setup: context.assembly.blueprint.setup,
      preset: context.assembly.blueprint.preset,
      designProfile: context.assembly.blueprint.designProfile,
      stylekitLock: context.assembly.blueprint.stylekit,
      visualIntegration: context.assembly.blueprint.visualIntegration,
      pageSet: context.assembly.blueprint.pageSet,
      selections: context.assembly.blueprint.selections,
      providers: context.assembly.blueprint.providers,
      materialization: context.assembly.materialization,
      catalogVersion: context.assembly.catalog.catalogVersion,
      catalogPresets: context.assembly.catalog.presets,
      catalogPacks: context.assembly.catalog.packs.map(({ id, kind, status, ownership, updatePolicy }) => ({ id, kind, status, ownership, updatePolicy })),
      designProfiles: context.assembly.designCatalog.profiles.map(({ id, version, packId, status, targets, dials, adapters }) => ({ id, version, packId, status, targets, dials, adapters })),
      visualService: context.assembly.visualIntegration,
      stylekit: context.assembly.stylekit,
      pages: context.assembly.pageCatalog.pages.map(({ id, packId, route, renderer, required, status }) => ({ id, packId, route, renderer, required, status, selected: context.assembly.blueprint.pageSet.selected.includes(id) })),
    },
    modules: context.modules.map(({ id, status, summary, path: modulePath }) => ({ id, status, summary, path: modulePath })),
    environments: context.environments.map(({ id, worker, domain, appEnv }) => ({ id, worker, domain, appEnv })),
    cloudflare: context.cloudflare.mcpPolicy,
    orchestration: { controller: context.orchestration.controller, workers: context.orchestration.workers },
    currentChanges: context.changes.map(({ id, status, title, path: changePath }) => ({ id, status, title, path: changePath })),
    infrastructure: operationalState ? {
      source: "local-evidence-cache",
      liveReadbackRequired: true,
      resources: operationalState.resources,
      releases: operationalState.releases,
      observedAt: operationalState.updatedAt,
    } : null,
    releaseAlignment: releaseAlignment(context.source.commit, context.source.dirty, operationalState),
    recommendedReads: unique(["AGENTS.md", "AGENT_MAP.md", ...agentMap.firstRunReads]),
  };
}

console.log(JSON.stringify(full ? await fullContext() : await lightweightContext(), null, 2));
