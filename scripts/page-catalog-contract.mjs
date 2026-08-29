import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(await readFile(path.join(root, "pages/catalog.json"), "utf8"));
const growthPack = JSON.parse(await readFile(path.join(root, "packs/pages/optional-growth/pack.json"), "utf8"));

const expectedRouteFiles = [
  "src/pages/404.astro",
  "src/pages/[regular].astro",
  "src/pages/about.astro",
  "src/pages/blog/[single].astro",
  "src/pages/blog/index.astro",
  "src/pages/blog/page/[page].astro",
  "src/pages/careers/[single].astro",
  "src/pages/careers/index.astro",
  "src/pages/case-studies/[single].astro",
  "src/pages/case-studies/index.astro",
  "src/pages/case-studies/page/[page].astro",
  "src/pages/changelog.astro",
  "src/pages/contact.astro",
  "src/pages/features.astro",
  "src/pages/index.astro",
  "src/pages/integrations/[single].astro",
  "src/pages/integrations/index.astro",
  "src/pages/login.astro",
  "src/pages/pricing.astro",
  "src/pages/sign-up.astro",
];

const inventory = catalog.sourceInventory;
const actualRouteFiles = inventory?.routeFiles?.map(({ path: sourcePath }) => sourcePath) ?? [];
const sorted = (values) => [...values].sort();
const failures = [];

if (catalog.catalogVersion !== "0.4.0") failures.push("pages/catalog.json must use catalogVersion 0.4.0");
if (inventory?.sourceRoot !== "PowerAI Astro/src/pages") failures.push("PowerAI sourceRoot is not pinned");
if (actualRouteFiles.length !== 20) failures.push(`PowerAI route inventory must contain 20 files, found ${actualRouteFiles.length}`);
if (JSON.stringify(sorted(actualRouteFiles)) !== JSON.stringify(sorted(expectedRouteFiles))) failures.push("PowerAI route inventory does not match the pinned 20-file source tree");
if (new Set(actualRouteFiles).size !== actualRouteFiles.length) failures.push("PowerAI route inventory contains duplicate files");

const familyIds = new Set((inventory?.routeFamilies ?? []).map(({ id }) => id));
for (const sourcePath of ["src/pages/blog/index.astro", "src/pages/blog/[single].astro", "src/pages/blog/page/[page].astro", "src/pages/case-studies/index.astro", "src/pages/case-studies/[single].astro", "src/pages/case-studies/page/[page].astro", "src/pages/careers/index.astro", "src/pages/careers/[single].astro", "src/pages/integrations/index.astro", "src/pages/integrations/[single].astro"]) {
  const routeFile = inventory.routeFiles.find(({ path: currentPath }) => currentPath === sourcePath);
  if (routeFile?.status !== "adapted") failures.push(`${sourcePath} must be marked adapted because its owned template is materializable`);
}
for (const familyId of ["growth.blog", "growth.case-studies", "growth.careers", "growth.integrations"]) {
  const family = inventory.routeFamilies.find(({ id }) => id === familyId);
  if (!family) failures.push(`Missing PowerAI route family ${familyId}`);
  else if (family.status !== "implemented") failures.push(`${familyId} must be implemented after its complete family is materializable`);
  else if (family.index?.status !== "adapted" || family.detail?.status !== "adapted") failures.push(`${familyId} index and detail must be adapted`);
  else if (family.pagination && family.pagination.status !== "adapted") failures.push(`${familyId} pagination must be adapted`);
}
for (const familyId of ["growth.blog", "growth.case-studies"]) {
  const family = inventory.routeFamilies.find(({ id }) => id === familyId);
  if (!family?.pagination) failures.push(`${familyId} must model pagination separately`);
}
for (const familyId of ["growth.blog", "growth.case-studies", "growth.careers", "growth.integrations"]) {
  const family = inventory.routeFamilies.find(({ id }) => id === familyId);
  if (!family?.index || !family?.detail || !family.contentCollection) failures.push(`${familyId} must model index, detail, and content collection`);
  const collection = inventory.contentCollections.find(({ name }) => name === family?.contentCollection);
  if (collection?.status !== "adapted") failures.push(`${familyId} content collection must be adapted`);
  const ownedFiles = growthPack.pageFiles?.[familyId] ?? [];
  if (!ownedFiles.some(({ target }) => target.endsWith("index.astro"))) failures.push(`${familyId} pack must own its index route`);
  if (!ownedFiles.some(({ target }) => target.includes("[slug].astro"))) failures.push(`${familyId} pack must own its detail route`);
  if (!ownedFiles.some(({ target }) => target.includes("/content/"))) failures.push(`${familyId} pack must own a schema-validating sample entry`);
}
if (!growthPack.files?.some(({ target }) => target === "apps/marketing/src/content.config.ts")) failures.push("Growth pack must own the Astro content collection configuration");
if (!growthPack.dependencies?.some(({ name, version }) => name === "@astrojs/rss" && version === "4.0.19")) failures.push("Growth pack must pin the current reviewed @astrojs/rss dependency");

const donorDecisions = [...(catalog.donorAudit?.decisions ?? []), ...(inventory?.donorDecisions ?? [])];
for (const sourcePath of ["src/pages/[regular].astro", "src/pages/login.astro", "src/pages/sign-up.astro"]) {
  if (!donorDecisions.some((decision) => decision.sourcePath === sourcePath)) failures.push(`Missing donor decision for ${sourcePath}`);
}
for (const pageId of ["growth.blog", "growth.case-studies", "growth.careers", "growth.integrations"]) {
  const page = catalog.pages.find(({ id }) => id === pageId);
  if (page?.status !== "local-verified")
    failures.push(
      `${pageId} page entry must retain reusable local browser verification`,
    );
}

if (failures.length) {
  throw new Error(`Page catalog contract failed:\n- ${failures.join("\n- ")}`);
}

console.log(`Page catalog contract verified: ${actualRouteFiles.length} pinned PowerAI route files and ${familyIds.size} route families.`);
