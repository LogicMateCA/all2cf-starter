import { gzipSync } from "node:zlib";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2] || "all";
const results = [];

async function files(directory, pattern) {
  return (await readdir(directory)).filter((file) => pattern.test(file)).map((file) => path.join(directory, file));
}

async function measure(file, budget, metric) {
  const source = await readFile(file);
  const size = metric === "gzip" ? gzipSync(source).byteLength : source.byteLength;
  results.push({ file: path.relative(root, file), metric, bytes: size, budget, ok: size <= budget });
}

if (target === "all" || target === "web") {
  const directory = path.join(root, "dist/web/assets");
  for (const file of await files(directory, /^index-.*\.js$/u)) await measure(file, 180_000, "gzip");
  for (const file of await files(directory, /^technology-status-chart-.*\.js$/u)) await measure(file, 130_000, "gzip");
  const blueprint = JSON.parse(await readFile(path.join(root, "starter.blueprint.json"), "utf8"));
  const mapSelected = blueprint.selections.capabilities.some(({ id, lifecycle }) => id === "capability.mapcn-web" && lifecycle.selected && lifecycle.materialized);
  const mapScripts = await files(directory, /^maplibre-gl-.*\.js$/u);
  const mapStyles = await files(directory, /^mapcn-web-page-.*\.css$/u);
  if (mapSelected) {
    if (mapScripts.length !== 1 || mapStyles.length !== 1) results.push({ file: "MapCN route assets", metric: "presence", bytes: mapScripts.length + mapStyles.length, budget: 2, ok: false });
    for (const file of mapScripts) await measure(file, 300_000, "gzip");
    for (const file of mapStyles) await measure(file, 20_000, "gzip");
  } else if (mapScripts.length || mapStyles.length) {
    results.push({ file: "unselected MapCN route assets", metric: "presence", bytes: mapScripts.length + mapStyles.length, budget: 0, ok: false });
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
