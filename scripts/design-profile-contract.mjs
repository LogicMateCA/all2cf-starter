import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDependencyContract } from "./lib/dependency-contract.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exists = (relative) => stat(path.join(root, relative)).then(() => true, () => false);
const blueprint = JSON.parse(await readFile(path.join(root, "starter.blueprint.json"), "utf8"));
const catalog = JSON.parse(await readFile(path.join(root, "catalog/catalog.json"), "utf8"));
const { declared } = await loadDependencyContract(root);
const failures = [];

for (const relative of ["design", "packs/design", "apps/web/public/stylekit-previews", "scripts/lib/design-engine.mjs"])
  if (await exists(relative)) failures.push(`Starter-owned visual data must not exist: ${relative}`);
if (blueprint.designProfile || blueprint.stylekit) failures.push("Blueprint contains a Starter-owned visual profile");
if (blueprint.selections?.design?.length) failures.push("Blueprint selects a Starter-owned design Pack");
if (catalog.packs?.some(({ kind, id }) => kind === "design" || id.startsWith("design.")))
  failures.push("Pack catalog contains a Starter-owned design Pack");
if (blueprint.visualIntegration?.plugin?.id !== "visual-design") failures.push("Visual Design must be the declared visual owner");
const forbiddenRuntimeDependencies = [...declared.keys()].filter((name) => /(^|[/@-])(stylekit|powerai)([/@-]|$)/iu.test(name));
if (forbiddenRuntimeDependencies.length) failures.push(`Visual donor runtime dependencies are forbidden: ${forbiddenRuntimeDependencies.join(", ")}`);

console.log(JSON.stringify({ ok: failures.length === 0, visualOwner: blueprint.visualIntegration?.plugin?.id, starterVisualProfiles: 0, donorRuntimeDependencies: forbiddenRuntimeDependencies, failures }, null, 2));
if (failures.length) process.exitCode = 1;
