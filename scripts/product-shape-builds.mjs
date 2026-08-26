import { execFileSync } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const baseBlueprint = JSON.parse(await readFile(path.join(root, "starter.blueprint.json"), "utf8"));
const baseConfig = JSON.parse(await readFile(path.join(root, "starter.config.json"), "utf8"));
const cases = [
  { id: "website-blog-build", project: { productType: "website", websiteType: "blog", companionSite: "none", webAdmin: false, platforms: ["desktop-web"] } },
  { id: "mobile-only-build", project: { productType: "mobile-app", websiteType: "landing", companionSite: "none", webAdmin: false, platforms: ["ios", "android"] } },
];
const evidence = [];
const permanent = new Set(["design.owned-neutral", "design.stylekit-adapted", "page.core-product-site", "saas.product-shell", "saas.identity-core", "saas.notifications-core", "saas.product-operations-lite"]);

for (const item of cases) {
  const slug = `${item.id}-${process.pid}`;
  const target = path.join(root, ".factory-output", slug);
  const input = path.join(root, `.starter/${item.id}.local.json`);
  const blueprint = structuredClone(baseBlueprint);
  blueprint.project = { ...blueprint.project, ...item.project, name: slug, slug };
  for (const group of Object.values(blueprint.selections)) for (const selection of group) {
    const selected = permanent.has(selection.id) || (item.id === "website-blog-build" && selection.id === "page.optional-growth");
    selection.lifecycle = { ...selection.lifecycle, selected, materialized: false, localVerified: false, developmentVerified: false, productionReleased: false };
  }
  try {
    await writeFile(input, `${JSON.stringify({ blueprint, config: baseConfig }, null, 2)}\n`);
    execFileSync(process.execPath, [path.join(root, "scripts/starter-factory.mjs"), "create", `--slug=${slug}`, `--name=${slug}`, `--input=${path.relative(root, input)}`, "--allow-dirty"], { cwd: root, stdio: "inherit" });
    execFileSync("npm", ["ci", "--no-audit", "--no-fund"], { cwd: target, stdio: "inherit" });
    execFileSync("npm", ["run", "typecheck"], { cwd: target, stdio: "inherit" });
    execFileSync("npm", ["run", "build"], { cwd: target, stdio: "inherit" });
    if (item.project.productType === "mobile-app") {
      execFileSync("npm", ["run", "export", "--workspace", "apps/mobile"], { cwd: target, stdio: "inherit" });
      execFileSync("npm", ["run", "cf:dry-run:dev"], { cwd: target, stdio: "inherit" });
    }
    const shape = JSON.parse(await readFile(path.join(target, ".starter/product-shape.json"), "utf8"));
    evidence.push({ id: item.id, outputs: shape.outputs, packageInstall: "passed", typecheck: "passed", build: "passed", mobileExport: item.project.productType === "mobile-app" ? "passed" : "not-applicable", workerDryRun: item.project.productType === "mobile-app" ? "passed" : "not-applicable" });
  } finally {
    await rm(input, { force: true });
    await rm(target, { recursive: true, force: true });
    await rm(path.join(root, ".factory-output", `${slug}.tar.gz`), { force: true });
  }
}

console.log(JSON.stringify({ ok: true, evidence }, null, 2));
