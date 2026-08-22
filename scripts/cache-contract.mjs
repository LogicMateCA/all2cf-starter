import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(path.join(root, "apps/marketing/public/_headers"), "utf8");
const built = await readFile(path.join(root, "dist/web/_headers"), "utf8");
const failures = [];
for (const pattern of ["/_app/assets/*", "/_marketing/*", "/_docs/*"])
  if (!source.includes(pattern)) failures.push(`Missing immutable cache rule ${pattern}`);
if (!source.includes("max-age=31536000, immutable")) failures.push("Hashed asset cache rule is not one year immutable");
if (source !== built) failures.push("Merged static artifact does not contain the reviewed _headers contract");
if (/\/dp\/\*|\/pagefind\/\*/u.test(source)) failures.push("Mutable DP or Pagefind outputs cannot receive immutable caching");

console.log(JSON.stringify({ ok: failures.length === 0, immutablePatterns: 3, mutableExcluded: ["/dp/*", "/pagefind/*"], failures }, null, 2));
if (failures.length) process.exitCode = 1;
