import { execFileSync, spawnSync } from "node:child_process";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const slug = `drizzle-contract-${process.pid}`;
const target = path.join(root, ".factory-output", slug);
const run = (command, args, cwd = target) => {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.status !== 0)
    throw new Error(result.stderr || result.stdout || `${command} failed`);
  return result.stdout;
};
const writeBlueprintMode = async (access) => {
  const file = path.join(target, "starter.blueprint.json");
  const blueprint = JSON.parse(await readFile(file, "utf8"));
  blueprint.providers.database.access = access;
  const selection = blueprint.selections.capabilities.find(
    ({ id }) => id === "capability.data-layer-drizzle",
  );
  selection.lifecycle = {
    selected: access === "drizzle",
    materialized: selection.lifecycle.materialized,
    localVerified: false,
    developmentVerified: false,
    productionReleased: false,
  };
  await writeFile(file, `${JSON.stringify(blueprint, null, 2)}\n`);
};

try {
  run(process.execPath, [
    path.join(root, "scripts/starter-factory.mjs"),
    "create",
    `--slug=${slug}`,
    "--name=Drizzle Contract",
    "--allow-dirty",
  ], root);
  await writeBlueprintMode("drizzle");
  run(process.execPath, [path.join(root, "scripts/starter-factory.mjs"), "update", `--project-root=${target}`]);
  const workerPackage = JSON.parse(await readFile(path.join(target, "workers/app/package.json"), "utf8"));
  const rootPackage = JSON.parse(await readFile(path.join(target, "package.json"), "utf8"));
  const failures = [];
  if (workerPackage.dependencies["drizzle-orm"] !== "0.45.2") failures.push("drizzle-orm dependency missing");
  if (rootPackage.devDependencies["drizzle-kit"] !== "0.31.10") failures.push("drizzle-kit dependency missing");
  const schemaPath = path.join(target, "db/schema/product.ts");
  const originalSchema = await readFile(schemaPath, "utf8");
  await writeFile(schemaPath, `import { pgTable, text } from "drizzle-orm/pg-core";\nexport const contractProduct = pgTable("contract_product", { id: text("id").primaryKey() });\n`);
  run(path.join(target, "node_modules/.bin/drizzle-kit"), ["generate", "--name", "contract"]);
  const migrations = await readdir(path.join(target, "db/product-migrations"), { recursive: true });
  if (!migrations.some((file) => String(file).endsWith(".sql"))) failures.push("Drizzle Kit did not generate SQL");
  run(path.join(target, "node_modules/.bin/tsc"), [
    "--noEmit",
    "--skipLibCheck",
    "--module", "esnext",
    "--moduleResolution", "bundler",
    "--target", "es2022",
    "workers/app/product-database.ts",
    "db/schema/product.ts",
  ]);
  await writeFile(schemaPath, originalSchema);
  await rm(path.join(target, "db/product-migrations"), { recursive: true, force: true });
  await writeBlueprintMode("sql-first");
  run(process.execPath, [path.join(root, "scripts/starter-factory.mjs"), "update", `--project-root=${target}`]);
  const cleanWorkerPackage = JSON.parse(await readFile(path.join(target, "workers/app/package.json"), "utf8"));
  const cleanRootPackage = JSON.parse(await readFile(path.join(target, "package.json"), "utf8"));
  if (cleanWorkerPackage.dependencies["drizzle-orm"]) failures.push("drizzle-orm remained after deselection");
  if (cleanRootPackage.devDependencies["drizzle-kit"]) failures.push("drizzle-kit remained after deselection");
  for (const relative of ["db/schema/product.ts", "workers/app/product-database.ts", "drizzle.config.ts"])
    try {
      await readFile(path.join(target, relative));
      failures.push(`${relative} remained after deselection`);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  console.log(JSON.stringify({ ok: failures.length === 0, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  await rm(target, { recursive: true, force: true });
  await rm(path.join(root, ".factory-output", `${slug}.tar.gz`), { force: true });
}
