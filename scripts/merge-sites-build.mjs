import { access, cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const marketingRoot = path.join(root, "dist/marketing-site");
const appRoot = path.join(root, "dist/app-site");
const docsRoot = path.join(root, "dist/docs-site");
const targetRoot = path.join(root, "dist/web");

async function exists(file) {
  try { await access(file); return true; }
  catch { return false; }
}

async function requireDirectory(directory, label) {
  if (!await exists(directory)) throw new Error(`${label} build output is missing: ${directory}`);
}

async function copyWithoutOverwrite(source, target) {
  if (await exists(target)) throw new Error(`Build merge would overwrite existing output: ${target}`);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { recursive: true, errorOnExist: true, force: false });
}

const available = {
  marketing: await exists(marketingRoot),
  application: await exists(appRoot),
  docs: await exists(docsRoot),
};
if (!available.marketing && !available.application && !available.docs)
  throw new Error("No selected site build output is available to merge");
await rm(targetRoot, { recursive: true, force: true });
if (available.marketing) await cp(marketingRoot, targetRoot, { recursive: true });
else {
  await mkdir(targetRoot, { recursive: true });
  if (available.application) await cp(appRoot, targetRoot, { recursive: true });
}
if (available.marketing && available.application)
  await copyWithoutOverwrite(appRoot, path.join(targetRoot, "_app"));

const appDevelopmentPlan = path.join(appRoot, "dp");
if (available.application && await exists(appDevelopmentPlan)) {
  await rm(path.join(targetRoot, "_app/dp"), { recursive: true, force: true });
  await copyWithoutOverwrite(appDevelopmentPlan, path.join(targetRoot, "dp"));
}

if (available.docs) {
  const docsEntries = await readdir(docsRoot, { withFileTypes: true });
  const allowedDocsEntries = new Set(["docs", "_docs", "pagefind"]);
  const unexpected = docsEntries.map(({ name }) => !allowedDocsEntries.has(name) ? name : null).filter(Boolean);
  if (unexpected.length) throw new Error(`Unexpected root output from Docs: ${unexpected.join(", ")}`);
  for (const entry of docsEntries) await copyWithoutOverwrite(path.join(docsRoot, entry.name), path.join(targetRoot, entry.name));
}

console.log(`Merged selected site outputs (${Object.entries(available).filter(([, enabled]) => enabled).map(([name]) => name).join(", ")}) into ${path.relative(root, targetRoot)}`);
