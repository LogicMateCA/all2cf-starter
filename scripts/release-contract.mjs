import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [packageModel, controllerSource] = await Promise.all([
  readFile(path.join(root, "package.json"), "utf8").then(JSON.parse),
  readFile(path.join(root, "scripts/starterctl.mjs"), "utf8"),
]);
const failures = [];
const verify = packageModel.scripts.verify || "";
const syncCount = (verify.match(/npm run knowledge:sync/gu) || []).length;
if (syncCount !== 1) failures.push(`verify must run knowledge:sync exactly once; found ${syncCount}`);
if (!verify.includes("npm run cf:types:check") || /npm run cf:types(?:\s|&)/u.test(verify))
  failures.push("verify must check committed Cloudflare types without generating them first");
if (!verify.includes("npm run build:sites") || verify.includes("npm run build &&"))
  failures.push("verify must use build:sites after its single knowledge synchronization");
if (!controllerSource.includes("dirtyAfterVerification") || !controllerSource.includes("Release verification changed tracked files"))
  failures.push("release controller must recheck Git after all verification generators");
if (!packageModel.scripts["cf:types"]?.includes("wrangler types"))
  failures.push("explicit cf:types generator is missing");

console.log(JSON.stringify({ ok: failures.length === 0, syncCount, typesMode: "check-only", buildMode: "sites-only", postVerifyCleanCheck: true, failures }, null, 2));
if (failures.length) process.exitCode = 1;
