import { execFileSync } from "node:child_process";
import { readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const slug = `factory-contract-${process.pid}`;
const target = path.join(root, ".factory-output", slug);
const run = (script, args, cwd = root) => execFileSync(process.execPath, [path.join(root, script), ...args], { cwd, encoding: "utf8" });
const exists = async (file) => stat(file).then(() => true, () => false);

try {
  const created = JSON.parse(run("scripts/starter-factory.mjs", ["create", `--slug=${slug}`, "--name=Factory Contract", "--allow-dirty"]));
  const source = JSON.parse(await readFile(path.join(target, ".starter/source.json"), "utf8"));
  const blueprint = JSON.parse(await readFile(path.join(target, "starter.blueprint.json"), "utf8"));
  const status = JSON.parse(run("scripts/starter-factory.mjs", ["status", `--project-root=${target}`], target));
  const diff = JSON.parse(run("scripts/starter-factory.mjs", ["diff", `--project-root=${target}`], target));
  const dirty = execFileSync("git", ["status", "--porcelain"], { cwd: target, encoding: "utf8" }).trim();
  const failures = [];
  if (!created.ok || created.project.slug !== slug) failures.push("create report mismatch");
  if (created.fileCount > 700) failures.push(`generated project is too broad: ${created.fileCount} entries`);
  if (blueprint.setup.entry !== "/setup") failures.push("generated project does not retain /setup");
  if (source.sourceRoot !== root) failures.push("source root receipt mismatch");
  if (await exists(path.join(target, "packs"))) failures.push("Pack library leaked into generated project");
  if (await exists(path.join(target, "catalog"))) failures.push("Catalog library leaked into generated project");
  if (await exists(path.join(target, "node_modules"))) failures.push("node_modules leaked into generated project");
  if (!created.archive || !(await exists(created.archive))) failures.push("portable archive was not generated");
  if (!/^[a-f0-9]{64}$/u.test(created.archiveSha256 || "")) failures.push("portable archive hash is missing");
  if (dirty) failures.push("generated Git baseline is dirty");
  if (!status.ok || status.packs.length === 0) failures.push("status did not report installed Packs");
  if (!diff.ok || diff.changes.length) failures.push("fresh project has materialization drift");
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
  if (!injected.source.portable || injected.source.sourceRoot !== null || injected.source.updateMode !== "all2cf-managed" || injected.source.sourceUrl !== "https://app.all2cf.com/api/starter-v2/engine/contract" || injectedConfig.cloudflare.accountId || injectedConfig.cloudflare.zoneId || injectedConfig.cloudflare.zoneName !== "example.invalid")
    failures.push("portable capsule retained canonical infrastructure identity");
  if (injectedBlueprint.providers.storage.development.bucket !== `${injectedSlug}-dev-objects` || injectedBlueprint.providers.search.production.indexName !== `${injectedSlug}-vectorize` || injectedBlueprint.providers.media.stream.production.accountId !== "00000000000000000000000000000000")
    failures.push("portable Blueprint retained canonical resource identity");
  await rm(injectedTarget, { recursive: true, force: true });
  await rm(path.join(root, ".factory-output", `${injectedSlug}.tar.gz`), { force: true });
  run("scripts/starter-factory.mjs", ["add", "saas.account-security-2fa", `--project-root=${target}`], target);
  const addedStatus = JSON.parse(run("scripts/starter-factory.mjs", ["status", `--project-root=${target}`], target));
  const addedDiff = JSON.parse(run("scripts/starter-factory.mjs", ["diff", `--project-root=${target}`], target));
  if (!addedStatus.packs.some(({ id }) => id === "saas.account-security-2fa")) failures.push("add did not install the requested Pack");
  if (addedDiff.changes.length) failures.push("added project has materialization drift");
  const ownedPath = path.join(target, "workers/app/features/object-storage-worker.ts");
  const ownedSource = await readFile(ownedPath, "utf8");
  await writeFile(ownedPath, `${ownedSource}\n// product drift proof\n`);
  let conflictRefused = false;
  const conflict = execFileSync;
  try {
    conflict(process.execPath, [path.join(root, "scripts/starter-factory.mjs"), "update", `--project-root=${target}`], { cwd: target, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch { conflictRefused = true; }
  if (!conflictRefused) failures.push("update overwrote a product-modified Pack file");
  await writeFile(ownedPath, ownedSource);
  console.log(JSON.stringify({ ok: failures.length === 0, target, fileCount: created.fileCount, packs: status.packs.length, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  await rm(target, { recursive: true, force: true });
  await rm(path.join(root, ".factory-output", `${slug}.tar.gz`), { force: true });
}
