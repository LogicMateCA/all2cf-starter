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

await Promise.all([
  requireDirectory(marketingRoot, "Marketing"),
  requireDirectory(appRoot, "React application"),
  requireDirectory(docsRoot, "Docs"),
]);
await rm(targetRoot, { recursive: true, force: true });
await cp(marketingRoot, targetRoot, { recursive: true });
await copyWithoutOverwrite(appRoot, path.join(targetRoot, "_app"));

const appSnapshot = path.join(appRoot, "dp/project.snapshot.json");
if (await exists(appSnapshot)) {
  await rm(path.join(targetRoot, "_app/dp"), { recursive: true, force: true });
  await copyWithoutOverwrite(appSnapshot, path.join(targetRoot, "dp/project.snapshot.json"));
}

const docsEntries = await readdir(docsRoot, { withFileTypes: true });
const allowedDocsEntries = new Set(["docs", "_docs", "pagefind"]);
const unexpected = docsEntries.map(({ name }) => name).filter((name) => !allowedDocsEntries.has(name));
if (unexpected.length) throw new Error(`Unexpected root output from Docs: ${unexpected.join(", ")}`);
for (const entry of docsEntries) await copyWithoutOverwrite(path.join(docsRoot, entry.name), path.join(targetRoot, entry.name));

console.log(`Merged Marketing, React application, and Docs into ${path.relative(root, targetRoot)}`);
