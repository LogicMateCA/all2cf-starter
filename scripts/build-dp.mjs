import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectKnowledge, stableSnapshot } from "./lib/knowledge.mjs";
import { compactDevelopmentPlan } from "./lib/dp-compact.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "apps/web/public/dp/project.snapshot.json");
const indexOutput = path.join(root, "apps/web/public/dp/project.index.json");
const snapshot = await collectKnowledge(root);
await mkdir(path.dirname(output), { recursive: true });
await Promise.all([
  writeFile(output, stableSnapshot(snapshot)),
  writeFile(indexOutput, stableSnapshot(compactDevelopmentPlan(snapshot))),
]);
console.log(`Development Plan snapshot written to ${path.relative(root, output)} and ${path.relative(root, indexOutput)}`);
