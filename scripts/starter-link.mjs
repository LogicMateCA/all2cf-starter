import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const receipt = JSON.parse(await readFile(path.join(projectRoot, ".starter/source.json"), "utf8"));
if (!receipt.sourceRoot) throw new Error(".starter/source.json does not declare sourceRoot");
const result = spawnSync(process.execPath, [
  path.join(receipt.sourceRoot, "scripts/starter-factory.mjs"),
  ...process.argv.slice(2),
  `--project-root=${projectRoot}`,
], { cwd: projectRoot, stdio: "inherit" });
process.exit(result.status ?? 1);
