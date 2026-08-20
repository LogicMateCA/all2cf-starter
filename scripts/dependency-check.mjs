import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const policy = JSON.parse(await readFile(path.join(root, "dependency-policy.json"), "utf8"));
const lockfile = JSON.parse(await readFile(path.join(root, "package-lock.json"), "utf8"));
const manifests = await Promise.all([
  "package.json",
  "apps/web/package.json",
  "apps/docs/package.json",
  "apps/mobile/package.json",
  "workers/app/package.json",
].map(async (file) => ({ file, value: JSON.parse(await readFile(path.join(root, file), "utf8")) })));

const declared = new Map();
const installed = new Map();
for (const { file, value } of manifests) {
  for (const section of ["dependencies", "devDependencies"]) {
    for (const [name, version] of Object.entries(value[section] || {})) {
      const entries = declared.get(name) || [];
      entries.push({ file, section, version });
      declared.set(name, entries);
    }
  }
}

for (const [location, entry] of Object.entries(lockfile.packages || {})) {
  const marker = "node_modules/";
  const index = location.lastIndexOf(marker);
  if (index < 0 || !entry.version) continue;
  const name = location.slice(index + marker.length);
  const versions = installed.get(name) || new Set();
  versions.add(entry.version);
  installed.set(name, versions);
}

function latest(name) {
  const output = execFileSync("npm", ["view", name, "dist-tags", "--json"], { cwd: root, encoding: "utf8", timeout: 15_000 });
  const latestStable = JSON.parse(output).latest;
  if (!latestStable || latestStable.includes("-")) throw new Error(`${name} does not expose a stable latest dist-tag`);
  return latestStable;
}

const tracks = policy.tracks.map((track) => ({
  id: track.id,
  mode: track.mode,
  packages: track.packages.map((name) => ({
    name,
    declared: declared.get(name) || [],
    installed: [...(installed.get(name) || [])].sort(),
    externalPin: policy.externalPins?.[name] || null,
    latestStable: latest(name),
    decision: track.mode === "expo-compatible" && name !== "expo" && name !== "eas-cli"
      ? "verify-with-expo-install"
      : declared.has(name) || policy.externalPins?.[name] ? "compare-and-test" : "planned-not-installed",
  })),
  ...(track.companions ? { companions: track.companions.map((name) => ({ name, declared: declared.get(name) || [], installed: [...(installed.get(name) || [])].sort(), latestStable: latest(name) })) } : {}),
  ...(track.requirements ? { requirements: track.requirements } : {}),
}));

console.log(JSON.stringify({ checkedAt: new Date().toISOString(), stableOnly: policy.stableOnly, tracks }, null, 2));
