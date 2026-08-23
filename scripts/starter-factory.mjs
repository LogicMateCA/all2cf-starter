import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const command = args.find((value) => !value.startsWith("--")) || "status";
const option = (name) => args.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const outputRoot = path.join(sourceRoot, ".factory-output");
const portable = process.env.STARTER_FACTORY_PORTABLE === "true";
const portableSourceUrl = process.env.STARTER_FACTORY_SOURCE_URL?.trim() || "";
const portableChannelUrl = process.env.STARTER_FACTORY_CHANNEL_URL?.trim() || "";
const portableUpdateServiceUrl = process.env.STARTER_FACTORY_UPDATE_SERVICE_URL?.trim() || "";
const portableEngineVersion = process.env.STARTER_FACTORY_ENGINE_VERSION?.trim() || "";
const portableArtifactSha256 = process.env.STARTER_FACTORY_ARTIFACT_SHA256?.trim() || "";

async function readJson(root, file) {
  return JSON.parse(await readFile(path.join(root, file), "utf8"));
}

function safeProjectRoot(value, creating = false) {
  const resolved = path.resolve(value || "");
  if (!value || resolved === sourceRoot || resolved === outputRoot)
    throw new Error("A distinct project root is required");
  if (creating && !resolved.startsWith(`${outputRoot}${path.sep}`))
    throw new Error(`Factory output must remain inside ${outputRoot}`);
  return resolved;
}

