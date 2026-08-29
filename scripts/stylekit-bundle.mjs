import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = process.env.STYLEKIT_SOURCE || "/tmp/starter-stylekit-audit.1dqNya/stylekit";
const revision = "29141b684d5abb967558eb8083fbae91dbbc51b8";
const catalogPath = path.join(root, "design/stylekit/source-catalog.json");
const outputPath = path.join(root, "design/stylekit/source-bundle.json");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));

async function artifact(relativePath) {
  const content = await readFile(path.join(sourceRoot, relativePath), "utf8");
  return { path: relativePath, sha256: createHash("sha256").update(content).digest("hex"), content };
}

const styles = [];
for (const entry of catalog.styles) {
  const files = [];
  for (const relativePath of [`lib/styles/${entry.slug}.ts`, `lib/styles/${entry.slug}-tokens.ts`, `lib/recipes/${entry.slug}.ts`]) files.push(await artifact(relativePath));
  const referenceEntries = entry.files.filter(({ path: filePath }) => filePath.includes("/showcase/") || filePath.startsWith("public/styles/"));
  const references = entry.globalEligibility === "eligible"
    ? await Promise.all(referenceEntries.map(({ path: filePath }) => artifact(filePath)))
    : referenceEntries.map(({ path: filePath, sha256 }) => ({ path: filePath, sha256 }));
  styles.push({ metadata: entry, files, references });
}

const bundle = {
  schemaVersion: "starter-stylekit-source-bundle/v1",
  bundleVersion: "1.0.0",
  purpose: "Offline owned-snapshot inputs. Eligible global systems retain substantive showcase and cover sources; pending or ineligible entries retain reference hashes only.",
  source: { name: "StyleKit", repository: "https://github.com/AnxForever/stylekit", revision, license: "MIT" },
  count: styles.length,
  styles,
};
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(bundle, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, output: "design/stylekit/source-bundle.json", revision, count: styles.length, bytes: Buffer.byteLength(JSON.stringify(bundle)) }, null, 2));
