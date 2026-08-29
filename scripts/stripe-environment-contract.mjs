import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const [setup, environment, release, profile, links] = await Promise.all([
  read("apps/web/src/components/setup-page.tsx"),
  read("scripts/materialize-dev-env.mjs"),
  read("scripts/starterctl.mjs"),
  read("profiles/providers.json"),
  read("apps/web/src/lib/provider-setup-links.ts"),
]);

for (const name of ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_PRO", "STARTER_PRODUCTION_STRIPE_SECRET_KEY", "STARTER_PRODUCTION_STRIPE_PUBLISHABLE_KEY", "STARTER_PRODUCTION_STRIPE_WEBHOOK_SECRET", "STARTER_PRODUCTION_STRIPE_PRICE_PRO"]) {
  assert.match(setup, new RegExp(name, "u"), `${name} is missing from Setup`);
  assert.match(profile, new RegExp(name, "u"), `${name} is missing from the Provider profile`);
}
assert.match(environment, /apps\/web\/\.env\.production\.local/u);
assert.match(environment, /path\.join\(mobileRoot, "\.env\.production\.local"\)/u);
assert.match(environment, /values\.get\("STARTER_PRODUCTION_STRIPE_PUBLISHABLE_KEY"\)/u);
for (const name of ["STARTER_PRODUCTION_STRIPE_SECRET_KEY", "STARTER_PRODUCTION_STRIPE_WEBHOOK_SECRET", "STARTER_PRODUCTION_STRIPE_PRICE_PRO"])
  assert.match(release, new RegExp(name, "u"), `${name} is not mapped by Production release`);
assert.match(links, /Stripe test API keys/u);
assert.match(links, /Stripe live API keys/u);
assert.match(links, /Stripe go-live checklist/u);

console.log(JSON.stringify({ ok: true, development: "Stripe Test", production: "Stripe Live", clientSecretExposure: false }, null, 2));
