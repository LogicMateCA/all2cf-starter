import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relativePath) =>
  JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
const [catalog, schema] = await Promise.all([
  readJson("catalog/providers.json"),
  readJson("schemas/provider-catalog.schema.json"),
]);
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
const failures = [];
if (!validate(catalog))
  failures.push(
    `Provider Catalog schema failed: ${ajv.errorsText(validate.errors, { separator: "; " })}`,
  );

const expectedCategories = new Set([
  "database",
  "authentication",
  "social-auth",
  "email",
  "billing",
  "object-storage",
  "anti-abuse",
  "observability",
  "analytics",
  "ai",
  "search-vector",
  "maps",
  "notification-channels",
  "media",
  "background-realtime",
  "cache-feature-flags",
  "release-platforms",
]);
const categoryIds = new Set();
for (const category of catalog.categories || []) {
  if (categoryIds.has(category.id)) failures.push(`Duplicate Provider category ${category.id}`);
  categoryIds.add(category.id);
  const options = new Map();
  for (const option of category.options || []) {
    if (options.has(option.id)) failures.push(`Duplicate ${category.id} option ${option.id}`);
    options.set(option.id, option);
    if (option.status === "planned" && option.selectable)
      failures.push(`Planned option ${category.id}.${option.id} cannot be selectable`);
    if (option.selectable && option.delivery === "planned")
      failures.push(`Selectable option ${category.id}.${option.id} cannot use planned delivery`);
    if (option.verification.available && option.verification.mode === "none")
      failures.push(`Verified option ${category.id}.${option.id} needs a real verification mode`);
  }
  for (const id of category.defaultOptionIds || [])
    if (!options.has(id)) failures.push(`${category.id} default ${id} is missing`);
  if (category.selection === "single" && category.defaultOptionIds.length !== 1)
    failures.push(`${category.id} single selection needs exactly one default`);
  if (!category.required && !options.has("none"))
    failures.push(`Optional category ${category.id} must provide None`);
  if (category.required && options.has("none"))
    failures.push(`Required category ${category.id} cannot provide None`);
}
for (const id of expectedCategories)
  if (!categoryIds.has(id)) failures.push(`Missing Provider category ${id}`);
for (const id of categoryIds)
  if (!expectedCategories.has(id)) failures.push(`Unexpected Provider category ${id}`);

const option = (categoryId, optionId) =>
  catalog.categories.find(({ id }) => id === categoryId)?.options.find(({ id }) => id === optionId);
for (const [categoryId, optionId] of [
  ["database", "native-postgresql"],
  ["database", "cfpg"],
  ["social-auth", "google"],
  ["email", "cfsend"],
  ["billing", "stripe"],
  ["object-storage", "cloudflare-r2"],
  ["object-storage", "s3-compatible"],
  ["maps", "mapcn"],
  ["background-realtime", "queues"],
  ["release-platforms", "cloudflare"],
])
  if (!option(categoryId, optionId)?.selectable)
    failures.push(`Executable Provider ${categoryId}.${optionId} must be selectable`);
for (const [categoryId, optionId] of [
  ["anti-abuse", "turnstile"],
])
  if (option(categoryId, optionId)?.selectable)
    failures.push(`Unimplemented Provider ${categoryId}.${optionId} must stay disabled`);

const result = {
  ok: failures.length === 0,
  schemaVersion: catalog.schemaVersion,
  catalogVersion: catalog.catalogVersion,
  categoryCount: catalog.categories.length,
  optionCount: catalog.categories.reduce((total, category) => total + category.options.length, 0),
  selectableCount: catalog.categories.flatMap(({ options }) => options).filter(({ selectable }) => selectable).length,
  plannedCount: catalog.categories.flatMap(({ options }) => options).filter(({ status }) => status === "planned").length,
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
