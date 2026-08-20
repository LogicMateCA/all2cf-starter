import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateAssemblyContracts, validateMaterializerDeliveryContracts } from "./lib/assembly.mjs";
import { renderDesignCSS, renderMobileDesign } from "./lib/design-engine.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apply = process.argv.includes("--apply");
const check = process.argv.includes("--check");
const blueprintPath = path.join(root, "starter.blueprint.json");
const statePath = path.join(root, ".starter/materialization.json");
const routeRegistryPath = path.join(root, "apps/web/src/generated/capability-routes.tsx");
const workerCapabilityRoutesPath = path.join(root, "workers/app/generated/capability-routes.ts");
const serverAuthRegistryPath = path.join(root, "workers/app/generated/auth-plugins.ts");
const clientAuthRegistryPath = path.join(root, "apps/web/src/generated/auth-plugins.ts");
const webDesignPath = path.join(root, "apps/web/src/generated/design-profile.css");
const marketingDesignPath = path.join(root, "apps/marketing/src/styles/generated-design-profile.css");
const docsDesignPath = path.join(root, "apps/docs/src/styles/generated-design-profile.css");
const mobileDesignPath = path.join(root, "apps/mobile/generated/design-profile.ts");
const marketingProjectPath = path.join(root, "apps/marketing/src/generated/project.ts");
const packageLockPath = path.join(root, "package-lock.json");
const workerFirstConfigPaths = [
  path.join(root, "cloudflare/wrangler.development.jsonc"),
  path.join(root, "cloudflare/wrangler.production.jsonc"),
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

async function optionalRead(file) {
  try { return await readFile(file, "utf8"); }
  catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function safeProjectPath(relativePath, label) {
  if (!relativePath || path.isAbsolute(relativePath) || relativePath.split(/[\\/]/u).includes("..")) throw new Error(`${label} must be a project-relative path`);
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw new Error(`${label} escapes the project root`);
  return resolved;
}

function safePackPath(packRoot, relativePath, label) {
  if (!relativePath || path.isAbsolute(relativePath) || relativePath.split(/[\\/]/u).includes("..")) throw new Error(`${label} must remain inside its pack`);
  const resolved = path.resolve(packRoot, relativePath);
  if (!resolved.startsWith(`${packRoot}${path.sep}`)) throw new Error(`${label} escapes its pack`);
  return resolved;
}

async function readState() {
  const source = await optionalRead(statePath);
  return source ? JSON.parse(source) : { schemaVersion: "starter-materialization/v1", packs: {}, dependencies: {}, generatedRoutesHash: null, generatedWorkerFirstRoutes: [] };
}

async function readPackManifests() {
  const packsRoot = path.join(root, "packs");
  const entries = await readdir(packsRoot, { recursive: true });
  const manifests = [];
  for (const entry of entries.filter((name) => String(name).endsWith("pack.json")).sort()) {
    const file = path.join(packsRoot, String(entry));
    const packRoot = path.dirname(file);
    const manifest = JSON.parse(await readFile(file, "utf8"));
    if (manifest.schemaVersion !== "starter-pack/v1") throw new Error(`${path.relative(root, file)} must use starter-pack/v1`);
    for (const field of ["files", "dependencies", "routes"]) if (!Array.isArray(manifest[field])) throw new Error(`${path.relative(root, file)} must declare ${field} as an array`);
    for (const [pageId, entries] of Object.entries(manifest.pageFiles || {})) {
      if (!Array.isArray(entries) || !entries.length) throw new Error(`${path.relative(root, file)} must declare pageFiles.${pageId} as a non-empty array`);
    }
    for (const [side, plugin] of Object.entries(manifest.authPlugins || {})) {
      if (!new Set(["server", "client"]).has(side) || !plugin || typeof plugin.module !== "string" || typeof plugin.export !== "string") throw new Error(`${path.relative(root, file)} has an invalid ${side} auth plugin declaration`);
    }
    for (const route of manifest.routes) {
      if (typeof route.workerFirst !== "boolean") throw new Error(`${path.relative(root, file)} route ${route.path || "<missing>"} must declare workerFirst`);
      if (typeof route.path !== "string" || !/^\/(?:[A-Za-z0-9._~-]+\/?)*$/u.test(route.path)) throw new Error(`${path.relative(root, file)} route ${route.path || "<missing>"} must be a safe exact application path`);
    }
    if (manifests.some(({ manifest: current }) => current.id === manifest.id)) throw new Error(`Duplicate materialization pack ${manifest.id}`);
    manifests.push({ file, packRoot, manifest });
  }
  return manifests;
}

function renderRoutes(routes) {
  const lines = [
    "// Generated by scripts/materialize-blueprint.mjs. Do not edit by hand.",
    routes.length
      ? "import { lazy, type ComponentType, type LazyExoticComponent } from \"react\";"
      : "import type { ComponentType, LazyExoticComponent } from \"react\";",
    "",
    "export type CapabilityRoute = {",
    "  path: string;",
    "  Component: LazyExoticComponent<ComponentType>;",
    "};",
    "",
  ];
  routes.forEach((route, index) => {
    lines.push(`const CapabilityRoute${index} = lazy(async () => {`);
    lines.push(`  const module = await import(${JSON.stringify(route.module)});`);
    lines.push(`  return { default: module.${route.export} };`);
    lines.push("});", "");
  });
  lines.push("export const capabilityRoutes: CapabilityRoute[] = [");
  routes.forEach((route, index) => lines.push(`  { path: ${JSON.stringify(route.path)}, Component: CapabilityRoute${index} },`));
  lines.push("];", "");
  return lines.join("\n");
}

function renderWorkerCapabilityRoutes(routes) {
  return [
    "// Generated by scripts/materialize-blueprint.mjs. Do not edit by hand.",
    `export const workerCapabilityRoutePaths = ${JSON.stringify(routes)} as const;`,
    "",
  ].join("\n");
}

const workerFirstExpression = /^(\s*"run_worker_first"\s*:\s*)(\[[\s\S]*?\])/mu;

function readWorkerFirstRoutes(source) {
  const match = source.match(workerFirstExpression);
  if (!match) throw new Error("assets.run_worker_first must remain a literal array for pack route materialization");
  const routes = JSON.parse(match[2]);
  if (!Array.isArray(routes) || routes.some((routePath) => typeof routePath !== "string")) throw new Error("assets.run_worker_first must contain only route strings");
  return routes;
}

function renderWorkerFirstConfig(source, routes) {
  const match = source.match(workerFirstExpression);
  if (!match) throw new Error("assets.run_worker_first must remain a literal array for pack route materialization");
  const indentation = match[1].match(/^\s*/u)?.[0] || "";
  const rendered = routes.length
    ? `[\n${routes.map((routePath) => `${indentation}  ${JSON.stringify(routePath)}`).join(",\n")}\n${indentation}]`
    : "[]";
  return source.replace(workerFirstExpression, `${match[1]}${rendered}`);
}

function renderServerAuthPlugins(entries, features) {
  const lines = [
    "// Generated by scripts/materialize-blueprint.mjs. Do not edit by hand.",
    "import type { Pool } from \"pg\";",
    "import type { AuthEmail } from \"../auth-config\";",
  ];
  entries.forEach((entry, index) => lines.push(`import { ${entry.export} as createAuthPlugin${index} } from ${JSON.stringify(entry.module)};`));
  lines.push(
    "",
    "export type SelectedAuthPluginInput = {",
    "  baseURL: string;",
    "  appEnvironment: string;",
    "  database: Pool;",
    "  enqueueEmail: (email: AuthEmail) => Promise<void>;",
    "  stripeSecretKey?: string;",
    "  stripeWebhookSecret?: string;",
    "  stripePricePro?: string;",
    "};",
    "",
    `export const selectedAuthFeatures = ${JSON.stringify(features)} as const;`,
    "",
    "export function createSelectedAuthPlugins(input: SelectedAuthPluginInput) {",
    "  return [",
  );
  entries.forEach((entry, index) => lines.push(`    createAuthPlugin${index}(input, selectedAuthFeatures),`));
  lines.push("  ];", "}", "");
  return lines.join("\n");
}

function renderClientAuthPlugins(entries) {
  const lines = ["// Generated by scripts/materialize-blueprint.mjs. Do not edit by hand."];
  entries.forEach((entry, index) => lines.push(`import { ${entry.export} as createAuthClientPlugin${index} } from ${JSON.stringify(entry.module)};`));
  lines.push("", "export function createSelectedAuthClientPlugins() {", "  return [");
  entries.forEach((_entry, index) => lines.push(`    createAuthClientPlugin${index}(),`));
  lines.push("  ];", "}", "");
  return lines.join("\n");
}

function renderMarketingProject(blueprint, pageCatalog, selectedPacks, selectedPages) {
  const pages = pageCatalog.pages.filter(({ id }) => selectedPages.has(id)).map(({ id, route, renderer }) => ({ id, route, renderer }));
  const value = {
    name: blueprint.project.name,
    slug: blueprint.project.slug,
    brief: blueprint.project.brief,
    defaultLocale: blueprint.project.defaultLocale,
    locales: blueprint.project.locales,
    platforms: blueprint.project.platforms,
    designProfile: blueprint.designProfile,
    pages,
    publicPageCount: pages.filter(({ renderer }) => renderer === "astro-static").length,
    selectedPackCount: selectedPacks.size,
    billingSelected: selectedPacks.has("saas.billing-stripe"),
  };
  return [
    "// Generated by scripts/materialize-blueprint.mjs. Do not edit by hand.",
    `export const project = ${JSON.stringify(value, null, 2)} as const;`,
    "const selectedPageIds = new Set<string>(project.pages.map(({ id }) => id));",
    "export function routeSelected(id: string) { return selectedPageIds.has(id); }",
    "",
  ].join("\n");
}

const blueprint = JSON.parse(await readFile(blueprintPath, "utf8"));
const state = await readState();
const starterManifest = JSON.parse(await readFile(path.join(root, "starter.manifest.json"), "utf8"));
const catalog = JSON.parse(await readFile(path.join(root, "catalog/catalog.json"), "utf8"));
const designCatalog = JSON.parse(await readFile(path.join(root, "design/catalog.json"), "utf8"));
const pageCatalog = JSON.parse(await readFile(path.join(root, "pages/catalog.json"), "utf8"));
const catalogPacks = new Map(catalog.packs.map((pack) => [pack.id, pack]));
const selected = new Set(Object.values(blueprint.selections).flat().filter(({ lifecycle }) => lifecycle.selected).map(({ id }) => id));
const selectedPages = new Set(blueprint.pageSet.selected);
const pageDefinitions = new Map(pageCatalog.pages.map((page) => [page.id, page]));
const selectedProfile = designCatalog.profiles.find(({ id }) => id === blueprint.designProfile.id);
if (!selectedProfile || selectedProfile.version !== blueprint.designProfile.version) throw new Error(`Selected Design Profile ${blueprint.designProfile.id}@${blueprint.designProfile.version} is missing from the Design Catalog`);
const manifests = await readPackManifests();
const contractFailures = validateAssemblyContracts(starterManifest, blueprint, catalog, designCatalog, pageCatalog);
if (contractFailures.length) throw new Error(`Assembly contract failed:\n- ${contractFailures.join("\n- ")}`);
const deliveryFailures = validateMaterializerDeliveryContracts(catalog, manifests);
if (deliveryFailures.length) throw new Error(`Materializer delivery contract failed:\n- ${deliveryFailures.join("\n- ")}`);
const selectedManifests = manifests.filter(({ manifest }) => selected.has(manifest.id));
const desiredFiles = new Map();
const desiredDependencies = new Map();
const desiredRoutes = [];
const desiredServerAuthPlugins = [];
const desiredClientAuthPlugins = [];

for (const { file, packRoot, manifest } of manifests) {
  const catalogPack = catalogPacks.get(manifest.id);
  if (!catalogPack) throw new Error(`${path.relative(root, file)} references a pack missing from the Catalog`);
  if (catalogPack.version !== manifest.version) throw new Error(`${manifest.id} manifest version ${manifest.version} does not match Catalog version ${catalogPack.version}`);
  for (const pageId of Object.keys(manifest.pageFiles || {})) {
    const page = pageDefinitions.get(pageId);
    if (!page) throw new Error(`${manifest.id} references missing Page Catalog entry ${pageId}`);
    if (page.packId !== manifest.id) throw new Error(`${manifest.id} cannot own ${pageId}, which belongs to ${page.packId}`);
  }
}

async function addDesiredFile(packRoot, manifest, entry) {
  const target = path.relative(root, safeProjectPath(entry.target, `${manifest.id} target`));
  if (desiredFiles.has(target)) throw new Error(`Materialization file collision at ${target}`);
  const source = safePackPath(packRoot, entry.source, `${manifest.id} source`);
  desiredFiles.set(target, { packId: manifest.id, version: manifest.version, content: await readFile(source, "utf8") });
}

for (const { packRoot, manifest } of selectedManifests) {
  for (const entry of manifest.files) await addDesiredFile(packRoot, manifest, entry);
  for (const [pageId, entries] of Object.entries(manifest.pageFiles || {})) if (selectedPages.has(pageId)) for (const entry of entries) await addDesiredFile(packRoot, manifest, entry);
  for (const dependency of manifest.dependencies) {
    safeProjectPath(dependency.packageFile, `${manifest.id} packageFile`);
    const key = [dependency.packageFile, dependency.section, dependency.name].join("|");
    const current = desiredDependencies.get(key);
    if (current && current.version !== dependency.version) throw new Error(`Dependency version collision for ${dependency.name}`);
    desiredDependencies.set(key, { ...dependency, packId: manifest.id });
  }
  for (const route of manifest.routes) {
    if (desiredRoutes.some(({ path: current }) => current === route.path)) throw new Error(`Capability route collision at ${route.path}`);
    desiredRoutes.push({ ...route, packId: manifest.id });
  }
  if (manifest.authPlugins?.server) desiredServerAuthPlugins.push({ ...manifest.authPlugins.server, packId: manifest.id });
  if (manifest.authPlugins?.client) desiredClientAuthPlugins.push({ ...manifest.authPlugins.client, packId: manifest.id });
}

desiredRoutes.sort((left, right) => left.path.localeCompare(right.path));
const desiredWorkerFirstRoutes = desiredRoutes.filter(({ workerFirst }) => workerFirst).map(({ path: routePath }) => routePath);
const desiredRouteSource = renderRoutes(desiredRoutes);
const desiredWorkerCapabilityRouteSource = renderWorkerCapabilityRoutes(desiredWorkerFirstRoutes);
const desiredAuthFeatures = {
  organizations: selected.has("saas.team-organizations"),
  stripeBilling: selected.has("saas.billing-stripe"),
};
const desiredServerAuthSource = renderServerAuthPlugins(desiredServerAuthPlugins, desiredAuthFeatures);
const desiredClientAuthSource = renderClientAuthPlugins(desiredClientAuthPlugins);
const desiredDesignCSS = renderDesignCSS(selectedProfile);
const desiredMobileDesign = renderMobileDesign(selectedProfile);
const desiredMarketingProject = renderMarketingProject(blueprint, pageCatalog, selected, selectedPages);
const changes = [];
const failures = [];
const previousFiles = new Map(Object.entries(state.packs || {}).flatMap(([packId, pack]) => Object.entries(pack.files || {}).map(([target, hash]) => [target, { packId, hash }])));

for (const [target, desired] of desiredFiles) {
  const current = await optionalRead(safeProjectPath(target, "materialized target"));
  if (current === desired.content) continue;
  const previous = previousFiles.get(target);
  if (current !== null && (!previous || sha256(current) !== previous.hash)) failures.push(`${target} exists outside the matching materialization receipt`);
  else changes.push({ kind: current === null ? "add-file" : "update-file", target, packId: desired.packId });
}

for (const [target, previous] of previousFiles) {
  if (desiredFiles.has(target)) continue;
  const current = await optionalRead(safeProjectPath(target, "owned target"));
  if (current === null) continue;
  if (sha256(current) !== previous.hash) failures.push(`${target} changed after materialization and cannot be removed automatically`);
  else changes.push({ kind: "remove-file", target, packId: previous.packId });
}

const packageModels = new Map();
for (const dependency of [...desiredDependencies.values(), ...Object.values(state.dependencies || {})]) {
  if (!packageModels.has(dependency.packageFile)) packageModels.set(dependency.packageFile, JSON.parse(await readFile(safeProjectPath(dependency.packageFile, "packageFile"), "utf8")));
}
for (const [key, desired] of desiredDependencies) {
  const model = packageModels.get(desired.packageFile);
  const current = model?.[desired.section]?.[desired.name];
  if (current === desired.version) continue;
  const previous = state.dependencies?.[key];
  if (current !== undefined && (!previous || current !== previous.version)) failures.push(`${desired.packageFile} already owns ${desired.name}@${current}`);
  else changes.push({ kind: current === undefined ? "add-dependency" : "update-dependency", target: `${desired.packageFile}:${desired.name}`, packId: desired.packId });
}
for (const [key, previous] of Object.entries(state.dependencies || {})) {
  if (desiredDependencies.has(key)) continue;
  const model = packageModels.get(previous.packageFile);
  const current = model?.[previous.section]?.[previous.name];
  if (current === undefined) continue;
  if (current !== previous.version) failures.push(`${previous.packageFile} changed ${previous.name} after materialization and cannot remove it automatically`);
  else changes.push({ kind: "remove-dependency", target: `${previous.packageFile}:${previous.name}`, packId: previous.packId });
}

const currentRouteSource = await optionalRead(routeRegistryPath);
if (currentRouteSource !== desiredRouteSource) {
  const baseline = renderRoutes([]);
  const safeCurrent = state.generatedRoutesHash ? sha256(currentRouteSource || "") === state.generatedRoutesHash : currentRouteSource === baseline;
  if (!safeCurrent) failures.push(`${path.relative(root, routeRegistryPath)} changed outside the materializer`);
  else changes.push({ kind: "update-route-registry", target: path.relative(root, routeRegistryPath) });
}

const previousWorkerFirstRoutes = new Set(state.generatedWorkerFirstRoutes || []);
const workerFirstRegistries = [];
for (const configPath of workerFirstConfigPaths) {
  const current = await readFile(configPath, "utf8");
  let currentRoutes;
  try { currentRoutes = readWorkerFirstRoutes(current); }
  catch (error) { failures.push(`${path.relative(root, configPath)} ${error.message}`); continue; }
  const baseRoutes = currentRoutes.filter((routePath) => !previousWorkerFirstRoutes.has(routePath));
  const routes = [...baseRoutes, ...desiredWorkerFirstRoutes.filter((routePath) => !baseRoutes.includes(routePath))];
  const desired = renderWorkerFirstConfig(current, routes);
  workerFirstRegistries.push({ path: configPath, desired });
  if (current !== desired) changes.push({ kind: "update-worker-first-routes", target: path.relative(root, configPath) });
}

const generatedRegistries = [
  { path: workerCapabilityRoutesPath, desired: desiredWorkerCapabilityRouteSource, stateKey: "generatedWorkerCapabilityRoutesHash", baseline: renderWorkerCapabilityRoutes([]) },
  { path: serverAuthRegistryPath, desired: desiredServerAuthSource, stateKey: "generatedAuthServerHash", baseline: renderServerAuthPlugins([], { organizations: false, stripeBilling: false }) },
  { path: clientAuthRegistryPath, desired: desiredClientAuthSource, stateKey: "generatedAuthClientHash", baseline: renderClientAuthPlugins([]) },
  { path: webDesignPath, desired: desiredDesignCSS, stateKey: "generatedDesignWebHash", baseline: null, packId: selectedProfile.packId },
  { path: marketingDesignPath, desired: desiredDesignCSS, stateKey: "generatedDesignMarketingHash", baseline: null, packId: selectedProfile.packId },
  { path: docsDesignPath, desired: desiredDesignCSS, stateKey: "generatedDesignDocsHash", baseline: null, packId: selectedProfile.packId },
  { path: mobileDesignPath, desired: desiredMobileDesign, stateKey: "generatedDesignMobileHash", baseline: null, packId: selectedProfile.packId },
  { path: marketingProjectPath, desired: desiredMarketingProject, stateKey: "generatedMarketingProjectHash", baseline: null, packId: "page.core-product-site" },
];
for (const registry of generatedRegistries) {
  const current = await optionalRead(registry.path);
  if (current === registry.desired) continue;
  const safeCurrent = state[registry.stateKey] ? sha256(current || "") === state[registry.stateKey] : current === registry.baseline;
  if (!safeCurrent) failures.push(`${path.relative(root, registry.path)} changed outside the materializer`);
  else changes.push({ kind: "update-generated-artifact", target: path.relative(root, registry.path), ...(registry.packId ? { packId: registry.packId } : {}) });
}

const desiredState = {
  schemaVersion: "starter-materialization/v1",
  packs: {},
  dependencies: Object.fromEntries(desiredDependencies),
  generatedRoutesHash: sha256(desiredRouteSource),
  generatedWorkerFirstRoutes: desiredWorkerFirstRoutes,
  generatedWorkerCapabilityRoutesHash: sha256(desiredWorkerCapabilityRouteSource),
  generatedAuthServerHash: sha256(desiredServerAuthSource),
  generatedAuthClientHash: sha256(desiredClientAuthSource),
  generatedDesignWebHash: sha256(desiredDesignCSS),
  generatedDesignMarketingHash: sha256(desiredDesignCSS),
  generatedDesignDocsHash: sha256(desiredDesignCSS),
  generatedDesignMobileHash: sha256(desiredMobileDesign),
  generatedMarketingProjectHash: sha256(desiredMarketingProject),
};
for (const { manifest } of selectedManifests) desiredState.packs[manifest.id] = { version: manifest.version, files: {} };
for (const [target, desired] of desiredFiles) desiredState.packs[desired.packId].files[target] = sha256(desired.content);
if (JSON.stringify(state) !== JSON.stringify(desiredState)) changes.push({ kind: "update-receipt", target: path.relative(root, statePath) });

for (const { manifest } of manifests) {
  const selection = Object.values(blueprint.selections).flat().find(({ id }) => id === manifest.id);
  if (!selection) throw new Error(`Blueprint is missing materializable pack ${manifest.id}`);
  const shouldBeMaterialized = selected.has(manifest.id);
  if (selection.lifecycle.materialized !== shouldBeMaterialized || (!shouldBeMaterialized && Object.values(selection.lifecycle).some(Boolean))) changes.push({ kind: "update-lifecycle", target: manifest.id, packId: manifest.id });
}

if (failures.length) {
  console.error(json({ ok: false, failures, changes }));
  process.exit(1);
}
if (check && changes.length) {
  console.error(json({ ok: false, drift: changes }));
  process.exit(1);
}
if (!apply) {
  console.log(json({ ok: true, mode: check ? "check" : "plan", selectedPacks: selectedManifests.map(({ manifest }) => manifest.id), changes }));
  process.exit(0);
}
if (!changes.length) {
  console.log(json({ ok: true, mode: "apply", selectedPacks: selectedManifests.map(({ manifest }) => manifest.id), changes }));
  process.exit(0);
}

const touchedPaths = new Set([blueprintPath, routeRegistryPath, ...workerFirstRegistries.map(({ path: file }) => file), ...generatedRegistries.map(({ path: file }) => file), statePath, packageLockPath]);
for (const target of new Set([...desiredFiles.keys(), ...previousFiles.keys()])) touchedPaths.add(safeProjectPath(target, "materialization target"));
for (const packageFile of packageModels.keys()) touchedPaths.add(safeProjectPath(packageFile, "packageFile"));
const backups = new Map();
for (const file of touchedPaths) backups.set(file, await optionalRead(file));

async function restore() {
  for (const [file, content] of backups) {
    if (content === null) await unlink(file).catch((error) => { if (error?.code !== "ENOENT") throw error; });
    else { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, content); }
  }
}

try {
  for (const [target, desired] of desiredFiles) {
    const file = safeProjectPath(target, "materialized target");
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, desired.content);
  }
  for (const target of previousFiles.keys()) {
    if (!desiredFiles.has(target)) await unlink(safeProjectPath(target, "owned target")).catch((error) => { if (error?.code !== "ENOENT") throw error; });
  }

  for (const [key, desired] of desiredDependencies) {
    const model = packageModels.get(desired.packageFile);
    model[desired.section] ||= {};
    model[desired.section][desired.name] = desired.version;
  }
  for (const [key, previous] of Object.entries(state.dependencies || {})) {
    if (!desiredDependencies.has(key)) delete packageModels.get(previous.packageFile)?.[previous.section]?.[previous.name];
  }
  for (const [packageFile, model] of packageModels) {
    for (const section of ["dependencies", "devDependencies"]) if (model[section]) model[section] = Object.fromEntries(Object.entries(model[section]).sort(([left], [right]) => left.localeCompare(right)));
    await writeFile(safeProjectPath(packageFile, "packageFile"), json(model));
  }
  await writeFile(routeRegistryPath, desiredRouteSource);
  for (const registry of workerFirstRegistries) await writeFile(registry.path, registry.desired);
  for (const registry of generatedRegistries) {
    await mkdir(path.dirname(registry.path), { recursive: true });
    await writeFile(registry.path, registry.desired);
  }

  for (const { manifest } of manifests) {
    const selection = Object.values(blueprint.selections).flat().find(({ id }) => id === manifest.id);
    const invalidated = changes.some(({ packId }) => packId === manifest.id) || state.packs?.[manifest.id]?.version !== manifest.version;
    if (selected.has(manifest.id)) selection.lifecycle = { ...selection.lifecycle, selected: true, materialized: true, localVerified: invalidated ? false : selection.lifecycle.localVerified, developmentVerified: invalidated ? false : selection.lifecycle.developmentVerified, productionReleased: invalidated ? false : selection.lifecycle.productionReleased };
    else selection.lifecycle = { selected: false, materialized: false, localVerified: false, developmentVerified: false, productionReleased: false };
  }
  await writeFile(blueprintPath, json(blueprint));

  if (packageModels.size) {
    const install = spawnSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: root, encoding: "utf8" });
    if (install.status !== 0) throw new Error(`npm install failed\n${install.stderr || install.stdout}`);
  }

  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(statePath, json(desiredState));
  const knowledge = spawnSync(process.execPath, [path.join(root, "scripts/build-dp.mjs")], { cwd: root, encoding: "utf8" });
  if (knowledge.status !== 0) throw new Error(`knowledge sync failed\n${knowledge.stderr || knowledge.stdout}`);
  console.log(json({ ok: true, mode: "apply", selectedPacks: selectedManifests.map(({ manifest }) => manifest.id), changes }));
} catch (error) {
  await restore();
  throw error;
}
