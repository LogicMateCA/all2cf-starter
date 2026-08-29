import { access, cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const sourceRoot = process.cwd();
const args = process.argv.slice(2);
const command = args[0] || "scan";
const flag = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : null;
};
const targetRoot = path.resolve(sourceRoot, flag("root") || ".");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const relative = (target) => path.relative(targetRoot, target).replaceAll(path.sep, "/") || ".";
const exists = (target) => access(target).then(() => true, () => false);
const readJson = async (target, fallback = null) => JSON.parse(await readFile(target, "utf8").catch((error) => {
  if (error.code === "ENOENT" && fallback !== null) return JSON.stringify(fallback);
  throw error;
}));
const unique = (values) => [...new Set(values.filter(Boolean))];

async function detectFeatureDirectories() {
  const roots = ["src/features", "app/features", "apps/web/src/features", "apps/mobile/src/features", "features"];
  const candidates = [];
  for (const root of roots) {
    const absolute = path.join(targetRoot, root);
    if (!(await stat(absolute).then((value) => value.isDirectory(), () => false))) continue;
    for (const entry of await readdir(absolute, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      candidates.push({ id: entry.name.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, ""), path: path.posix.join(root, entry.name), reason: "Independent feature directory" });
    }
  }
  return candidates;
}

async function scan() {
  const packagePath = path.join(targetRoot, "package.json");
  const packageJson = await readJson(packagePath, { scripts: {}, dependencies: {}, devDependencies: {} });
  const dependencies = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
  const hasPath = async (...segments) => exists(path.join(targetRoot, ...segments));
  const frameworks = unique([
    dependencies.next && "next",
    dependencies.astro && "astro",
    dependencies.vite && "vite",
    dependencies.expo && "expo",
    dependencies.react && "react",
    dependencies["@cloudflare/workers-types"] && "cloudflare-workers",
  ]);
  const signals = {
    packageManager: await hasPath("pnpm-lock.yaml") ? "pnpm" : await hasPath("yarn.lock") ? "yarn" : await hasPath("bun.lockb") || await hasPath("bun.lock") ? "bun" : "npm",
    frameworks,
    cloudflare: await hasPath("wrangler.toml") || await hasPath("wrangler.json") || await hasPath("wrangler.jsonc") || await hasPath("cloudflare"),
    betterAuth: Boolean(dependencies["better-auth"] || dependencies["@better-auth/expo"] || await hasPath("auth") || await hasPath("src", "auth")),
    drizzle: Boolean(dependencies["drizzle-orm"] || await hasPath("drizzle.config.ts")),
    postgres: Boolean(dependencies.postgres || dependencies.pg || process.env.DATABASE_URL || await hasPath("db")),
    web: Boolean(await hasPath("apps", "web") || await hasPath("src") || dependencies.react || dependencies.next || dependencies.astro),
    mobile: Boolean(await hasPath("apps", "mobile") || dependencies.expo),
    worker: Boolean(await hasPath("workers") || await hasPath("worker") || dependencies["@cloudflare/workers-types"]),
    admin: Boolean(await hasPath("apps", "web", "src", "components", "admin-page.tsx") || await hasPath("app", "admin") || await hasPath("src", "admin")),
    docs: Boolean(await hasPath("apps", "docs") || await hasPath("docs")),
  };
  const existingContracts = [];
  for (const file of ["package.json", "AGENTS.md", "AGENT_MAP.md", ".ai/agent-map.json", ".ai/features.json", ".ai/ownership.json", ".starter/adoption.json"])
    if (await hasPath(...file.split("/"))) existingContracts.push(file);
  return {
    schemaVersion: "starter-project-scan/v1",
    root: targetRoot,
    projectName: packageJson.name || path.basename(targetRoot),
    signals,
    existingContracts: unique(existingContracts),
    featureCandidates: await detectFeatureDirectories(),
  };
}

function buildPlan(report) {
  const managed = ["package.json", "AGENTS.md", ".starter/adoption.json", ".starter/adoption-plan.json", ".ai/agent-map.json", ".ai/features.json", ".ai/ownership.json", ".ai/feature-adoption-candidates.json", "AGENT_MAP.md", "scripts/starter-adoption.mjs"];
  return {
    schemaVersion: "starter-adoption-plan/v1",
    project: { name: report.projectName, root: report.root },
    source: { engine: "all2cf-starter-factory-v2", mode: "infrastructure-adoption" },
    decisions: [
      { area: "business-code", action: "keep", reason: "Product-owned behavior is never rewritten by infrastructure adoption." },
      { area: "visual-design", action: "keep", reason: "Existing custom visual ownership remains local." },
      { area: "ai-context", action: "adopt", reason: "Install a bounded Agent Map, feature registry and ownership receipt." },
      { area: "starter-runtime", action: "adopt", reason: "Install self-contained status, refresh and verification commands." },
      { area: "detected-features", action: "review", reason: "Feature ownership candidates require AI review before registration." },
    ],
    files: managed.map((file) => ({ path: file, action: report.existingContracts.includes(file) ? "merge" : "create" })),
    packageScripts: {
      "starter:adoption:status": "node scripts/starter-adoption.mjs status",
      "starter:adoption:verify": "node scripts/starter-adoption.mjs verify",
      "agent-map:refresh": "node scripts/starter-adoption.mjs refresh",
    },
  };
}

