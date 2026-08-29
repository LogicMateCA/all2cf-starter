import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [setup, styles, factory, providers, project] = await Promise.all([
  read("apps/web/src/components/setup-page.tsx"), read("apps/web/src/index.css"), read("scripts/starter-factory.mjs"), read("catalog/providers.json").then(JSON.parse), read("PROJECT.md"),
]);

assert.match(setup, /Core product foundation/u);
assert.match(setup, /"Admin"/u);
assert.match(setup, /Billing & subscriptions/u);
assert.doesNotMatch(setup, /packsFor\("capability"\)\.map/u);
assert.match(setup, /providerTab/u);
assert.match(setup, /aria-label="Maps Provider"/u);
assert.match(setup, /MapCN \+ MapLibre/u);
assert.match(setup, /className="setup-shell" lang="en" translate="no"/u);
assert.match(setup, /Under development/u);
assert.match(setup, /\["essentials", "Essentials"\], \["advanced", "Advanced"\]/u);
assert.doesNotMatch(setup, /id: "capabilities", label: "Capabilities"/u);
assert.doesNotMatch(setup, /currentStep\.id === "capabilities"/u);
assert.match(setup, /id: "saas", label: "Modules"/u);
assert.doesNotMatch(setup, /<h2>SaaS Core<\/h2>/u);
assert.equal(setup.match(/>Product brief<\/span>/gu)?.length, 1);
for (const removed of ["What are you building?", "Primary users (optional)", "Core product objects", "Tenant model", "Charging model", "Intent-derived module proposal"])
  assert.doesNotMatch(setup, new RegExp(removed, "u"));
assert.match(setup, /summary: payload\.blueprint\.project\.brief/u);
assert.doesNotMatch(setup, /All2CF database connector/u);
assert.doesNotMatch(setup, /npx @all2cf\/database-connect/u);
for (const field of ["STARTER_PRODUCTION_STRIPE_SECRET_KEY", "STARTER_PRODUCTION_STRIPE_PUBLISHABLE_KEY", "STARTER_PRODUCTION_STRIPE_WEBHOOK_SECRET", "STARTER_PRODUCTION_STRIPE_PRICE_PRO"])
  assert.match(setup, new RegExp(field, "u"));
assert.match(setup, /Mobile default · included automatically/u);
assert.match(setup, /Billing not selected/u);
assert.match(styles, /\.pack-grid[\s\S]{0,100}repeat\(4/u);
assert.match(styles, /\.provider-option-grid[\s\S]{0,100}repeat\(4/u);
assert.match(styles, /\.setup-layout \{[\s\S]{0,100}min\(1540px/u);
assert.match(styles, /\.provider-option input \{ position: absolute; opacity: 0/u);
assert.doesNotMatch(styles, /\.setup-(?:main|stack|panel)[^{]*\{[^}]*overflow-y:\s*(?:auto|scroll)/u);
assert.match(factory, /applyAutomaticProviderDefaults/u);
assert.match(factory, /blueprint\.providers\.push\.provider = nativeMobile \? "expo-push" : "none"/u);
assert.match(project, /user who can list an organization-scoped Draft can request its generation/u);
assert.match(project, /authorization failures are service-credential drift, never user `Unauthorized`/u);

const push = providers.categories.find(({ id }) => id === "push");
const sms = providers.categories.find(({ id }) => id === "sms");
const maps = providers.categories.find(({ id }) => id === "maps");
assert.deepEqual(push?.defaultOptionIds, ["none"]);
assert(push.options.some(({ id }) => id === "expo-push"));
assert(sms.options.some(({ id }) => id === "twilio-sms"));
assert.equal(maps.selection, "single");
assert.deepEqual(maps.defaultOptionIds, ["none"]);
assert.deepEqual(maps.options.filter(({ id }) => ["none", "mapcn", "mapbox", "google-places"].includes(id)).map(({ id }) => id), ["none", "mapcn", "mapbox", "google-places"]);
assert.equal(maps.options.find(({ id }) => id === "mapcn").selectable, true);
assert.equal(maps.options.find(({ id }) => id === "mapbox").selectable, false);
assert.equal(maps.options.find(({ id }) => id === "google-places").selectable, false);
assert.equal(providers.categories.find(({ id }) => id === "database").options.find(({ id }) => id === "cfpg").selectable, false);
assert(!providers.categories.find(({ id }) => id === "notification-channels").options.some(({ id }) => id === "expo-push" || id === "twilio-sms"));

console.log(JSON.stringify({ ok: true, desktopColumns: 4, internalVerticalScroll: false, mobilePushDefault: true, smsCategory: "provider", objectStorageCategory: "provider", mapsCategory: "provider" }, null, 2));
