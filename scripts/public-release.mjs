import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { access, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const option = (name) => args.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const version = option("version");
const target = path.resolve(option("target") || path.join(root, ".all2cf", "public-releases", String(version || "missing"), "source"));
const candidate = path.join(root, ".all2cf", "engine-candidates", String(version || ""));
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const exists = (file) => access(file).then(() => true, () => false);
const run = (command, commandArgs, cwd = target) => {
  const result = spawnSync(command, commandArgs, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${command} failed`);
  return result.stdout.trim();
};
const sha256 = async (file) => createHash("sha256").update(await readFile(file)).digest("hex");
const permanent = new Set(["design.owned-neutral", "design.stylekit-adapted", "page.core-product-site", "saas.product-shell", "saas.identity-core", "saas.notifications-core", "saas.product-operations-lite"]);

async function textFiles(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", "dist", ".wrangler"].includes(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await textFiles(absolute));
    else if (/\.(?:md|mdx|json|jsonc|ya?ml|toml|ts|tsx|js|mjs|cjs|css|astro|html|txt)$/u.test(entry.name) || ["LICENSE", ".gitignore", ".npmrc"].includes(entry.name)) output.push(absolute);
  }
  return output;
}

async function neutralize() {
  const blueprintPath = path.join(target, "starter.blueprint.json");
  const configPath = path.join(target, "starter.config.json");
  const blueprint = JSON.parse(await readFile(blueprintPath, "utf8"));
  const config = JSON.parse(await readFile(configPath, "utf8"));
  blueprint.project = { ...blueprint.project, name: "My Cloudflare Product", slug: "my-cloudflare-product", brief: "Configure this product locally through /setup." };
  blueprint.preset = "custom";
  for (const selections of Object.values(blueprint.selections)) for (const selection of selections) {
    const selected = permanent.has(selection.id);
    selection.lifecycle = { selected, materialized: false, localVerified: false, developmentVerified: false, productionReleased: false };
  }
  blueprint.pageSet.selected = blueprint.pageSet.selected.filter((id) => !id.startsWith("growth."));
  blueprint.providers.socialAuth = [];
  blueprint.providers.billing = "none";
  blueprint.providers.storage.provider = "none";
  blueprint.providers.antiAbuse.provider = "none";
  blueprint.providers.ai.provider = "none";
  blueprint.providers.search.provider = "none";
  blueprint.providers.push.provider = "none";
  blueprint.providers.sms.provider = "none";
  blueprint.providers.media.images.provider = "none";
  blueprint.providers.media.stream.provider = "none";
  blueprint.providers.media.stream.development.accountId = "00000000000000000000000000000000";
  blueprint.providers.media.stream.production.accountId = "00000000000000000000000000000000";
  blueprint.providers.background.cron.enabled = false;
  blueprint.providers.background.workflow.enabled = false;
  blueprint.providers.background.workflow.scheduleEnabled = false;
  blueprint.providers.background.realtime.enabled = false;
  blueprint.setup = { ...blueprint.setup, status: "ready", currentStep: "identity", completedAt: null };

  config.project = { name: "My Cloudflare Product", slug: "my-cloudflare-product" };
  config.cloudflare = { accountId: "", zoneId: "", zoneName: "example.com" };
  config.development = { ...config.development, worker: "my-cloudflare-product-dev", domain: "app-dev.example.com", database: { ...config.development.database, database: "my_cloudflare_product_dev", user: "my_cloudflare_product_dev", host: "127.0.0.1", port: 5432, container: "my-cloudflare-product-postgres-dev", vpcServiceName: "my-cloudflare-product-postgres-dev", hyperdriveName: "my-cloudflare-product-dev-db", tunnelId: "" } };
  config.production = { ...config.production, worker: "my-cloudflare-product", domain: "app.example.com", database: { database: "my_cloudflare_product", user: "my_cloudflare_product", host: "postgres.example.internal", port: 5432, container: "my-cloudflare-product-postgres", hyperdriveName: "my-cloudflare-product-prod-db" } };
  const starterManifestPath = path.join(target, "starter.manifest.json");
  const starterManifest = JSON.parse(await readFile(starterManifestPath, "utf8"));
  starterManifest.project = { name: "My Cloudflare Product", slug: "my-cloudflare-product" };
  await Promise.all([writeFile(blueprintPath, json(blueprint)), writeFile(configPath, json(config)), writeFile(starterManifestPath, json(starterManifest))]);

  const replacements = new Map([
    ["app-dev.example.com", "app-dev.example.com"], ["app.example.com", "app.example.com"], ["visual.example.com", "visual.example.com"], ["visualapp-dev.example.com", "visual-dev.example.com"],
    ["00000000000000000000000000000000", "00000000000000000000000000000000"], ["00000000000000000000000000000000", "00000000000000000000000000000000"],
    ["127.0.0.1", "127.0.0.1"], ["postgres.example.internal", "postgres.example.internal"], ["root@postgres.example.internal", "deploy@host.example"], ["/path/to/production-ssh-key", "/path/to/production-ssh-key"], ["/path/to/known_hosts", "/path/to/known_hosts"], ["/path/to/", "/path/to/"],
  ]);
  for (const file of await textFiles(target)) {
    let source = await readFile(file, "utf8");
    let next = source;
    for (const [from, to] of replacements) next = next.replaceAll(from, to);
    if (next !== source) await writeFile(file, next);
  }
}

async function main() {
  if (!/^\d+\.\d+\.\d+(?:-(?:dev|rc)\.\d+)?$/u.test(String(version || ""))) throw new Error("--version is required");
  const manifestPath = path.join(candidate, "factory-engine.json");
  if (!(await exists(manifestPath))) throw new Error(`Verified Engine candidate is missing: ${candidate}`);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const artifact = path.join(candidate, manifest.artifact);
  if (await sha256(artifact) !== manifest.artifactSha256) throw new Error("Engine candidate Artifact hash mismatch");
  if (await exists(target)) {
    const entries = await readdir(target);
    if (entries.length) throw new Error(`Public release target must be empty: ${target}`);
  } else await mkdir(target, { recursive: true });
  run("tar", ["-xzf", artifact, "-C", target], root);
  await neutralize();
  run(process.execPath, ["scripts/materialize-blueprint.mjs", "--apply"]);
  const receipt = JSON.parse(await readFile(path.join(target, ".starter", "materialization.json"), "utf8"));
  const optionalPackIds = Object.keys(receipt.packs || {}).filter((id) => !permanent.has(id));
  if (optionalPackIds.length) throw new Error(`Public baseline materialized optional Packs: ${optionalPackIds.join(", ")}`);
  run("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"]);
  run("npm", ["run", "typecheck"]);
  run("npm", ["run", "build:sites"]);
  run("npm", ["run", "bundle:check:marketing"]);
  run("npm", ["run", "bundle:check:web"]);
  run("npm", ["run", "bundle:check:docs"]);
  await mkdir(path.join(target, ".starter"), { recursive: true });
  const publicReceipt = { schemaVersion: "all2cf-public-source/v1", version, canonicalSourceCommit: manifest.sourceCommit, engineArtifactSha256: manifest.artifactSha256, optionalPackCount: 0, permanentPackIds: Object.keys(receipt.packs || {}), bootstrap: "npm ci && npm run setup", github: "https://github.com/LogicMateCA/all2cf-starter" };
  await writeFile(path.join(target, ".starter", "public-release.json"), json(publicReceipt));
  const forbidden = ["app-dev.example.com", "app.example.com", "127.0.0.1", "postgres.example.internal", "00000000000000000000000000000000", "00000000000000000000000000000000", "/path/to/"];
  const leaks = [];
  for (const file of await textFiles(target)) {
    const source = await readFile(file, "utf8");
    for (const pattern of forbidden) if (source.includes(pattern)) leaks.push(`${path.relative(target, file)}:${pattern}`);
  }
  if (leaks.length) throw new Error(`Public release leak scan failed:\n${leaks.slice(0, 20).join("\n")}`);
  await rm(path.join(target, "node_modules"), { recursive: true, force: true });
  await rm(path.join(target, "dist"), { recursive: true, force: true });
  for (const application of ["web", "marketing", "docs", "mobile"])
    await rm(path.join(target, "apps", application, "node_modules"), { recursive: true, force: true });
  const report = { ok: true, target, ...publicReceipt, fileCount: (await readdir(target, { recursive: true })).length, leakCount: 0 };
  await writeFile(path.join(path.dirname(target), "public-release-report.json"), json(report));
  console.log(json(report));
}

main().catch((error) => { console.error(json({ ok: false, error: error instanceof Error ? error.message : String(error) })); process.exitCode = 1; });