const bootstrapBlock = `<!-- BEGIN ALL2CF STARTER ADOPTION -->
## All2CF Starter adoption

Start ordinary work with \`AGENT_MAP.md\` and one matched route from \`.ai/agent-map.json\`. Run \`npm run starter:adoption:status\` before broad inspection. Business code and custom design remain product-owned; do not replace them with Starter templates. Register newly discovered domains through \`.ai/features.json\`, then run \`npm run agent-map:refresh\`. Reusable foundation fixes must also be ported to the canonical Starter.
<!-- END ALL2CF STARTER ADOPTION -->`;

const portableRuntime = `import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
const root = process.cwd();
const command = process.argv[2] || "status";
const required = ["AGENT_MAP.md", ".ai/agent-map.json", ".ai/features.json", ".ai/ownership.json", ".starter/adoption.json"];
const exists = (file) => access(path.join(root, file)).then(() => true, () => false);
const read = async (file) => JSON.parse(await readFile(path.join(root, file), "utf8"));
const json = (value) => \`\${JSON.stringify(value, null, 2)}\\n\`;
async function refresh() {
  const [map, registry] = await Promise.all([read(".ai/agent-map.json"), read(".ai/features.json")]);
  const routes = [...map.routes.filter((route) => route.source !== "adopted-product")];
  for (const feature of registry.features) routes.push({ id: feature.id, source: "adopted-product", summary: feature.summary, triggers: feature.triggers || [feature.id], primaryFiles: feature.primaryFiles || [], docs: feature.docs || [], checks: feature.checks || [] });
  map.routes = routes;
  await writeFile(path.join(root, ".ai/agent-map.json"), json(map));
  const tick = String.fromCharCode(96);
  const rows = routes.map((route) => "| " + tick + route.id + tick + " | " + String(route.summary || "").replaceAll("|", "\\\\|") + " | " + (route.primaryFiles || []).slice(0, 3).map((file) => tick + file + tick).join("<br>") + " |").join("\\n");
  await writeFile(path.join(root, "AGENT_MAP.md"), "# Agent Map\\n\\nRead one matched route, not the whole repository.\\n\\n| Domain | Purpose | Primary files |\\n|---|---|---|\\n" + rows + "\\n");
  return routes.length;
}
const missing = [];
for (const file of required) if (!(await exists(file))) missing.push(file);
if (command === "refresh") console.log(json({ ok: true, routes: await refresh() }));
else if (command === "verify") {
  if (missing.length) throw new Error(\`Starter adoption is incomplete: \${missing.join(", ")}\`);
  const receipt = await read(".starter/adoption.json");
  const map = await read(".ai/agent-map.json");
  if (receipt.schemaVersion !== "starter-adoption/v1" || map.schemaVersion !== "starter-agent-map/v1") throw new Error("Starter adoption contract is invalid");
  console.log(json({ ok: true, missing: [], routes: map.routes.length }));
} else console.log(json({ ok: missing.length === 0, missing, next: missing.length ? "Run adoption apply again" : "Read AGENT_MAP.md and one matched route" }));
`;

async function backupFile(file, backupRoot) {
  const source = path.join(targetRoot, file);
  if (!(await exists(source))) return;
  const destination = path.join(backupRoot, file);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });
}

