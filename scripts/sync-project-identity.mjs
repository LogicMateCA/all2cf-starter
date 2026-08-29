import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderSocialProviderSelection } from "./lib/social-providers.mjs";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectRootArgument = process.argv.find((value) => value.startsWith("--project-root="));
const root = projectRootArgument
  ? path.resolve(projectRootArgument.slice("--project-root=".length))
  : sourceRoot;
const reset = process.argv.includes("--reset");
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), "utf8"));
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const config = await readJson("starter.config.json");
const blueprint = await readJson("starter.blueprint.json");
const { name, slug } = config.project;

if (!/^[a-z][a-z0-9-]{1,62}$/u.test(slug)) throw new Error("Project slug must match ^[a-z][a-z0-9-]{1,62}$");
if (config.development.worker === config.production.worker) throw new Error("Development and Production Workers must be different");
if (config.development.domain === config.production.domain) throw new Error("Development and Production domains must be different");
if (config.development.database.database === config.production.database.database) throw new Error("Development and Production databases must be different");

if (reset) {
  const canonicalValues = new Set(["starter", "starter-dev", "starterdev", "app-dev.example.com", "app.example.com", "starter-postgres-dev", "starter-dev-db", "starter-prod-db"]);
  const identityValues = [slug, config.development.worker, config.production.worker, config.development.domain, config.production.domain, config.development.database.database, config.development.database.user, config.production.database.database, config.production.database.user, config.development.database.container, config.development.database.vpcServiceName, config.development.database.hyperdriveName, config.production.database.hyperdriveName];
  const stale = identityValues.filter((value) => canonicalValues.has(value));
  if (stale.length) throw new Error(`Copied project still uses canonical Starter identities: ${[...new Set(stale)].join(", ")}`);
}

const writes = [];
const addJson = (file, value) => writes.push({ file, content: json(value) });

const socialSecretNames = new Set([
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "APPLE_CLIENT_ID",
  "APPLE_TEAM_ID",
  "APPLE_KEY_ID",
  "APPLE_PRIVATE_KEY_BASE64",
  "APPLE_APP_BUNDLE_IDENTIFIER",
]);
const socialSecrets = {
  google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  github: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
  apple: ["APPLE_CLIENT_ID", "APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY_BASE64", "APPLE_APP_BUNDLE_IDENTIFIER"],
};
for (const file of ["cloudflare/wrangler.development.jsonc", "cloudflare/wrangler.production.jsonc"]) {
  const worker = JSON.parse(await readFile(path.join(root, file), "utf8"));
  const environment = file.includes("development") ? "development" : "production";
  const target = config[environment];
  worker.name = target.worker;
  worker.vars ||= {};
  worker.vars.SERVICE_NAME = slug;
  worker.vars.APP_NAME = name;
  worker.vars.AUTH_CANONICAL_ORIGIN = `https://${target.domain}`;
  worker.vars.MOBILE_DEEP_LINK_SCHEMES = `${slug}-dev://,${slug}-preview://,${slug}://`;
  worker.routes = (worker.routes || []).map((route) =>
    typeof route === "string"
      ? target.domain
      : { ...route, pattern: target.domain },
  );
  worker.vars.AUTH_SOCIAL_PROVIDERS = renderSocialProviderSelection(blueprint.providers.socialAuth);
  const required = new Set(
    (worker.secrets?.required || []).filter((name) => !socialSecretNames.has(name)),
  );
  for (const provider of blueprint.providers.socialAuth) {
    for (const name of socialSecrets[provider] || []) required.add(name);
  }
  worker.secrets ||= {};
  worker.secrets.required = [...required].sort();
  addJson(file, worker);
}

const aiManifest = await readJson(".ai/manifest.json");
aiManifest.project = slug;
addJson(".ai/manifest.json", aiManifest);

const starterManifest = await readJson("starter.manifest.json");
starterManifest.project = { name, slug };
starterManifest.environments = [
  { id: "development", worker: config.development.worker, domain: config.development.domain, releaseIntent: "发布" },
  { id: "production", worker: config.production.worker, domain: config.production.domain, releaseIntent: "正式发布" },
];
if (reset) starterManifest.state = "initialized";
addJson("starter.manifest.json", starterManifest);

const bindings = await readJson("cloudflare/bindings.contract.json");
bindings.environments.development.worker = config.development.worker;
bindings.environments.production.worker = config.production.worker;
addJson("cloudflare/bindings.contract.json", bindings);

for (const [file, suffix] of [["package.json", "root"], ["apps/web/package.json", "web"], ["apps/mobile/package.json", "mobile"], ["workers/app/package.json", "worker"]]) {
  const manifest = await readJson(file);
  manifest.name = `@${slug}/${suffix}`;
  addJson(file, manifest);
}

const projectSource = await readFile(path.join(root, "PROJECT.md"), "utf8");
const titlePattern = /^title:\s*"[^"]*"/mu;
if (!titlePattern.test(projectSource)) throw new Error("PROJECT.md title frontmatter was not found");
const sourcePattern = /^source:\s*"[^"]*"/mu;
if (!sourcePattern.test(projectSource)) throw new Error("PROJECT.md source frontmatter was not found");
writes.push({
  file: "PROJECT.md",
  content: projectSource
    .replace(titlePattern, `title: "${name.replaceAll('"', '\\"')}"`)
    .replace(sourcePattern, `source: "${slug}"`),
});

const applicationNamespace = `${config.cloudflare.zoneName.split(".").reverse().join(".")}.${slug.replaceAll("-", "")}`;
const maestroSource = await readFile(path.join(root, "apps/mobile/.maestro/smoke.yml"), "utf8");
if (!/^appId:\s*.*$/mu.test(maestroSource)) throw new Error("Maestro appId was not found");
writes.push({ file: "apps/mobile/.maestro/smoke.yml", content: maestroSource.replace(/^appId:\s*.*$/mu, `appId: ${applicationNamespace}.preview`) });

const originals = new Map(await Promise.all(writes.map(async ({ file }) => [file, await readFile(path.join(root, file), "utf8")])));
const prepared = writes.map(({ file, content }, index) => ({ file, content, temporary: path.join(root, `${file}.identity-${process.pid}-${index}.tmp`) }));
for (const item of prepared) await writeFile(item.temporary, item.content);
const replaced = [];
try {
  for (const item of prepared) {
    await rename(item.temporary, path.join(root, item.file));
    replaced.push(item.file);
  }
} catch (error) {
  for (const file of replaced) await writeFile(path.join(root, file), originals.get(file));
  for (const item of prepared) await unlink(item.temporary).catch(() => undefined);
  throw error;
}

console.log(JSON.stringify({ ok: true, project: { name, slug }, reset, updated: writes.map(({ file }) => file), next: ["npm install", "npm run env:materialize:dev", "npm run starter:provision"] }, null, 2));
