import { gzipSync } from "node:zlib";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2] || "all";
const results = [];

async function files(directory, pattern) {
  return (await readdir(directory)).filter((file) => pattern.test(file)).map((file) => path.join(directory, file));
}

async function exists(file) {
  try { await access(file); return true; }
  catch { return false; }
}

async function routeArtifact(publicRoot, route) {
  if (route === "/") return path.join(publicRoot, "index.html");
  const clean = route.replace(/^\/+|\/+$/gu, "");
  const candidates = [path.join(publicRoot, clean, "index.html"), path.join(publicRoot, `${clean}.html`)];
  for (const candidate of candidates) if (await exists(candidate)) return candidate;
  return candidates[0];
}

async function measure(file, budget, metric) {
  const source = await readFile(file);
  const size = metric === "gzip" ? gzipSync(source).byteLength : source.byteLength;
  results.push({ file: path.relative(root, file), metric, bytes: size, budget, ok: size <= budget });
}

if (target === "all" || target === "web") {
  const directory = path.join(root, "dist/web/_app/assets");
  for (const file of await files(directory, /^index-.*\.js$/u)) await measure(file, 30_000, "gzip");
  for (const file of await files(directory, /^react-vendor-.*\.js$/u)) await measure(file, 70_000, "gzip");
  for (const file of await files(directory, /^auth-page-.*\.js$/u)) await measure(file, 15_000, "gzip");
  for (const file of await files(directory, /^development-plan-page-.*\.js$/u)) await measure(file, 80_000, "gzip");
  for (const file of await files(directory, /^technology-status-chart-.*\.js$/u)) await measure(file, 130_000, "gzip");
  for (const [pattern, budget] of [
    [/^setup-page-.*\.js$/u, 30_000],
    [/^account-control-.*\.js$/u, 40_000],
    [/^product-shell-.*\.js$/u, 15_000],
    [/^admin-page-.*\.js$/u, 20_000],
  ])
    for (const file of await files(directory, pattern)) await measure(file, budget, "gzip");
  for (const file of await files(directory, /^index-.*\.css$/u)) await measure(file, 25_000, "gzip");
  const reviewedLargeChunks = /^(?:react-vendor|account-control|technology-status-chart)-/u;
  for (const file of await files(directory, /\.js$/u)) {
    if (reviewedLargeChunks.test(path.basename(file))) continue;
    await measure(file, 50_000, "gzip");
  }
  const blueprint = JSON.parse(await readFile(path.join(root, "starter.blueprint.json"), "utf8"));
  const mapSelected = blueprint.selections.capabilities.some(({ id, lifecycle }) => id === "capability.mapcn-web" && lifecycle.selected && lifecycle.materialized);
  const mapScripts = await files(directory, /^maplibre-gl-.*\.js$/u);
  const mapWorkerModules = await files(directory, /^maplibre-gl-(?:worker|shared)\.mjs$/u);
  const mapStyles = await files(directory, /^mapcn-web-page-.*\.css$/u);
  if (mapSelected) {
    if (mapScripts.length !== 1 || mapWorkerModules.length !== 2 || mapStyles.length !== 1) results.push({ file: "MapCN route assets", metric: "presence", bytes: mapScripts.length + mapWorkerModules.length + mapStyles.length, budget: 4, ok: false });
    for (const file of mapScripts) await measure(file, 300_000, "gzip");
    for (const file of mapWorkerModules) await measure(file, file.endsWith("shared.mjs") ? 180_000 : 20_000, "gzip");
    for (const file of mapStyles) await measure(file, 20_000, "gzip");
  } else if (mapScripts.length || mapWorkerModules.length || mapStyles.length) {
    results.push({ file: "unselected MapCN route assets", metric: "presence", bytes: mapScripts.length + mapWorkerModules.length + mapStyles.length, budget: 0, ok: false });
  }
}

if (target === "all" || target === "marketing") {
  const publicRoot = path.join(root, "dist/web");
  const blueprint = JSON.parse(await readFile(path.join(root, "starter.blueprint.json"), "utf8"));
  const catalog = JSON.parse(await readFile(path.join(root, "pages/catalog.json"), "utf8"));
  const selected = new Set(blueprint.pageSet.selected);
  for (const page of catalog.pages.filter(({ renderer }) => renderer === "astro-static")) {
    const artifact = await routeArtifact(publicRoot, page.route);
    const present = await exists(artifact);
    const expected = selected.has(page.id);
    results.push({ file: path.relative(root, artifact), metric: expected ? "selected-route" : "unselected-route", bytes: present ? 1 : 0, budget: expected ? 1 : 0, ok: present === expected });
    if (!present || !expected) continue;
    const html = await readFile(artifact, "utf8");
    const initialScripts = [...html.matchAll(/<script[^>]+src=["']([^"']+\.js)["']/gu)].map((match) => path.join(publicRoot, match[1].replace(/^\//u, "")));
    let initialBytes = 0;
    for (const file of initialScripts) initialBytes += gzipSync(await readFile(file)).byteLength;
    results.push({ file: `${path.relative(root, artifact)} initial scripts`, metric: "gzip", bytes: initialBytes, budget: 20_000, ok: initialBytes <= 20_000 });
  }
}

if (target === "all" || target === "docs") {
  const docsRoot = path.join(root, "dist/web");
  const html = (await readFile(path.join(docsRoot, "docs/index.html"))).toString();
  const initialScripts = [...html.matchAll(/src="\/_docs\/([^"]+\.js)"/gu)].map((match) => path.join(docsRoot, "_docs", match[1]));
  let initialBytes = 0;
  for (const file of initialScripts) initialBytes += gzipSync(await readFile(file)).byteLength;
  results.push({ file: "dist/web/docs/index.html initial scripts", metric: "gzip", bytes: initialBytes, budget: 20_000, ok: initialBytes <= 20_000 });
  const searchFiles = await readdir(path.join(docsRoot, "pagefind"), { recursive: true });
  const wasmFiles = searchFiles.filter((file) => String(file).endsWith(".pagefind")).map((file) => path.join(docsRoot, "pagefind", String(file)));
  for (const file of wasmFiles) await measure(file, 600_000, "raw");
}

if (target === "all" || target === "mobile") {
  const mobile = path.join(root, "apps/mobile/dist/_expo/static/js");
  for (const file of await files(path.join(mobile, "web"), /\.js$/u)) await measure(file, 400_000, "gzip");
  for (const file of await files(path.join(mobile, "ios"), /\.hbc$/u)) await measure(file, 3_100_000, "raw");
  for (const file of await files(path.join(mobile, "android"), /\.hbc$/u)) await measure(file, 3_400_000, "raw");
}

const failed = results.filter((result) => !result.ok);
console.log(JSON.stringify({ ok: failed.length === 0, target, results }, null, 2));
if (failed.length) process.exitCode = 1;