async function applyPlan(report, plan) {
  const registryPath = path.join(targetRoot, ".ai", "features.json");
  const registry = await readJson(registryPath, { schemaVersion: "starter-feature-registry/v1", features: [] });
  if (registry.schemaVersion !== "starter-feature-registry/v1" || !Array.isArray(registry.features)) throw new Error("Existing feature registry uses an unsupported schema; adoption stopped before merge");
  const mapPath = path.join(targetRoot, ".ai", "agent-map.json");
  const map = await readJson(mapPath, {
    schemaVersion: "starter-agent-map/v1",
    version: "1.0.0",
    defaultReads: ["AGENTS.md", "AGENT_MAP.md", ".starter/adoption.json"],
    firstRunReads: [".ai/features.json", ".ai/ownership.json", ".starter/adoption-plan.json"],
    rules: { routine: "Read default files and one matched route only.", ownership: "Preserve product-owned business code and custom design." },
    routes: [],
  });
  if (map.schemaVersion !== "starter-agent-map/v1" || !Array.isArray(map.routes)) throw new Error("Existing Agent Map uses an unsupported schema; adoption stopped before merge");
  const ownershipPath = path.join(targetRoot, ".ai", "ownership.json");
  const ownership = await readJson(ownershipPath, { schemaVersion: "starter-ownership/v1", foundation: [], product: [] });
  if (ownership.schemaVersion !== "starter-ownership/v1") throw new Error("Existing ownership receipt uses an unsupported schema; adoption stopped before merge");
  const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const backupRoot = path.join(targetRoot, ".starter", "adoption-backups", stamp);
  await mkdir(path.join(targetRoot, ".starter"), { recursive: true });
  await mkdir(path.join(targetRoot, ".ai"), { recursive: true });
  await mkdir(path.join(targetRoot, "scripts"), { recursive: true });
  for (const file of ["AGENTS.md", "package.json", ".ai/agent-map.json", ".ai/features.json", ".ai/ownership.json", "AGENT_MAP.md", "scripts/starter-adoption.mjs"])
    await backupFile(file, backupRoot);

  const packagePath = path.join(targetRoot, "package.json");
  const packageJson = await readJson(packagePath, { name: report.projectName, private: true });
  packageJson.scripts = { ...(packageJson.scripts || {}), ...plan.packageScripts };
  await writeFile(packagePath, json(packageJson));

  const agentsPath = path.join(targetRoot, "AGENTS.md");
  const agents = await readFile(agentsPath, "utf8").catch(() => "# Project instructions\n");
  if (!agents.includes("BEGIN ALL2CF STARTER ADOPTION")) await writeFile(agentsPath, `${agents.trim()}\n\n${bootstrapBlock}\n`);

  await writeFile(registryPath, json(registry));
  await writeFile(mapPath, json(map));
  ownership.foundation = unique([...(ownership.foundation || []), ".starter", ".ai", "AGENT_MAP.md", "scripts/starter-adoption.mjs"]);
  ownership.product = unique([...(ownership.product || []), "business code", "business schema", "custom design"]);
  ownership.rule = "Adoption may merge foundation files but never overwrite product-owned behavior.";
  await writeFile(ownershipPath, json(ownership));
  await writeFile(path.join(targetRoot, ".ai", "feature-adoption-candidates.json"), json({ schemaVersion: "starter-feature-adoption-candidates/v1", generatedAt: new Date().toISOString(), candidates: report.featureCandidates }));
  await writeFile(path.join(targetRoot, ".starter", "adoption-plan.json"), json(plan));
  await writeFile(path.join(targetRoot, ".starter", "adoption.json"), json({ schemaVersion: "starter-adoption/v1", adoptedAt: new Date().toISOString(), source: plan.source, backup: relative(backupRoot), managedFiles: plan.files.map(({ path: file }) => file), status: "adopted", featureCandidates: report.featureCandidates.length }));
  const runtime = path.join(targetRoot, "scripts", "starter-adoption.mjs");
  await writeFile(runtime, portableRuntime);
  const refreshed = spawnSync(process.execPath, [runtime, "refresh"], { cwd: targetRoot, encoding: "utf8" });
  if (refreshed.status !== 0) throw new Error(`Adopted Agent Map refresh failed: ${refreshed.stderr || refreshed.stdout}`);
  return { backup: relative(backupRoot), files: plan.files.length, featureCandidates: report.featureCandidates.length };
}

if (!(await stat(targetRoot).then((value) => value.isDirectory(), () => false))) throw new Error(`Project root does not exist: ${targetRoot}`);
const report = await scan();
const plan = buildPlan(report);
if (command === "scan") console.log(json(report));
else if (command === "plan") console.log(json(plan));
else if (command === "apply") console.log(json({ ok: true, action: "applied", root: targetRoot, ...(await applyPlan(report, plan)) }));
else if (command === "verify") {
  const required = ["AGENTS.md", "AGENT_MAP.md", ".ai/agent-map.json", ".ai/features.json", ".ai/ownership.json", ".starter/adoption.json", "scripts/starter-adoption.mjs"];
  const missing = [];
  for (const file of required) if (!(await exists(path.join(targetRoot, file)))) missing.push(file);
  if (missing.length) throw new Error(`Adoption verification failed; missing ${missing.join(", ")}`);
  console.log(json({ ok: true, root: targetRoot, missing: [] }));
} else throw new Error(`Unknown project adoption command: ${command}`);
