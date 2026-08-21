import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { loadDependencyContract, validateBetterAuthAlignment } from "./lib/dependency-contract.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const execFileAsync = promisify(execFile);
const lockfile = JSON.parse(await readFile(path.join(root, "package-lock.json"), "utf8"));
const { policy, packManifests, declared } = await loadDependencyContract(root);
const installed = new Map();

for (const [location, entry] of Object.entries(lockfile.packages || {})) {
  const marker = "node_modules/";
  const index = location.lastIndexOf(marker);
  if (index < 0 || !entry.version) continue;
  const name = location.slice(index + marker.length);
  const versions = installed.get(name) || new Set();
  versions.add(entry.version);
  installed.set(name, versions);
}

async function fetchLatest(name) {
  const { stdout } = await execFileAsync("npm", ["view", name, "dist-tags", "--json"], { cwd: root, encoding: "utf8", timeout: 15_000 });
  const latestStable = JSON.parse(stdout).latest;
  if (!latestStable) throw new Error(`${name} does not expose a latest dist-tag`);
  if (latestStable.includes("-") && !policy.preReleasePins?.[name])
    throw new Error(`${name} does not expose a stable latest dist-tag`);
  return latestStable;
}

const registryNames = [...new Set([
  ...policy.tracks.flatMap((track) => [...track.packages, ...(track.companions || [])]),
  ...Object.keys(policy.preReleasePins || {}),
])].sort();
const latestVersions = new Map();
let registryIndex = 0;
async function registryWorker() {
  while (registryIndex < registryNames.length) {
    const name = registryNames[registryIndex];
    registryIndex += 1;
    latestVersions.set(name, await fetchLatest(name));
  }
}
await Promise.all(Array.from({ length: Math.min(8, registryNames.length) }, () => registryWorker()));

const tracks = policy.tracks.map((track) => ({
  id: track.id,
  mode: track.mode,
  packages: track.packages.map((name) => ({
    name,
    declared: declared.get(name) || [],
    installed: [...(installed.get(name) || [])].sort(),
    externalPin: policy.externalPins?.[name] || null,
    latestStable: latestVersions.get(name),
    decision: track.mode === "expo-compatible" && name !== "expo" && name !== "eas-cli"
      ? "verify-with-expo-install"
      : declared.has(name) || policy.externalPins?.[name] ? "compare-and-test" : "planned-not-installed",
  })),
  ...(track.companions ? { companions: track.companions.map((name) => ({ name, declared: declared.get(name) || [], installed: [...(installed.get(name) || [])].sort(), latestStable: latestVersions.get(name) })) } : {}),
  ...(track.requirements ? { requirements: track.requirements } : {}),
}));

const betterAuth = validateBetterAuthAlignment(policy, declared, packManifests);

const result = {
  checkedAt: new Date().toISOString(),
  stableOnly: policy.stableOnly,
  alignment: {
    betterAuth,
  },
  preReleasePins: Object.fromEntries(
    Object.entries(policy.preReleasePins || {}).map(([name, pin]) => [
      name,
      {
        ...pin,
        latest: latestVersions.get(name),
        current: latestVersions.get(name) === pin.version,
      },
    ]),
  ),
  tracks,
};
console.log(JSON.stringify(result, null, 2));
if (!betterAuth.ok) process.exitCode = 1;
