import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDependencyContract, validateBetterAuthAlignment } from "./lib/dependency-contract.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { policy, declared, packManifests } = await loadDependencyContract(root);
const betterAuth = validateBetterAuthAlignment(policy, declared, packManifests);
console.log(JSON.stringify({ ok: betterAuth.ok, stableOnly: policy.stableOnly, betterAuth }, null, 2));
if (!betterAuth.ok) process.exitCode = 1;