function run(script, scriptArgs, cwd) {
  const result = spawnSync(process.execPath, [path.join(sourceRoot, script), ...scriptArgs], { cwd, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${script} failed`);
  return result.stdout.trim();
}

function runProjectScript(projectRoot, script, scriptArgs = []) {
  const result = spawnSync(process.execPath, [path.join(projectRoot, script), ...scriptArgs], { cwd: projectRoot, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${script} failed`);
  return result.stdout.trim();
}

function generateWorkerTypes(target) {
  const configured = process.env.STARTER_FACTORY_WRANGLER_BIN?.trim();
  const binary = process.platform === "win32" ? "wrangler.cmd" : "wrangler";
  const sourceBinary = path.join(sourceRoot, "node_modules", ".bin", binary);
  const projectBinary = path.join(target, "node_modules", ".bin", binary);
  const executable = configured || (existsSync(sourceBinary) ? sourceBinary : projectBinary);
  if (!existsSync(executable)) throw new Error("Wrangler is unavailable; run npm ci in the generated project before Pack updates");
  for (const environment of ["development", "production"]) {
    const result = spawnSync(executable, [
      "types",
      "--config",
      `cloudflare/wrangler.${environment}.jsonc`,
      `workers/app/worker-configuration.${environment}.d.ts`,
    ], { cwd: target, encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr || result.stdout || `Wrangler type generation failed for ${environment}`);
  }
}

function refreshPortablePackageLock(target) {
  if (!portable) return;
  const result = spawnSync("npm", ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: target, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "Portable package-lock refresh failed");
}

async function ensureNewDirectory(target) {
  try {
    if ((await readdir(target)).length) throw new Error(`Target directory is not empty: ${target}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await mkdir(target, { recursive: true });
}

const transientPrefixes = [".git", ".all2cf", ".factory-output", "node_modules", "dist", "test-results", "tmp", "cloudflare/.wrangler", "cloudflare/dist", "apps/mobile/dist", "apps/web/dist", "apps/docs/dist", "apps/marketing/dist"];
const secretFiles = new Set([".dev.vars", "apps/web/.env.local", "apps/mobile/.env.local"]);
function shouldCopy(source) {
  const relative = path.relative(sourceRoot, source).replaceAll(path.sep, "/");
  if (!relative) return true;
  if (secretFiles.has(relative)) return false;
  if (relative.split("/").some((segment) => new Set(["node_modules", ".astro", ".expo", ".wrangler"]).has(segment))) return false;
  return !transientPrefixes.some((prefix) => relative === prefix || relative.startsWith(`${prefix}/`));
}

function injectedSourceCommit() {
  const value = process.env.STARTER_FACTORY_SOURCE_COMMIT?.trim() || "";
  if (value && !/^[a-f0-9]{40}$/u.test(value))
    throw new Error("STARTER_FACTORY_SOURCE_COMMIT must be a lowercase 40-character Git SHA-1");
  return value || null;
}
const sourceVersion = () =>
  injectedSourceCommit() ||
  execFileSync("git", ["rev-parse", "HEAD"], { cwd: sourceRoot, encoding: "utf8" }).trim();
const sourceStatus = () =>
  injectedSourceCommit()
    ? ""
    : execFileSync("git", ["status", "--porcelain"], { cwd: sourceRoot, encoding: "utf8" }).trim();

async function writeIdentity(target, name, slug) {
  const config = await readJson(target, "starter.config.json");
  const blueprint = await readJson(target, "starter.blueprint.json");
  if (portable) {
    config.cloudflare = { accountId: "", zoneId: "", zoneName: "example.invalid" };
    config.development.database.host = "127.0.0.1";
    config.development.database.port = 5432;
    config.development.database.tunnelId = "";
    config.production.database.host = "";
    config.production.database.port = 5432;
    config.production.database.sshHost = "";
    config.production.database.sshKey = "";
    config.production.database.sshKnownHosts = "";
    config.production.database.container = "";
    config.production.database.adminUser = "";
    config.production.database.vpcServiceId = "";
    blueprint.providers.storage.development.bucket = `${slug}-dev-objects`;
    blueprint.providers.storage.production.bucket = `${slug}-objects`;
    blueprint.providers.storage.development.publicDomain = "";
    blueprint.providers.storage.production.publicDomain = "";
    blueprint.providers.search.development.indexName = `${slug}-dev-vectorize`;
    blueprint.providers.search.production.indexName = `${slug}-vectorize`;
    blueprint.providers.media.stream.development.accountId = "00000000000000000000000000000000";
    blueprint.providers.media.stream.production.accountId = "00000000000000000000000000000000";
    blueprint.providers.media.stream.development.allowedOrigins = [`${slug}-dev.example.invalid`];
    blueprint.providers.media.stream.production.allowedOrigins = [`${slug}.example.invalid`];
  }
  config.project = { name, slug };
  config.development.worker = `${slug}-dev`;
  config.production.worker = slug;
  config.development.domain = `${slug}-dev.${config.cloudflare.zoneName}`;
  config.production.domain = `${slug}.${config.cloudflare.zoneName}`;
  for (const [environment, suffix] of [["development", "dev"], ["production", ""]]) {
    const identity = suffix ? `${slug}${suffix}` : slug;
    config[environment].database.database = identity;
    config[environment].database.user = identity;
    config[environment].database.hyperdriveName = `${slug}-${suffix || "prod"}-db`;
  }
  config.development.database.container = `${slug}-postgres-dev`;
  config.development.database.vpcServiceName = `${slug}-postgres-dev`;
  blueprint.project.name = name;
  blueprint.project.slug = slug;
  blueprint.setup = { ...blueprint.setup, entry: "/setup", status: "ready" };
  await Promise.all([
    writeFile(path.join(target, "starter.config.json"), json(config)),
    writeFile(path.join(target, "starter.blueprint.json"), json(blueprint)),
  ]);
}

async function writeProjectScripts(target) {
  const manifest = await readJson(target, "package.json");
  const sourceOnlyScripts = new Set(["dependencies:contract", "providers:contract", "design:contract", "typography:contract", "pages:contract", "saas:contract", "data-layer:drizzle:contract", "engine:channel:contract"]);
  for (const script of Object.keys(manifest.scripts || {}))
    if (script.startsWith("source:") || script.startsWith("engine:") || script.startsWith("factory:") || script.startsWith("stylekit:") || sourceOnlyScripts.has(script)) delete manifest.scripts[script];
  Object.assign(manifest.scripts, {
    "starter:status": "node scripts/starter-link.mjs status",
    "starter:diff": "node scripts/starter-link.mjs diff",
    "starter:add": "node scripts/starter-link.mjs add",
    "starter:update": "node scripts/starter-link.mjs update",
  });
  manifest.scripts.verify = "npm run starter:init && npm run ai:doctor && npm run agent-map:check && npm run plugin:contract && npm run visual:integration:contract && npm run release:contract && npm run database:provider:contract && npm run auth:social:contract && npm run knowledge:sync && npm run knowledge:check && npm run change:check && npm run cf:types:check && npm run typecheck && npm run build:sites && npm run cache:contract && npm run bundle:check:marketing && npm run bundle:check:web && npm run bundle:check:docs && npm run cf:dry-run:dev && npm run cf:dry-run:production";
  await writeFile(path.join(target, "package.json"), json(manifest));
}

async function pruneSourceLibrary(target) {
  for (const relative of ["packs", "skills/starter-source-release", "scripts/source-release.mjs", "ALL2CF_FACTORY.md", "node_modules", "dist", "test-results", "cloudflare/.wrangler", "cloudflare/dist"])
    await rm(path.join(target, relative), { recursive: true, force: true });
  const blueprint = await readJson(target, "starter.blueprint.json");
  const stylekitRoot = path.join(target, "design/stylekit");
  const sourceCatalog = await readJson(target, "design/stylekit/source-catalog.json");
  const selectedStyle = sourceCatalog.styles.find(({ slug }) => slug === blueprint.stylekit.slug);
  if (!selectedStyle) throw new Error(`Selected fallback style ${blueprint.stylekit.slug} is missing from the source catalog`);
  for (const entry of await readdir(stylekitRoot))
    if (entry !== "source-catalog.json" && entry !== blueprint.stylekit.slug)
      await rm(path.join(stylekitRoot, entry), { recursive: true, force: true });
  await writeFile(path.join(stylekitRoot, "source-catalog.json"), json({ ...sourceCatalog, count: 1, styles: [selectedStyle] }));
  await rm(path.join(target, "apps/web/public/stylekit-previews"), { recursive: true, force: true });
  for (const relative of ["scripts/stylekit-bundle.mjs", "scripts/stylekit-preview-assets.mjs", "scripts/stylekit-snapshot.mjs", "scripts/stylekit-snapshots.mjs", "scripts/stylekit-source-catalog.mjs", "scripts/stylekit-contract.mjs"])
    await rm(path.join(target, relative), { force: true });
}

async function writeProductHandoff(target, source) {
  const humanMapPath = path.join(target, "AGENT_MAP.md");
  const humanMap = await readFile(humanMapPath, "utf8");
  await writeFile(humanMapPath, humanMap.replace(
    "Reusable optional capability: start at `packs/<kind>/<pack>/pack.json`, then its templates. Apply through the materializer.",
    source.portable
      ? "Reusable optional capabilities and source updates are managed through the verified Engine Channel in `.starter/source.json`. This portable product does not carry the complete Pack library or a mutable source checkout."
      : "Reusable optional capability: inspect with `npm run starter:status`, preview with `npm run starter:diff`, and apply from the pinned source using `npm run starter:add -- <pack-id>` or `npm run starter:update`. The product does not carry the complete Pack library.",
  ));
  const agentsPath = path.join(target, "AGENTS.md");
  const agents = await readFile(agentsPath, "utf8");
  await writeFile(agentsPath, agents.replace("- For building, checking or registering a canonical Starter Engine candidate, read and follow `skills/starter-source-release/SKILL.md`.\n", ""));
  const projectPath = path.join(target, "PROJECT.md");
  const project = await readFile(projectPath, "utf8");
  await writeFile(projectPath, project.replace("- `skills/starter-source-release/SKILL.md` owns clean-source SQL/Drizzle verification, reproducible immutable Engine candidates and guarded All2CF registration plans. It never deploys.\n", ""));
  const machineMapPath = path.join(target, ".ai/agent-map.json");
  const machineMap = await readJson(target, ".ai/agent-map.json");
  machineMap.rules.packs = source.portable
    ? "This portable product uses verified Engine Channel updates through .starter/source.json.channelUrl. Never fabricate local Pack templates or treat the unavailable sourceRoot as a local path."
    : "Generated products do not carry the complete Pack template library. Use starter:status/diff/add/update through the pinned source receipt; never fabricate local Pack templates.";
  const present = async (relative) => stat(path.join(target, relative)).then(() => true, () => false);
  const productPackage = await readJson(target, "package.json");
  machineMap.firstRunReads = (await Promise.all((machineMap.firstRunReads || []).map(async (relative) => [relative, await present(relative)]))).filter(([, fileExists]) => fileExists).map(([relative]) => relative);
  for (const route of machineMap.routes || []) {
    for (const key of ["primaryFiles", "docs", "skills"])
      route[key] = (await Promise.all((route[key] || []).map(async (relative) => [relative, await present(relative)]))).filter(([, fileExists]) => fileExists).map(([relative]) => relative);
    route.checks = (route.checks || []).filter((check) => check !== "npm run starter:materialize:check").filter((check) => {
      const match = check.match(/^npm run ([^ ]+)/u);
      return !match || Boolean(productPackage.scripts?.[match[1]]);
    });
    if (!route.primaryFiles.length) route.primaryFiles = ["PROJECT.md"];
    if (!route.docs.length) route.docs = ["PROJECT.md"];
    if (!route.checks.length) route.checks = ["npm run typecheck"];
  }
  if (source.portable) {
    const changePolicy = await readJson(target, ".ai/change-policy.json");
    changePolicy.enforcedAfter = "root";
    await writeFile(path.join(target, ".ai/change-policy.json"), json(changePolicy));
  }
  await writeFile(machineMapPath, json(machineMap));
  const template = await readFile(path.join(target, "changes/_template.md"), "utf8");
  await rm(path.join(target, "changes"), { recursive: true, force: true });
  await mkdir(path.join(target, "changes"), { recursive: true });
  await writeFile(path.join(target, "changes/_template.md"), template);
  await writeFile(path.join(target, "changes/generated-project.md"), `---\nid: generated-project\ntitle: Initialize ${source.project.name}\nstatus: implemented\naffectedModules: [assembler]\ndocsImpact: [PROJECT.md, AGENT_MAP.md, /dp]\n---\n\n# Outcome\n\nThis independent product was generated from Starter source commit \`${source.sourceCommit}\`. It retains selected runtime code, one Starter-owned visual fallback, the optional Visual integration receipt contract, compact Catalog references and a source receipt, but not the reusable Pack or universal visual-provider libraries.\n\n# Verification\n\nGenerated identity, materialization receipt, Agent Map and Development Plan are present. Project-local dependency installation, type/build checks and provider/release evidence remain product gates.\n\n# Release\n\nNot released.\n`);
}

function initializeGit(target, slug) {
  execFileSync("git", ["init", "-b", "main"], { cwd: target, stdio: "ignore" });
  execFileSync("git", ["config", "user.name", "All2CF Starter Factory"], { cwd: target, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "starter-factory@all2cf.local"], { cwd: target, stdio: "ignore" });
  execFileSync("git", ["add", "."], { cwd: target, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", `chore: initialize ${slug}`], { cwd: target, stdio: "ignore" });
}

async function createArchive(target, slug) {
  const archive = path.join(outputRoot, `${slug}.tar.gz`);
  try {
    await stat(archive);
    throw new Error(`Archive already exists: ${archive}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  execFileSync("tar", ["--exclude=.git", "--exclude=node_modules", "--exclude=dist", "-czf", archive, "-C", target, "."], { stdio: "ignore" });
  return archive;
}

async function materialize(target, mode) {
  return run("scripts/materialize-blueprint.mjs", [mode, `--project-root=${target}`, `--source-root=${sourceRoot}`], target);
}

async function createProject() {
  const slug = option("slug");
  const name = option("name") || slug;
  if (!slug || !/^[a-z][a-z0-9-]{1,62}$/u.test(slug)) throw new Error("create requires --slug=<safe-project-slug>");
  const target = safeProjectRoot(option("target") || path.join(outputRoot, slug), true);
  const dirty = Boolean(sourceStatus());
  if (dirty && !args.includes("--allow-dirty"))
    throw new Error("Factory source is dirty; commit it first or use --allow-dirty for an explicit disposable proof");
  await ensureNewDirectory(target);
  try {
    for (const entry of await readdir(sourceRoot)) {
      const source = path.join(sourceRoot, entry);
      if (!shouldCopy(source)) continue;
      await cp(source, path.join(target, entry), { recursive: true, filter: shouldCopy });
    }
    const inputPath = option("input");
    if (inputPath) {
      const input = await readJson(sourceRoot, inputPath);
      await Promise.all([
        writeFile(path.join(target, "starter.blueprint.json"), json(input.blueprint)),
        writeFile(path.join(target, "starter.config.json"), json(input.config)),
      ]);
    }
    await writeIdentity(target, name, slug);
    await mkdir(path.join(target, ".starter"), { recursive: true });
    if (portable && !/^https:\/\//u.test(portableSourceUrl))
      throw new Error("Portable Factory generation requires STARTER_FACTORY_SOURCE_URL");
    if (portableChannelUrl && !/^https?:\/\//u.test(portableChannelUrl))
      throw new Error("Portable Factory Channel URL must use HTTP or HTTPS");
    if (portableUpdateServiceUrl) {
      const updateService = new URL(portableUpdateServiceUrl);
      if (updateService.protocol !== "https:" && !(updateService.protocol === "http:" && new Set(["127.0.0.1", "localhost", "::1"]).has(updateService.hostname)))
        throw new Error("Portable Factory update service URL must use HTTPS; loopback HTTP is local-verification only");
    }
    if (portableArtifactSha256 && !/^[a-f0-9]{64}$/u.test(portableArtifactSha256))
      throw new Error("Portable Factory artifact SHA-256 is invalid");
    const source = { schemaVersion: "starter-source/v2", sourceRoot: portable ? null : sourceRoot, sourceUrl: portable ? portableSourceUrl : null, channelUrl: portable ? portableChannelUrl || null : null, updateServiceUrl: portable ? portableUpdateServiceUrl || null : null, updateMode: portable ? portableUpdateServiceUrl ? "all2cf-service" : "engine-channel" : "linked-source", engineVersion: portable ? portableEngineVersion || null : null, artifactSha256: portable ? portableArtifactSha256 || null : null, sourceCommit: sourceVersion(), sourceDirty: dirty, portable, generatedAt: new Date().toISOString(), project: { name, slug } };
    await writeFile(path.join(target, ".starter/source.json"), json(source));
    if (portable) process.env.STARTER_FACTORY_BUILD_SOURCE_ROOT = sourceRoot;
    run("scripts/sync-project-identity.mjs", ["--reset", `--project-root=${target}`], target);
    const materialization = await materialize(target, "--apply");
    refreshPortablePackageLock(target);
    if (portable) generateWorkerTypes(target);
    await writeProjectScripts(target);
    await pruneSourceLibrary(target);
    await writeProductHandoff(target, source);
    runProjectScript(target, "scripts/build-dp.mjs");
    const report = { ok: true, command: "create", target, archive: path.join(outputRoot, `${slug}.tar.gz`), project: { name, slug }, source, fileCount: (await readdir(target, { recursive: true })).length, blueprintHash: sha256(await readFile(path.join(target, "starter.blueprint.json"))), materialization: JSON.parse(materialization) };
    await writeFile(path.join(target, ".starter/generation-report.json"), json(report));
    initializeGit(target, slug);
    await createArchive(target, slug);
    report.archiveSha256 = sha256(await readFile(report.archive));
    console.log(json(report));
  } catch (error) {
    await rm(target, { recursive: true, force: true });
    await rm(path.join(outputRoot, `${slug}.tar.gz`), { force: true });
    throw error;
  }
}

async function lifecycleProjectRoot() {
  const root = safeProjectRoot(option("project-root") || process.cwd());
  await stat(path.join(root, ".starter/source.json"));
  return root;
}

async function packVersions() {
  const files = (await readdir(path.join(sourceRoot, "packs"), { recursive: true })).filter((file) => String(file).endsWith("pack.json"));
  return new Map(await Promise.all(files.map(async (file) => {
    const manifest = await readJson(path.join(sourceRoot, "packs"), String(file));
    return [manifest.id, manifest.version];
  })));
}

async function statusProject() {
  const target = await lifecycleProjectRoot();
  const receipt = await readJson(target, ".starter/materialization.json");
  const sourceReceipt = await readJson(target, ".starter/source.json");
  const versions = await packVersions();
  const packs = Object.entries(receipt.packs || {}).map(([id, installed]) => ({ id, installed: installed.version, available: versions.get(id) || null, updateAvailable: Boolean(versions.get(id) && versions.get(id) !== installed.version) }));
  console.log(json({ ok: true, command: "status", target, source: { installedCommit: sourceReceipt.sourceCommit, availableCommit: sourceVersion(), updateAvailable: sourceReceipt.sourceCommit !== sourceVersion(), sourceDirty: Boolean(sourceStatus()) }, packs }));
}

async function selectPackClosure(blueprint, packId) {
  const manifests = new Map();
  for (const file of (await readdir(path.join(sourceRoot, "packs"), { recursive: true })).filter((file) => String(file).endsWith("pack.json"))) {
    const manifest = await readJson(path.join(sourceRoot, "packs"), String(file));
    manifests.set(manifest.id, manifest);
  }
  const selected = [];
  const visit = (id) => {
    if (selected.includes(id)) return;
    const manifest = manifests.get(id);
    if (!manifest) throw new Error(`Unknown Pack ${id}`);
    for (const dependency of manifest.requiresPacks || []) visit(dependency);
    const selection = Object.values(blueprint.selections).flat().find((item) => item.id === id);
    if (!selection) throw new Error(`Blueprint is missing Pack ${id}`);
    selection.lifecycle = { selected: true, materialized: false, localVerified: false, developmentVerified: false, productionReleased: false };
    selected.push(id);
  };
  visit(packId);
  return selected;
}

async function addProject() {
  const target = await lifecycleProjectRoot();
  const packId = args.find((value) => !value.startsWith("--") && value !== "add");
  if (!packId) throw new Error("add requires a Pack id");
  const blueprintPath = path.join(target, "starter.blueprint.json");
  const original = await readFile(blueprintPath, "utf8");
  const blueprint = JSON.parse(original);
  await selectPackClosure(blueprint, packId);
  await writeFile(blueprintPath, json(blueprint));
  try {
    const result = await materialize(target, "--apply");
    generateWorkerTypes(target);
    console.log(result);
  } catch (error) {
    await writeFile(blueprintPath, original);
    throw error;
  }
}

async function updateProject() {
  const target = await lifecycleProjectRoot();
  const result = await materialize(target, "--apply");
  generateWorkerTypes(target);
  const receiptPath = path.join(target, ".starter/source.json");
  const receipt = await readJson(target, ".starter/source.json");
  receipt.sourceCommit = sourceVersion();
  receipt.sourceDirty = Boolean(sourceStatus());
  receipt.updatedAt = new Date().toISOString();
  await writeFile(receiptPath, json(receipt));
  console.log(result);
}

async function main() {
  if (command === "create") await createProject();
  else if (command === "status") await statusProject();
  else if (command === "diff") console.log(await materialize(await lifecycleProjectRoot(), ""));
  else if (command === "update") await updateProject();
  else if (command === "add") await addProject();
  else throw new Error(`Unknown Starter Factory command ${command}`);
}

main().catch((error) => {
  console.error(json({ ok: false, command, error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
});
