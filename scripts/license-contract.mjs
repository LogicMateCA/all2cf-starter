import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [license, guide, commercial, readme, pkg] = await Promise.all([
  read("LICENSE"), read("LICENSING.md"), read("COMMERCIAL-LICENSE.md"), read("README.md"), read("package.json").then(JSON.parse),
]);

assert.match(license, /GNU AFFERO GENERAL PUBLIC LICENSE/u);
assert.equal(pkg.license, "AGPL-3.0-or-later");
for (const source of [guide, commercial, readme]) assert.match(source, /\$199|US\$199/u);
assert.match(guide, /per independent product/iu);
assert.match(commercial, /one Licensed Product/u);
assert.match(commercial, /Third-party components/u);
assert.match(readme, /npm run setup/u);
assert.match(readme, /\/factory/u);
assert.match(readme, /\/setup/u);
assert.match(readme, /release:production/u);

console.log(JSON.stringify({ ok: true, openSource: "AGPL-3.0-or-later", commercialUsd: 199, unit: "independent-product" }, null, 2));
