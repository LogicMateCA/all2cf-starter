import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectKnowledge, stableSnapshot } from "./lib/knowledge.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "apps/web/public/dp/project.snapshot.json");
const snapshot = await collectKnowledge(root);
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, stableSnapshot(snapshot));
console.log(`Development Plan snapshot written to ${path.relative(root, output)}`);

