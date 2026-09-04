import { execFileSync } from "node:child_process";
import { readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const slug = `factory-contract-${process.pid}`;
const target = path.join(root, ".factory-output", slug);
const run = (script, args, cwd = root) => execFileSync(process.execPath, [path.join(root, script), ...args], { cwd, encoding: "utf8" });
const runWithEnv = (script, args, cwd, env) => execFileSync(process.execPath, [path.join(root, script), ...args], { cwd, encoding: "utf8", env: { ...process.env, ...env } });
const runProjectScript = (projectRoot, script, args = [], env = {}) => execFileSync(process.execPath, [path.join(projectRoot, script), ...args], { cwd: projectRoot, encoding: "utf8", env: { ...process.env, ...env } });
const exists = async (file) => stat(file).then(() => true, () => false);
async function referencedProjectSkills(directory) {
  const references = new Set();
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", "dist", ".wrangler"].includes(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      for (const reference of await referencedProjectSkills(absolute)) references.add(reference);
      continue;
    }
    if (!/\.(?:md|mdx|json|jsonc|ya?ml|toml|ts|tsx|js|mjs|cjs|txt)$/u.test(entry.name)) continue;
    const source = await readFile(absolute, "utf8");
    for (const match of source.matchAll(/(?<![a-z0-9_./-])(?:\.\/)?skills\/[a-z0-9][a-z0-9-]*\/SKILL\.md/gu))
      references.add(match[0].replace(/^\.\//u, ""));
  }
  return references;
}

try {
  const created = JSON.parse(run("scripts/starter-factory.mjs", ["create", `--slug=${slug}`, "--name=Factory Contract", "--allow-dirty"]));
  const source = JSON.parse(await readFile(path.join(target, ".starter/source.json"), "utf8"));
  const initialMaterialization = JSON.parse(await readFile(path.join(target, ".starter/materialization.json"), "utf8"));
  const blueprint = JSON.parse(await readFile(path.join(target, "starter.blueprint.json"), "utf8"));
  const shape = JSON.parse(await readFile(path.join(target, ".starter/product-shape.json"), "utf8"));
  const changePolicy = JSON.parse(await readFile(path.join(target, ".ai/change-policy.json"), "utf8"));
  const developmentWorker = JSON.parse(await readFile(path.join(target, "cloudflare/wrangler.development.jsonc"), "utf8"));
  const productionWorker = JSON.parse(await readFile(path.join(target, "cloudflare/wrangler.production.jsonc"), "utf8"));
  const status = JSON.parse(run("scripts/starter-factory.mjs", ["status", `--project-root=${target}`], target));
  const diff = JSON.parse(run("scripts/starter-factory.mjs", ["diff", `--project-root=${target}`], target));
  const dirty = execFileSync("git", ["status", "--porcelain"], { cwd: target, encoding: "utf8" }).trim();
  const failures = [];
  if (!created.ok || created.project.slug !== slug) failures.push("create report mismatch");
  if (created.fileCount > 500) failures.push(`generated project is too broad: ${created.fileCount} entries`);
  if (blueprint.setup.entry !== "/setup") failures.push("generated project does not retain /setup");
  if (shape.outputs.mobile !== false || await exists(path.join(target, "apps/mobile")))
    failures.push("default Web SaaS unexpectedly ships the optional Mobile application");
  if (changePolicy.enforcedAfter !== "root") failures.push("generated change policy does not start from its independent Git root");
  if (source.sourceRoot !== root) failures.push("source root receipt mismatch");
  if (await exists(path.join(target, "packs"))) failures.push("Pack library leaked into generated project");
  for (const foundationFile of ["apps/web/src/components/update-page.tsx", "apps/web/src/maintenance.css", "scripts/starter-link.mjs", "scripts/materialize-blueprint.mjs"])
    if (!initialMaterialization.packs?.["foundation.core"]?.files?.[foundationFile]) failures.push(`Foundation update ownership is missing ${foundationFile}`);
  for (const productAiFile of ["AGENTS.md", "AGENT_MAP.md", "CODEX.md"])
    if (initialMaterialization.packs?.["foundation.core"]?.files?.[productAiFile]) failures.push(`Product AI file must not be foundation-owned: ${productAiFile}`);
  for (const reference of ["catalog/catalog.json", "catalog/providers.json", "pages/catalog.json", "integrations/visual.json", ".ai/plugins.json"])
    if (!(await exists(path.join(target, reference)))) failures.push(`Generated AI reference is missing ${reference}`);
  if (blueprint.designProfile || blueprint.stylekit || blueprint.selections?.design?.length)
    failures.push("Generated project retained Starter-owned visual selection data");
  if (await exists(path.join(target, "design"))) failures.push("Starter visual data layer leaked into the generated project");
  if (await exists(path.join(target, "apps/web/public/stylekit-previews"))) failures.push("Style library preview assets leaked into the generated project");
  if (await exists(path.join(target, "plugins")))
    failures.push("Global Codex plugin source leaked into the generated project");
  for (const skillPath of await referencedProjectSkills(target))
    if (!(await exists(path.join(target, skillPath)))) failures.push(`Generated project references missing Skill ${skillPath}`);
  const generatedPlugins = JSON.parse(await readFile(path.join(target, ".ai/plugins.json"), "utf8"));
  const generatedProjectPlugin = generatedPlugins.plugins?.find(({ id }) => id === "all2cf-project");
  if (!generatedProjectPlugin || generatedProjectPlugin.installation !== "external-recommended" || generatedProjectPlugin.optional !== true || generatedProjectPlugin.path)
    failures.push("Generated project does not declare the optional global all2cf-project plugin correctly");
  for (const sourceOnly of [
    "scripts/source-release.mjs",
    "scripts/starter-factory.mjs",
    "scripts/factory-contract.mjs",
    "scripts/product-shape-contract.mjs",
    "scripts/product-shape-builds.mjs",
    "skills/starter-source-release/SKILL.md",
    "skills/starter-factory/SKILL.md",
    "skills/starter-update-release/SKILL.md",
    ".starter/factory-draft.local.json",
    "ALL2CF_FACTORY.md",
  ])
    if (await exists(path.join(target, sourceOnly))) failures.push(`Canonical source-release file leaked into generated project: ${sourceOnly}`);
  const generatedPackage = JSON.parse(await readFile(path.join(target, "package.json"), "utf8"));
  for (const required of [".ai/features.json", "scripts/feature-lifecycle.mjs", "skills/feature-lifecycle/SKILL.md"])
    if (!(await exists(path.join(target, required)))) failures.push(`Generated project is missing feature lifecycle file ${required}`);
  for (const command of ["feature:add", "feature:adopt", "feature:sync", "feature:coverage"])
    if (!generatedPackage.scripts?.[command]) failures.push(`Generated project is missing ${command}`);
  if (generatedPackage.scripts?.["feature:coverage"])
    runProjectScript(target, "scripts/feature-lifecycle.mjs", ["coverage"]);
  if (Object.keys(generatedPackage.scripts || {}).some((script) => script.startsWith("source:") || script.startsWith("engine:")))
    failures.push("Canonical source-release commands leaked into generated project");
  if (Object.keys(generatedPackage.scripts || {}).some((script) => script.startsWith("factory:") || script.startsWith("stylekit:")))
    failures.push("Canonical Factory or StyleKit source commands leaked into generated project");
  for (const sourceOnlyScript of ["plugin:contract", "dependencies:contract", "providers:contract", "design:contract", "typography:contract", "pages:contract", "saas:contract", "data-layer:drizzle:contract", "engine:channel:contract"])
    if (generatedPackage.scripts?.[sourceOnlyScript]) failures.push(`Canonical source contract leaked into generated project: ${sourceOnlyScript}`);
  if (Object.keys(generatedPackage.scripts || {}).some((script) => script.startsWith("mobile:")))
    failures.push("Web-only SaaS retained Mobile commands");
  if (developmentWorker.name !== `${slug}-dev` || developmentWorker.vars?.SERVICE_NAME !== slug || developmentWorker.vars?.APP_NAME !== "Factory Contract" || developmentWorker.vars?.AUTH_CANONICAL_ORIGIN !== `https://${slug}-dev.logicm8.com` || developmentWorker.routes?.[0]?.pattern !== `${slug}-dev.logicm8.com`)
    failures.push("Development Worker identity was not generated from the new project");
  if (productionWorker.name !== slug || productionWorker.vars?.SERVICE_NAME !== slug || productionWorker.vars?.APP_NAME !== "Factory Contract" || productionWorker.vars?.AUTH_CANONICAL_ORIGIN !== `https://${slug}.logicm8.com` || productionWorker.routes?.[0]?.pattern !== `${slug}.logicm8.com`)
    failures.push("Production Worker identity was not generated from the new project");
  if (developmentWorker.r2_buckets?.some(({ bucket_name }) => bucket_name.startsWith("starter")) || developmentWorker.queues?.producers?.some(({ queue }) => queue.startsWith("starter")))
    failures.push("Generated Worker retained canonical Starter resource names");
  if (/starter:(?:status|diff|add|update)/u.test(generatedPackage.scripts?.verify || ""))
    failures.push("Generated verification must not require a pre-publication update Channel");
  if (await exists(path.join(target, "node_modules"))) failures.push("node_modules leaked into generated project");
  if (!created.archive || !(await exists(created.archive))) failures.push("portable archive was not generated");
  if (!/^[a-f0-9]{64}$/u.test(created.archiveSha256 || "")) failures.push("portable archive hash is missing");
  if (dirty) failures.push("generated Git baseline is dirty");
  if (!status.ok || status.packs.length === 0) failures.push("status did not report installed Packs");
  if (!diff.ok || diff.changes.length) failures.push("fresh project has materialization drift");
  const linkedReceiptPath = path.join(target, ".starter/source.json");
  const linkedReceiptSource = await readFile(linkedReceiptPath, "utf8");
  await writeFile(linkedReceiptPath, JSON.stringify({ ...source, sourceRoot: "/unavailable-starter-source" }, null, 2) + "\n");
  const detachedStatus = JSON.parse(runProjectScript(target, "scripts/starter-link.mjs", ["status"]));
  await writeFile(linkedReceiptPath, linkedReceiptSource);
  if (!detachedStatus.ok || detachedStatus.source?.available !== false || detachedStatus.packs.length !== status.packs.length)
    failures.push("Detached archive cannot report installed Starter state without the linked source");
  const injectedSlug = `${slug}-capsule`;
  const injectedTarget = path.join(root, ".factory-output", injectedSlug);
  const injected = JSON.parse(execFileSync(process.execPath, [
    path.join(root, "scripts/starter-factory.mjs"),
    "create",
    `--slug=${injectedSlug}`,
    "--name=Factory Capsule Contract",
  ], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, STARTER_FACTORY_SOURCE_COMMIT: "1111111111111111111111111111111111111111", STARTER_FACTORY_PORTABLE: "true", STARTER_FACTORY_SOURCE_URL: "https://app.all2cf.com/api/starter-v2/engine/contract" },
  }));
  if (injected.source.sourceCommit !== "1111111111111111111111111111111111111111" || injected.source.sourceDirty)
    failures.push("immutable capsule source identity was not preserved as clean");
  const injectedConfig = JSON.parse(await readFile(path.join(injectedTarget, "starter.config.json"), "utf8"));
  const injectedBlueprint = JSON.parse(await readFile(path.join(injectedTarget, "starter.blueprint.json"), "utf8"));
  if (!injected.source.portable || injected.source.sourceRoot !== null || injected.source.updateMode !== "engine-channel" || injected.source.sourceUrl !== "https://app.all2cf.com/api/starter-v2/engine/contract" || injectedConfig.cloudflare.accountId || injectedConfig.cloudflare.zoneId || injectedConfig.cloudflare.zoneName !== "example.invalid")
    failures.push("portable capsule retained canonical infrastructure identity");
  if (injectedBlueprint.providers.storage.development.bucket !== `${injectedSlug}-dev-objects` || injectedBlueprint.providers.search.production.indexName !== `${injectedSlug}-vectorize` || injectedBlueprint.providers.media.stream.production.accountId !== "00000000000000000000000000000000")
    failures.push("portable Blueprint retained canonical resource identity");
  await rm(injectedTarget, { recursive: true, force: true });
  await rm(path.join(root, ".factory-output", `${injectedSlug}.tar.gz`), { force: true });
  const marketingFiles = Object.values(initialMaterialization.packs || {})
    .flatMap((pack) => Object.keys(pack.files || {}))
    .filter((file) => file.startsWith("apps/marketing/"));
  if (!marketingFiles.length) failures.push("functional update regression fixture has no owned marketing files");
  const marketingSnapshots = new Map();
  for (const file of marketingFiles) marketingSnapshots.set(file, await readFile(path.join(target, file), "utf8"));
  const marketingIndex = "apps/marketing/src/pages/index.astro";
  const marketingIndexSource = marketingSnapshots.get(marketingIndex);
  if (!marketingIndexSource) failures.push("functional update regression fixture is missing the marketing index");
  else {
    const customerMarketingIndex = `${marketingIndexSource}\n<!-- customer page marker -->\n`;
    await writeFile(path.join(target, marketingIndex), customerMarketingIndex);
    runWithEnv("scripts/starter-factory.mjs", ["add", "saas.account-security-2fa", `--project-root=${target}`], target, { STARTER_UPDATE_SCOPE: "functional" });
    for (const [file, content] of marketingSnapshots) {
      const expected = file === marketingIndex ? customerMarketingIndex : content;
      if (!(await exists(path.join(target, file)))) failures.push(`functional update deleted legacy product page ${file}`);
      else if (await readFile(path.join(target, file), "utf8") !== expected) failures.push(`functional update overwrote legacy product page ${file}`);
    }
    await writeFile(path.join(target, marketingIndex), marketingIndexSource);
    runWithEnv("scripts/starter-factory.mjs", ["update", `--project-root=${target}`], target, { STARTER_UPDATE_SCOPE: "functional" });
  }
  const addedStatus = JSON.parse(run("scripts/starter-factory.mjs", ["status", `--project-root=${target}`], target));
  const addedDiff = JSON.parse(runWithEnv("scripts/starter-factory.mjs", ["diff", `--project-root=${target}`], target, { STARTER_UPDATE_SCOPE: "functional" }));
  if (!addedStatus.packs.some(({ id }) => id === "saas.account-security-2fa")) failures.push("add did not install the requested Pack");
  if (addedDiff.changes.length) failures.push(`added project has materialization drift: ${JSON.stringify(addedDiff.changes)}`);
  const ownedPath = path.join(target, "workers/app/features/object-storage-worker.ts");
  const ownedSource = await readFile(ownedPath, "utf8");
  await writeFile(ownedPath, `${ownedSource}\n// product drift proof\n`);
  const agentMapPath = path.join(target, "AGENT_MAP.md");
  const agentMapSource = await readFile(agentMapPath, "utf8");
  const productAgentMap = `${agentMapSource}\n<!-- customer feature route proof -->\n`;
  await writeFile(agentMapPath, productAgentMap);
  const localOnlyDiff = JSON.parse(run("scripts/starter-factory.mjs", ["diff", `--project-root=${target}`], target));
  if (!localOnlyDiff.preserved.some(({ target: path }) => path === "workers/app/features/object-storage-worker.ts")) failures.push("diff did not classify the product-only Pack change as preserved");
  run("scripts/starter-factory.mjs", ["update", `--project-root=${target}`], target);
  if (await readFile(ownedPath, "utf8") !== `${ownedSource}\n// product drift proof\n`) failures.push("update overwrote a product-only Pack change");
  if (await readFile(agentMapPath, "utf8") !== productAgentMap) failures.push("update overwrote the product Agent Map");
  await writeFile(ownedPath, ownedSource);
  const caseCollisionPath = path.join(path.dirname(ownedPath), "Object-Storage-Worker.ts");
  await rm(ownedPath);
  await writeFile(caseCollisionPath, ownedSource);
  let caseCollisionRefused = false;
  try { run("scripts/starter-factory.mjs", ["diff", `--project-root=${target}`], target); } catch (error) { caseCollisionRefused = /collides by case/iu.test(String(error.stderr || error.message)); }
  if (!caseCollisionRefused) failures.push("case-insensitive product path collision was not refused");
  await rm(caseCollisionPath);
  await writeFile(ownedPath, ownedSource);
  const outsidePath = path.join(root, ".factory-output", `${slug}-outside.ts`);
  await writeFile(outsidePath, ownedSource);
  await rm(ownedPath);
  await symlink(outsidePath, ownedPath);
  let symlinkRefused = false;
  try { run("scripts/starter-factory.mjs", ["diff", `--project-root=${target}`], target); } catch (error) { symlinkRefused = /symbolic link/iu.test(String(error.stderr || error.message)); }
  if (!symlinkRefused) failures.push("symbolic-link materialization target was not refused");
  await rm(ownedPath);
  await rm(outsidePath);
  await writeFile(ownedPath, ownedSource);
  run("scripts/starter-factory.mjs", ["update", `--project-root=${target}`], target);
  const reconciledDiff = JSON.parse(run("scripts/starter-factory.mjs", ["diff", `--project-root=${target}`], target));
  if (reconciledDiff.changes.length || reconciledDiff.preserved.length) failures.push("factory safety probes left materialization receipt drift");
  console.log(JSON.stringify({ ok: failures.length === 0, target, fileCount: created.fileCount, packs: status.packs.length, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  await rm(target, { recursive: true, force: true });
  await rm(path.join(root, ".factory-output", `${slug}.tar.gz`), { force: true });
}
