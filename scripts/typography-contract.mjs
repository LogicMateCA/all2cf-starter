import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoots = ["apps", "packs"].map((directory) => path.join(root, directory));
const extensions = new Set([".css", ".ts", ".tsx", ".astro"]);
const ignoredDirectories = new Set(["dist", "node_modules", ".expo", "test-results"]);
const failures = [];
let scannedFiles = 0;

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(file);
      continue;
    }
    if (!extensions.has(path.extname(entry.name))) continue;
    scannedFiles += 1;
    const source = await readFile(file, "utf8");
    const checks = [
      { label: "CSS font-size", regex: /font-size\s*:\s*(\d+(?:\.\d+)?)px/gu },
      { label: "inline fontSize", regex: /fontSize\s*:\s*(\d+(?:\.\d+)?)(?![\d.])/gu },
      { label: "Tailwind arbitrary text", regex: /text-\[(\d+(?:\.\d+)?)px\]/gu },
    ];
    for (const { label, regex } of checks) {
      for (const match of source.matchAll(regex)) {
        const size = Number(match[1]);
        if (size === 0 || size >= 12) continue;
        const line = source.slice(0, match.index).split("\n").length;
        failures.push(`${path.relative(root, file)}:${line} ${label} ${size}px is below the 12px absolute floor`);
      }
    }
  }
}

for (const directory of sourceRoots) await walk(directory);

console.log(JSON.stringify({ ok: failures.length === 0, scannedFiles, minimumPx: 12, failures }, null, 2));
if (failures.length) process.exitCode = 1;
