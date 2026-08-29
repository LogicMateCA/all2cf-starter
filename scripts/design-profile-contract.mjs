import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDependencyContract } from "./lib/dependency-contract.mjs";
import { renderDesignCSS, renderMobileDesign } from "./lib/design-engine.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(await readFile(path.join(root, "design/catalog.json"), "utf8"));
const { declared } = await loadDependencyContract(root);
const failures = [];
const requiredTargets = ["marketing", "desktop-web", "admin", "docs", "mobile"];
const implementedAdapterStates = new Set(["implemented", "local-verified", "development-verified", "production-released"]);

function luminance(hex) {
  const channels = hex.slice(1).match(/../gu)?.map((value) => Number.parseInt(value, 16) / 255);
  if (!channels || channels.length !== 3 || channels.some(Number.isNaN)) throw new Error(`Unsupported color ${hex}`);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(left, right) {
  const values = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

const profiles = [];
const signatures = new Map();
for (const profile of catalog.profiles || []) {
  for (const target of requiredTargets) if (!implementedAdapterStates.has(profile.adapters?.[target])) failures.push(`${profile.id} adapter ${target} must be implemented or verified`);
  if (profile.quality?.contrast !== "WCAG AA") failures.push(`${profile.id} must declare WCAG AA contrast`);
  if (profile.quality?.reducedMotion !== true) failures.push(`${profile.id} must support reduced motion`);
  for (const [dial, value] of Object.entries(profile.dials || {})) if (!Number.isInteger(value) || value < 1 || value > 10) failures.push(`${profile.id} dial ${dial} must be an integer from 1 to 10`);

  const contrastResults = [];
  for (const mode of ["light", "dark"]) {
    const colors = profile.semanticColors?.[mode];
    const pairs = {
      foregroundBackground: [colors?.foreground, colors?.background],
      foregroundSurface: [colors?.foreground, colors?.surface],
      mutedBackground: [colors?.muted, colors?.background],
      onAccentAccent: [colors?.onAccent, colors?.accent],
      dangerBackground: [colors?.danger, colors?.background],
    };
    for (const [name, pair] of Object.entries(pairs)) {
      let ratio = 0;
      try { ratio = contrast(pair[0], pair[1]); }
      catch (error) { failures.push(`${profile.id} ${mode} ${name}: ${error.message}`); }
      const rounded = Number(ratio.toFixed(2));
      contrastResults.push({ mode, pair: name, ratio: rounded, minimum: 4.5, ok: ratio >= 4.5 });
      if (ratio < 4.5) failures.push(`${profile.id} ${mode} ${name} contrast ${rounded} is below 4.5`);
    }
  }

  for (const source of profile.source || []) if (source.relationship === "adapted-donor" && (!source.url || !source.revision || !source.license)) failures.push(`${profile.id} adapted donor must pin URL, revision, and license`);
  const web = renderDesignCSS(profile);
  const mobile = renderMobileDesign(profile);
  if (!web.includes(`/* ${profile.id}@${profile.version} */`) || !web.includes("prefers-color-scheme: dark")) failures.push(`${profile.id} Web compiler output is incomplete`);
  if (!mobile.includes(`\"profileId\": \"${profile.id}\"`) || !mobile.includes("generatedMobileDesign")) failures.push(`${profile.id} Mobile compiler output is incomplete`);
  const signature = JSON.stringify({ direction: profile.direction, dials: profile.dials, colors: profile.semanticColors, radius: profile.tokens?.radius, fonts: [profile.tokens?.fontDisplay, profile.tokens?.fontMobileDisplay] });
  if (signatures.has(signature)) failures.push(`${profile.id} duplicates the visual contract of ${signatures.get(signature)}`);
  signatures.set(signature, profile.id);
  profiles.push({ id: profile.id, version: profile.version, adapters: Object.fromEntries(requiredTargets.map((target) => [target, profile.adapters[target]])), webBytes: Buffer.byteLength(web), mobileBytes: Buffer.byteLength(mobile), contrast: contrastResults });
}

const forbiddenRuntimeDependencies = [...declared.keys()].filter((name) => /(^|[/@-])(stylekit|powerai)([/@-]|$)/iu.test(name));
if (forbiddenRuntimeDependencies.length) failures.push(`Donor runtime dependencies are forbidden: ${forbiddenRuntimeDependencies.join(", ")}`);

console.log(JSON.stringify({ ok: failures.length === 0, profileCount: profiles.length, profiles, donorRuntimeDependencies: forbiddenRuntimeDependencies, failures }, null, 2));
if (failures.length) process.exitCode = 1;
