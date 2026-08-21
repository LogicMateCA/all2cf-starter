import { execFileSync } from "node:child_process";
import { readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(
  await readFile(
    path.join(root, "design/stylekit/source-catalog.json"),
    "utf8",
  ),
);
const eligible = catalog.styles.filter(
  ({ classification, globalEligibility }) =>
    classification === "base-visual" && globalEligibility === "eligible",
);
const eligibleSlugs = new Set(eligible.map(({ slug }) => slug));
for (const entry of await readdir(path.join(root, "design/stylekit"), {
  withFileTypes: true,
})) {
  if (!entry.isDirectory() || eligibleSlugs.has(entry.name)) continue;
  const snapshotPath = path.join(
    root,
    "design/stylekit",
    entry.name,
    "snapshot.json",
  );
  try {
    await readFile(snapshotPath, "utf8");
    await rm(path.dirname(snapshotPath), { recursive: true });
  } catch {
    // Preserve non-snapshot directories: only generated owned snapshots are pruned.
  }
}
for (const { slug } of eligible)
  execFileSync(
    process.execPath,
    ["scripts/stylekit-snapshot.mjs", "--slug", slug, "--version", "2.2.0"],
    { cwd: root, stdio: "pipe" },
  );
console.log(
  JSON.stringify(
    {
      ok: true,
      snapshots: eligible.length,
      version: "2.2.0",
      slugs: eligible.map(({ slug }) => slug),
    },
    null,
    2,
  ),
);
