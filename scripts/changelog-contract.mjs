import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const version = process.argv.find((value) => value.startsWith("--version="))?.slice("--version=".length);
const source = await readFile(new URL("../CHANGELOG.md", import.meta.url), "utf8");
assert.match(source, /^# Changelog$/mu);
assert.match(source, /^## \[Unreleased\]$/mu);

if (version) {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const headings = [...source.matchAll(new RegExp(`^## \\[${escaped}\\] - (\\d{4}-\\d{2}-\\d{2})$`, "gmu"))];
  assert.equal(headings.length, 1, `CHANGELOG must contain exactly one dated ${version} entry`);
  const start = headings[0].index;
  const next = source.indexOf("\n## [", start + 1);
  const entry = source.slice(start, next < 0 ? source.length : next);
  for (const section of ["Added", "Changed", "Fixed", "Performance", "Security", "Migration"])
    assert.match(entry, new RegExp(`^### ${section}$`, "mu"), `${version} is missing ${section} release notes`);
  assert.match(source, new RegExp(`^\\[${escaped}\\]: https://github\\.com/LogicMateCA/all2cf-starter/releases/tag/v${escaped}$`, "mu"));
}

console.log(JSON.stringify({ ok: true, version: version || "unreleased", timeline: true }, null, 2));
