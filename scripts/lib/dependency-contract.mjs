import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const applicationManifestFiles = [
  "package.json",
  "apps/web/package.json",
  "apps/docs/package.json",
  "apps/mobile/package.json",
  "workers/app/package.json",
];

export async function loadDependencyContract(root) {
  const policy = JSON.parse(await readFile(path.join(root, "dependency-policy.json"), "utf8"));
  const manifests = await Promise.all(applicationManifestFiles.map(async (file) => ({ file, value: JSON.parse(await readFile(path.join(root, file), "utf8")) })));
  const packFiles = (await readdir(path.join(root, "packs"), { recursive: true }))
    .filter((file) => String(file).endsWith("pack.json"))
    .map((file) => path.join("packs", String(file)))
    .sort();
  const packManifests = await Promise.all(packFiles.map(async (file) => ({ file, value: JSON.parse(await readFile(path.join(root, file), "utf8")) })));
  const declared = new Map();

  for (const { file, value } of manifests) {
    for (const section of ["dependencies", "devDependencies"]) {
      for (const [name, version] of Object.entries(value[section] || {})) {
        const entries = declared.get(name) || [];
        entries.push({ file, section, version });
        declared.set(name, entries);
      }
    }
  }
  for (const { file, value } of packManifests) {
    for (const dependency of value.dependencies || []) {
      const entries = declared.get(dependency.name) || [];
      entries.push({ file: `${file} -> ${dependency.packageFile}`, section: dependency.section, version: dependency.version, optionalPack: value.id });
      declared.set(dependency.name, entries);
    }
  }
  return { policy, manifests, packManifests, declared };
}

export function validateBetterAuthAlignment(policy, declared, packManifests) {
  const track = policy.tracks.find(({ id }) => id === "better-auth");
  const entries = (track?.packages || [])
    .flatMap((name) => (declared.get(name) || []).map((entry) => ({ name, version: entry.version, source: entry.file })));
  for (const { file, value } of packManifests) {
    const officialPackage = (value.dependencies || []).some(({ name }) => (track?.packages || []).includes(name));
    if (officialPackage && String(value.source?.name || "").startsWith("Better Auth") && value.source?.revision) {
      entries.push({ name: `${value.id}:source`, version: value.source.revision, source: file });
    }
  }
  const versions = [...new Set(entries.map(({ version }) => version))].sort();
  const failures = [];
  for (const entry of entries) {
    if (!/^\d+\.\d+\.\d+$/u.test(entry.version)) failures.push(`${entry.name} in ${entry.source} must use an exact stable version, found ${entry.version}`);
  }
  if (versions.length !== 1) failures.push(`Better Auth core and official plugins must use one exact version; found ${versions.join(", ") || "none"}`);
  return { ok: failures.length === 0, version: versions.length === 1 ? versions[0] : null, entries, failures };
}
