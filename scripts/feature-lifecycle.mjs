import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const registryPath = path.join(root, ".ai", "features.json");
const mapPath = path.join(root, ".ai", "agent-map.json");
const humanMapPath = path.join(root, "AGENT_MAP.md");
const args = process.argv.slice(2);
const command = args[0] || "status";
const flag = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : null;
};
const has = (name) => args.includes(`--${name}`);
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const unique = (values) => [...new Set(values.filter(Boolean))];
const safeId = (value) => {
  const id = String(value || "").trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error("Feature id must use lower-case hyphen-case");
  return id;
};
const split = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
const exists = (target) => access(path.join(root, target)).then(() => true, () => false);
async function readJson(target) { return JSON.parse(await readFile(target, "utf8")); }
async function registry() {
  const value = await readJson(registryPath);
  if (value.schemaVersion !== "starter-feature-registry/v1" || !Array.isArray(value.features)) throw new Error("Feature registry is invalid");
  return value;
}
function routeForFeature(feature) {
  return {
    id: feature.agentRouteId || feature.id,
    summary: feature.summary,
    triggers: unique([feature.id, feature.name, ...(feature.triggers || [])]),
    moduleIds: unique(feature.moduleIds || [feature.id]),
    primaryFiles: unique(feature.primaryFiles || []),
    docs: unique(feature.docs || []),
    checks: unique(feature.checks || []),
    skills: unique(feature.skills || []),
  };
}
async function sync({ write = false } = {}) {
  const [features, base] = await Promise.all([registry(), readJson(mapPath)]);
  const map = structuredClone(base);
  for (const feature of features.features) {
    const candidate = routeForFeature(feature);
    const existing = map.routes.find((route) => route.id === candidate.id);
    if (existing) {
      for (const key of ["triggers", "moduleIds", "primaryFiles", "docs", "checks", "skills"])
        existing[key] = unique([...(existing[key] || []), ...(candidate[key] || [])]);
      if (feature.agentRouteId == null) existing.summary = candidate.summary;
    } else map.routes.push(candidate);
  }
  const current = json(base);
  const next = json(map);
  if (write && current !== next) await writeFile(mapPath, next);
  if (write) await writeHumanMap(map);
  return { changed: current !== next, featureCount: features.features.length, routeCount: map.routes.length, map };
}
async function writeHumanMap(map) {
  const header = "# Agent Map\n\nUse this table as a fast router. Read one matched domain, not the whole repository.\n\n| Domain | Purpose | Primary files | Checks |\n|---|---|---|---|\n";
  const rows = map.routes.map((route) => `| \`${route.id}\` | ${String(route.summary || "").replaceAll("|", "\\|")} | ${(route.primaryFiles || []).slice(0, 3).map((file) => `\`${file}\``).join("<br>")} | ${(route.checks || []).slice(0, 2).map((check) => `\`${check}\``).join("<br>")} |`).join("\n");
  await writeFile(humanMapPath, `${header}${rows}\n`);
}
async function addFeature() {
  const id = safeId(flag("id"));
  const name = String(flag("name") || id).trim();
  const summary = String(flag("summary") || "").trim();
  if (!summary) throw new Error("--summary is required");
  const agentRouteId = flag("route") ? safeId(flag("route")) : null;
  const primaryFiles = split(flag("files"));
  if (!primaryFiles.length) throw new Error("--files requires at least one project-relative path");
  const value = await registry();
  if (value.features.some((feature) => feature.id === id)) throw new Error(`Feature ${id} already exists`);
  const moduleDoc = `features/${id}/MODULE.md`;
  await mkdir(path.dirname(path.join(root, moduleDoc)), { recursive: true });
  if (!(await exists(moduleDoc))) await writeFile(path.join(root, moduleDoc), `# ${name}\n\n${summary}\n\n## Ownership\n\nProduct-owned business functionality.\n\n## Verification\n\nKeep checks in \`.ai/features.json\` current.\n`);
  value.features.push({ id, name, summary, agentRouteId, source: "product", status: "active", triggers: split(flag("triggers")), moduleIds: [id], primaryFiles, docs: unique([moduleDoc, ...split(flag("docs"))]), checks: split(flag("checks")), skills: split(flag("skills")) });
  value.features.sort((left, right) => left.id.localeCompare(right.id));
  await writeFile(registryPath, json(value));
  await sync({ write: true });
  console.log(json({ ok: true, action: "feature-added", id, route: agentRouteId || id, moduleDoc }));
}
async function candidateDirectories(scanRoot) {
  const roots = ["src/features", "app/features", "apps/web/src/features", "apps/mobile/src/features"];
  const candidates = [];
  for (const relative of roots) {
    const absolute = path.join(scanRoot, relative);
    if (!(await stat(absolute).then((item) => item.isDirectory(), () => false))) continue;
    for (const entry of await readdir(absolute, { withFileTypes: true })) if (entry.isDirectory()) candidates.push({ id: safeId(entry.name), path: path.posix.join(relative, entry.name) });
  }
  return candidates;
}
async function adopt() {
  const scanRoot = path.resolve(root, flag("root") || ".");
  const current = await registry();
  const known = new Set(current.features.map((feature) => feature.id));
  const candidates = (await candidateDirectories(scanRoot)).filter((candidate) => !known.has(candidate.id)).map((candidate) => ({ ...candidate, name: candidate.id.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" "), suggestedRouteId: candidate.id, reason: "Independent feature directory" }));
  const report = { schemaVersion: "starter-feature-adoption-candidates/v1", scannedRoot: scanRoot, generatedAt: new Date().toISOString(), candidates };
  const output = path.join(root, ".ai", "feature-adoption-candidates.json");
  await writeFile(output, json(report));
  if (has("apply")) throw new Error("Automatic bulk apply is intentionally unsupported; review candidates and use feature:add for each accepted domain");
  console.log(json({ ok: true, output: path.relative(root, output), candidateCount: candidates.length, candidates }));
}
async function coverage() {
  const [features, map] = await Promise.all([registry(), readJson(mapPath)]);
  const featureRoots = await candidateDirectories(root);
  const covered = unique([
    ...features.features.flatMap((feature) => feature.primaryFiles || []),
    ...map.routes.flatMap((route) => route.primaryFiles || []),
  ]);
  const missing = featureRoots.filter((candidate) => !covered.some((target) => candidate.path === target || candidate.path.startsWith(`${target}/`) || target.startsWith(`${candidate.path}/`)));
  if (missing.length) throw new Error(`Unregistered feature directories:\n${missing.map((item) => `- ${item.path}`).join("\n")}\nRun feature:add or feature:adopt.`);
  const synced = await sync();
  if (synced.changed) throw new Error("Agent Map is stale; run npm run feature:sync");
  console.log(json({ ok: true, registeredFeatures: features.features.length, discoveredFeatureRoots: featureRoots.length, missing: 0, agentMapCurrent: true }));
}

if (command === "add") await addFeature();
else if (command === "adopt") await adopt();
else if (command === "sync") console.log(json({ ok: true, ...(await sync({ write: true })) }));
else if (command === "coverage") await coverage();
else if (command === "status") console.log(json({ ok: true, ...(await sync()), registry: await registry() }));
else throw new Error(`Unknown feature command ${command}`);
