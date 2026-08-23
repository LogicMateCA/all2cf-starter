import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateDesignProviders } from "./lib/design-providers.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relative) => JSON.parse(await readFile(path.join(root, relative), "utf8"));
const [catalog, blueprint] = await Promise.all([readJson("design/providers.json"), readJson("starter.blueprint.json")]);
const failures = validateDesignProviders(catalog, blueprint);
if (failures.length) throw new Error(`Design Provider contract failed:\n- ${failures.join("\n- ")}`);
console.log(JSON.stringify({ ok: true, catalogVersion: catalog.catalogVersion, providers: catalog.providers.map(({ id, kind, status, items }) => ({ id, kind, status, items: items.length })), selected: blueprint.designExtensions.selected }, null, 2));
