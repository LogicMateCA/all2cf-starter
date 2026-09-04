import { execFileSync } from "node:child_process";
import { readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const exists = (file) => stat(file).then(() => true, () => false);
const baseBlueprint = JSON.parse(await readFile(path.join(root, "starter.blueprint.json"), "utf8"));
const baseConfig = JSON.parse(await readFile(path.join(root, "starter.config.json"), "utf8"));
const cases = [
  { id: "web-saas", project: { productType: "web-saas", websiteType: "product", companionSite: "full", webAdmin: true, platforms: ["desktop-web"] }, present: ["apps/marketing", "apps/docs", "apps/web", "workers/app", "db", "cloudflare"], absent: [] },
  { id: "website-blog", project: { productType: "website", websiteType: "blog", companionSite: "none", webAdmin: false, platforms: ["desktop-web"] }, present: ["apps/marketing", "apps/web", "cloudflare/bindings.contract.json", ".starter/product-shape.json"], absent: ["apps/docs", "apps/mobile", "workers", "db", "db/migrations/0010_platform_administrators.sql", "cloudflare/wrangler.development.jsonc", "cloudflare/wrangler.production.jsonc"] },
  { id: "mobile-only", project: { productType: "mobile-app", websiteType: "landing", companionSite: "none", webAdmin: false, platforms: ["ios", "android"] }, present: ["apps/mobile", "apps/web", "workers/app", "db", "cloudflare", ".starter/product-shape.json"], absent: ["apps/marketing", "apps/docs"] },
];
const failures = [];
const permanent = new Set(["page.core-product-site", "saas.product-shell", "saas.identity-core", "saas.notifications-core", "saas.product-operations-lite"]);

for (const item of cases) {
  const slug = `shape-${item.id}-${process.pid}`;
  const target = path.join(root, ".factory-output", slug);
  const input = path.join(root, `.starter/product-shape-${item.id}.local.json`);
  const blueprint = structuredClone(baseBlueprint);
  blueprint.project = { ...blueprint.project, ...item.project, name: slug, slug };
  if (item.id !== "web-saas") {
    for (const group of Object.values(blueprint.selections)) for (const selection of group) {
      const selected = permanent.has(selection.id) || (item.id === "website-blog" && selection.id === "page.optional-growth");
      selection.lifecycle = { ...selection.lifecycle, selected, materialized: false, localVerified: false, developmentVerified: false, productionReleased: false };
    }
    blueprint.pageSet.selected = item.id === "website-blog" ? ["marketing.home", "growth.blog", "legal.privacy", "legal.terms", "system.not-found"] : [];
    blueprint.providers.storage.provider = "none";
  }
  try {
    await writeFile(input, `${JSON.stringify({ blueprint, config: baseConfig }, null, 2)}\n`);
    execFileSync(process.execPath, [path.join(root, "scripts/starter-factory.mjs"), "create", `--slug=${slug}`, `--name=${slug}`, `--input=${path.relative(root, input)}`, "--allow-dirty"], { cwd: root, encoding: "utf8" });
    for (const relative of item.present) if (!await exists(path.join(target, relative))) failures.push(`${item.id} is missing ${relative}`);
    for (const relative of item.absent) if (await exists(path.join(target, relative))) failures.push(`${item.id} retained ${relative}`);
    const shape = JSON.parse(await readFile(path.join(target, ".starter/product-shape.json"), "utf8"));
    const generatedBlueprint = JSON.parse(await readFile(path.join(target, "starter.blueprint.json"), "utf8"));
    if (shape.productType !== item.project.productType) failures.push(`${item.id} receipt product type mismatch`);
    const pushSelection = generatedBlueprint.selections.capabilities.find(({ id }) => id === "capability.expo-push");
    const expectsPush = item.project.platforms.some((platform) => platform === "ios" || platform === "android");
    if ((generatedBlueprint.providers.push.provider === "expo-push") !== expectsPush || pushSelection?.lifecycle.selected !== expectsPush)
      failures.push(`${item.id} Expo Push default does not match native mobile outputs`);
    const status = execFileSync("git", ["status", "--porcelain"], { cwd: target, encoding: "utf8" }).trim();
    if (status) failures.push(`${item.id} generated a dirty baseline`);
  } finally {
    await rm(input, { force: true });
    await rm(target, { recursive: true, force: true });
    await rm(path.join(root, ".factory-output", `${slug}.tar.gz`), { force: true });
  }
}

console.log(JSON.stringify({ ok: failures.length === 0, cases: cases.map(({ id }) => id), failures }, null, 2));
if (failures.length) process.exitCode = 1;
