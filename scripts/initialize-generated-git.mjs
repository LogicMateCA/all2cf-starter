import { execFileSync } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
try {
  await access(path.join(root, ".git"));
  console.log(JSON.stringify({ ok: true, initialized: false, reason: "git-already-present" }, null, 2));
} catch {
  execFileSync("git", ["init", "-b", "main"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["config", "user.name", "All2CF Starter Factory"], { cwd: root });
  execFileSync("git", ["config", "user.email", "starter-factory@all2cf.local"], { cwd: root });
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["commit", "-m", "chore: initialize generated project"], { cwd: root, stdio: "ignore" });
  console.log(JSON.stringify({ ok: true, initialized: true, commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim() }, null, 2));
}
