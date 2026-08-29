import { access, cp, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(root, "dist/docs-site");
const targetRoot = path.join(root, "dist/web");

async function exists(file) {
  try { await access(file); return true; }
  catch { return false; }
}

async function mergeDirectory(source, target) {
  if (!await exists(source)) throw new Error(`Docs build output is missing: ${source}`);
  if (await exists(target)) throw new Error(`Docs build would overwrite existing output: ${target}`);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { recursive: true, errorOnExist: true, force: false });
}

const entries = await readdir(sourceRoot, { withFileTypes: true });
const allowed = new Set(["docs", "_docs", "pagefind"]);
const unexpected = entries.map(({ name }) => name).filter((name) => !allowed.has(name));
if (unexpected.length) throw new Error(`Unexpected root output from Docs: ${unexpected.join(", ")}`);

for (const entry of entries) await mergeDirectory(path.join(sourceRoot, entry.name), path.join(targetRoot, entry.name));
console.log(`Merged Docs output: ${entries.map(({ name }) => name).join(", ")}`);
