import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
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
  Object.assign(manifest.scripts, {
    "starter:status": "node scripts/starter-link.mjs status",
    "starter:diff": "node scripts/starter-link.mjs diff",
    "starter:add": "node scripts/starter-link.mjs add",
    "starter:update": "node scripts/starter-link.mjs update",
  });
  await writeFile(path.join(target, "package.json"), json(manifest));
}

async function pruneSourceLibrary(target) {
  for (const relative of ["packs", "catalog", "design/stylekit", "node_modules", "dist", "test-results", "cloudflare/.wrangler", "cloudflare/dist"])
    await rm(path.join(target, relative), { recursive: true, force: true });
  await rm(path.join(target, "pages/catalog.json"), { force: true });
}

async function writeProductHandoff(target, source) {
  const humanMapPath = path.join(target, "AGENT_MAP.md");
  const humanMap = await readFile(humanMapPath, "utf8");
  await writeFile(humanMapPath, humanMap.replace(
    "Reusable optional capability: start at `packs/<kind>/<pack>/pack.json`, then its templates. Apply through the materializer.",
    "Reusable optional capability: inspect with `npm run starter:status`, preview with `npm run starter:diff`, and apply from the pinned source using `npm run starter:add -- <pack-id>` or `npm run starter:update`. The product does not carry the complete Pack library.",
  ));
  const machineMapPath = path.join(target, ".ai/agent-map.json");
  const machineMap = await readJson(target, ".ai/agent-map.json");
  machineMap.rules.packs = "Generated products do not carry the complete Pack library. Use starter:status/diff/add/update through the pinned source receipt; never fabricate local Pack templates.";
  await writeFile(machineMapPath, json(machineMap));
  const template = await readFile(path.join(target, "changes/_template.md"), "utf8");
  await rm(path.join(target, "changes"), { recursive: true, force: true });
  await mkdir(path.join(target, "changes"), { recursive: true });
  await writeFile(path.join(target, "changes/_template.md"), template);
  await writeFile(path.join(target, "changes/generated-project.md"), `---\nid: generated-project\ntitle: Initialize ${source.project.name}\nstatus: implemented\naffectedModules: [assembler]\ndocsImpact: [PROJECT.md, AGENT_MAP.md, /dp]\n---\n\n# Outcome\n\nThis independent product was generated from Starter source commit \`${source.sourceCommit}\`. It retains selected runtime code and a source receipt, but not the complete reusable Catalog, Pack or StyleKit source library.\n\n# Verification\n\nGenerated identity, materialization receipt, Agent Map and Development Plan are present. Project-local dependency installation, type/build checks and provider/release evidence remain product gates.\n\n# Release\n\nNot released.\n`);
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
    const source = { schemaVersion: "starter-source/v1", sourceRoot, sourceCommit: sourceVersion(), sourceDirty: dirty, generatedAt: new Date().toISOString(), project: { name, slug } };
    await writeFile(path.join(target, ".starter/source.json"), json(source));
    run("scripts/sync-project-identity.mjs", ["--reset", `--project-root=${target}`], target);
    const materialization = await materialize(target, "--apply");
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
    console.log(await materialize(target, "--apply"));
  } catch (error) {
    await writeFile(blueprintPath, original);
    throw error;
  }
}

async function updateProject() {
  const target = await lifecycleProjectRoot();
  const result = await materialize(target, "--apply");
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
