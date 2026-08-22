import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const receipt = JSON.parse(await readFile(path.join(projectRoot, ".starter/source.json"), "utf8"));
if (!receipt.sourceRoot)
  throw new Error(
    receipt.updateMode === "all2cf-managed"
      ? `This portable project is updated through All2CF (${receipt.sourceUrl || "source URL unavailable"}).`
      : ".starter/source.json does not declare sourceRoot",
  );
const result = spawnSync(process.execPath, [
  path.join(receipt.sourceRoot, "scripts/starter-factory.mjs"),
  ...process.argv.slice(2),
  `--project-root=${projectRoot}`,
], { cwd: projectRoot, stdio: "inherit" });
process.exit(result.status ?? 1);
