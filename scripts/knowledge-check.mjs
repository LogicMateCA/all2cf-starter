import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectKnowledge } from "./lib/knowledge.mjs";
import { compactDevelopmentPlan } from "./lib/dp-compact.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snapshotPath = path.join(root, "apps/web/public/dp/project.snapshot.json");
const indexPath = path.join(root, "apps/web/public/dp/project.index.json");
const expected = await collectKnowledge(root);
const actual = JSON.parse(await readFile(snapshotPath, "utf8"));
const actualIndex = JSON.parse(await readFile(indexPath, "utf8"));

const normalized = (value) => {
  const copy = structuredClone(value);
  delete copy.generatedAt;
  return copy;
};

if (JSON.stringify(normalized(actual)) !== JSON.stringify(normalized(expected))) {
  throw new Error("Development Plan snapshot is stale. Run npm run knowledge:sync.");
}

if (JSON.stringify(normalized(actualIndex)) !== JSON.stringify(normalized(compactDevelopmentPlan(expected)))) {
  throw new Error("Development Plan compact index is stale. Run npm run knowledge:sync.");
}

if (expected.documentation.documentedModuleCount !== expected.documentation.moduleCount) {
  throw new Error(`Expected ${expected.documentation.moduleCount} module documents, found ${expected.documentation.documentedModuleCount}.`);
}

console.log(`Knowledge contracts verified for ${expected.documentation.moduleCount} modules.`);
