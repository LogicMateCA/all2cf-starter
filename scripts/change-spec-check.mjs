import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const policy = JSON.parse(await readFile(path.join(root, ".ai/change-policy.json"), "utf8"));
const runGit = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const isChangeSpec = (file) => file.startsWith(`${policy.changeSpecDirectory}/`) && file.endsWith(".md") && !file.endsWith("/_template.md");
const isGenerated = (file) => file.startsWith("apps/web/public/dp/") || file.startsWith("dist/") || file.startsWith(".all2cf/");
const isMaterial = (file) => !isChangeSpec(file) && !isGenerated(file);

function parseFrontmatter(source, file) {
  if (!source.startsWith("---\n")) throw new Error(`${file} is missing frontmatter`);
  const end = source.indexOf("\n---\n", 4);
  if (end < 0) throw new Error(`${file} has incomplete frontmatter`);
  const data = YAML.parse(source.slice(4, end)) || {};
  if (!data.id || !data.title || !data.status || !Array.isArray(data.affectedModules) || !Array.isArray(data.docsImpact)) throw new Error(`${file} is missing required Change Spec fields`);
  return data;
}

async function validateWorkingTree() {
  const lines = runGit(["status", "--porcelain"]).split("\n").filter(Boolean);
  const files = lines.map((line) => line.slice(3).split(" -> ").at(-1));
  if (!files.some(isMaterial)) return [];
  const specs = files.filter(isChangeSpec);
  if (!specs.length) return ["Working tree has material changes without a changed Change Spec"];
  for (const file of specs) parseFrontmatter(await readFile(path.join(root, file), "utf8"), file);
  return [];
}

function validateCommits() {
  try { runGit(["cat-file", "-e", `${policy.enforcedAfter}^{commit}`]); }
  catch { return [`Change policy baseline ${policy.enforcedAfter} does not exist`]; }
  const commits = runGit(["rev-list", "--reverse", `${policy.enforcedAfter}..HEAD`]).split("\n").filter(Boolean);
  const failures = [];
  for (const commit of commits) {
    const files = runGit(["diff-tree", "--no-commit-id", "--name-only", "-r", commit]).split("\n").filter(Boolean);
    if (files.some(isMaterial) && !files.some(isChangeSpec)) failures.push(`Commit ${commit.slice(0, 12)} has material changes without a Change Spec`);
  }
  return failures;
}

const failures = [...validateCommits(), ...await validateWorkingTree()];
if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, enforcedAfter: policy.enforcedAfter, workingTree: "covered", commits: "covered" }, null, 2));
}
