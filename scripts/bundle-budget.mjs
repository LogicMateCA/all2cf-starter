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
