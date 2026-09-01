import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("source-release.mjs", import.meta.url), "utf8");
assert.match(source, /starter-release-qualification\/v1/u);
assert.match(source, /sourceTree: git\(\["rev-parse", "HEAD\^\{tree\}"\]\)/u);
assert.match(source, /lockfileSha256/u);
assert.match(source, /value\.node === identity\.node/u);
assert.match(source, /flag\("force-qualification"\)/u);
assert.match(source, /const projects = await Promise\.all/u);
assert.match(source, /verifyPortableProject\(source, "sql-first"/u);
assert.match(source, /verifyPortableProject\(source, "drizzle"/u);
assert.match(source, /qualificationReused/u);
assert.match(source, /npm_config_prefer_offline/u);
assert.doesNotMatch(source, /for \(const dataLayer of \["sql-first", "drizzle"\]\)/u);
console.log(JSON.stringify({ ok: true, qualificationKey: ["git-tree", "lockfile-sha256", "node"], portableProofs: "parallel", warmPromotionTargetMinutes: "3-5" }));
