import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (file) => readFile(new URL(file, root), "utf8");
const [migration, worker, admin, modules, app, web, webLoader, marketing, docs] = await Promise.all([
  read("db/migrations/0011_site_integrations.sql"),
  read("workers/app/index.ts"),
  read("apps/web/src/components/admin-analytics.tsx"),
  read("apps/web/src/lib/admin-modules.ts"),
  read("apps/web/src/App.tsx"),
  read("apps/web/index.html"),
  read("apps/web/src/lib/site-integrations-loader.ts"),
  read("apps/marketing/src/layouts/Base.astro"),
  read("apps/docs/astro.config.mjs"),
]);

assert.match(migration, /app_site_integration_revision/u);
assert.match(migration, /status in \('draft', 'published', 'disabled'\)/u);
assert.match(worker, /\/api\/public\/site-integrations\.js/u);
assert.match(worker, /\/api\/public\/site-integrations\/:id\/code\.js/u);
assert.match(worker, /Cache-Control.*max-age=60/u);
for (const excluded of ["/admin", "/login", "/setup", "/maintenance"])
  assert.match(worker, new RegExp(excluded.replace("/", "\\/"), "u"));
for (const provider of ["cloudflare-web-analytics", "google-analytics", "google-tag-manager", "plausible", "custom-external"])
  assert.match(worker, new RegExp(provider, "u"));
assert.doesNotMatch(worker, /app_site_(?:pageview|event|session)/u, "Starter must not collect its own analytics events");
assert.match(worker, /50_000/u);
assert.match(worker, /externalSources/u);
assert.doesNotMatch(worker, /\beval\s*\(/u);
assert.match(admin, /External analytics only/u);
assert.match(admin, /Script snippet or JavaScript/u);
assert.match(modules, /\/admin\/growth\/analytics/u);
assert.match(app, /path\.startsWith\("\/admin\/"\)/u);
assert.doesNotMatch(web, /site-integrations\.js/u);
assert.match(webLoader, /site-integrations\.js\?surface=web/u);
assert.match(marketing, /site-integrations\.js\?surface=marketing/u);
assert.match(docs, /site-integrations\.js\?surface=docs/u);

console.log(JSON.stringify({ ok: true, providers: 5, selfHostedAnalytics: false, surfaces: ["marketing", "web", "docs"] }));
