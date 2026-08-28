import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [setup, styles, factory, providers] = await Promise.all([
  read("apps/web/src/components/setup-page.tsx"), read("apps/web/src/index.css"), read("scripts/starter-factory.mjs"), read("catalog/providers.json").then(JSON.parse),
]);

assert.match(setup, /SaaS Core/u);
assert.match(setup, /"Admin"/u);
assert.match(setup, /Billing & subscriptions/u);
assert.doesNotMatch(setup, /packsFor\("capability"\)\.map/u);
assert.match(setup, /capability\.expo-push", "capability\.twilio-sms/u);
assert.match(setup, /providerTab/u);
assert.match(setup, /Mobile default · included automatically/u);
assert.match(setup, /Billing not selected/u);
assert.match(styles, /\.pack-grid[\s\S]{0,100}repeat\(4/u);
assert.match(styles, /\.provider-option-grid[\s\S]{0,100}repeat\(4/u);
assert.match(styles, /\.provider-option input \{ position: absolute; opacity: 0/u);
assert.doesNotMatch(styles, /\.setup-(?:main|stack|panel)[^{]*\{[^}]*overflow-y:\s*(?:auto|scroll)/u);
assert.match(factory, /applyAutomaticProviderDefaults/u);
assert.match(factory, /blueprint\.providers\.push\.provider = nativeMobile \? "expo-push" : "none"/u);

const push = providers.categories.find(({ id }) => id === "push");
const sms = providers.categories.find(({ id }) => id === "sms");
assert.deepEqual(push?.defaultOptionIds, ["none"]);
assert(push.options.some(({ id }) => id === "expo-push"));
assert(sms.options.some(({ id }) => id === "twilio-sms"));
assert(!providers.categories.find(({ id }) => id === "notification-channels").options.some(({ id }) => id === "expo-push" || id === "twilio-sms"));

console.log(JSON.stringify({ ok: true, desktopColumns: 4, internalVerticalScroll: false, mobilePushDefault: true, smsCategory: "provider" }, null, 2));
