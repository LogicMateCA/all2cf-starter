---
title: "Starter performance contract"
status: "template"
source: "starter"
---

# Performance

## Budgets

- Largest contentful paint: `< 2.5s` at the 75th percentile.
- Interaction to next paint: `< 200ms` at the 75th percentile.
- Cumulative layout shift: `< 0.1`.
- Initial JavaScript: `< 180KB` gzip until a project-specific budget replaces it.
- The shared React route dispatcher stays below `30KB` gzip. Route implementations for Login, Product, Admin, Setup and `/dp` must remain dynamic chunks so one route never downloads another route's UI or data model.
- Default Astro Marketing routes require `0KB` initial JavaScript; an individual Page Pack may add a route-specific island only with a measured reason and a `< 20KB` gzip route budget before project-specific changes.
- Desktop Chart code must be lazy-loaded outside the main route bundle.
- Below-fold charts must wait until they approach the viewport. Their loading frame reserves final chart height so deferred code cannot introduce layout shift.
- Capability packs with heavy clients, including MapLibre, editors, and advanced charts, must be dynamically imported and excluded from routes that do not select or render them.
- The MapCN Web pack caps its route-only MapLibre main module at `300KB` gzip, shared worker module at `180KB`, worker entry at `20KB`, and route CSS, including MapLibre's required stylesheet, at `20KB`. The locally verified selected build measured about `247KB`, `134KB`, `6KB`, and `11KB` respectively; none loaded on the public home route. The deselected rebuild contained no MapLibre or MapCN asset.
- Production-build Lighthouse for every owned Marketing profile scored 100 for Performance, Accessibility, Best Practices, and SEO in both the desktop and mobile runs used for local acceptance. Those local measurements do not replace field Core Web Vitals after a copied project adds real content, fonts, analytics, and third-party providers.
- Organization and Billing product routes are lazy chunks; the combined selected build measured about `1.4KB` gzip for the Organization page and `0.9KB` gzip for Billing, while the public main route remained about `66KB` gzip. Deselecting both removes their UI, SQL, auth adapters, `@better-auth/stripe`, and Stripe SDK from the assembled application.
- Mobile Web foundation JavaScript: `< 400KB` gzip before product templates and features; every project must replace this provisional ceiling with measured route budgets.
- Docs initial JavaScript: `< 20KB` gzip; Pagefind search and its WASM index load outside the initial document path, with each search artifact capped at `600KB` raw.
- The merged Worker asset artifact keeps Marketing at the root, React application assets under `/_app`, and Docs assets under `/_docs`; budget checks must inspect those exact boundaries and fail when an unselected static route is present.
- Current auth-enabled evidence: Desktop public main route is about `63KB` gzip, Desktop auth/account code is lazy-loaded, Mobile Web is about `386KB` gzip, iOS Hermes bytecode is about `2.96MB`, and Android Hermes bytecode is about `3.27MB`.
- Current fast-start production build: the React dispatcher is `2.4KB` gzip, stable React runtime `59KB`, Login route `3.4KB`, and `/dp` route `7.6KB`. Lighthouse 13.4.1 with pinned Chromium measured Login Desktop 100 with `0.51s` LCP and Login Mobile 98 with `2.03s` LCP. `/dp` Desktop scored 100 with `0.58s` LCP; three throttled Mobile runs had median score 96, `1.69s` FCP, `2.52s` LCP, `7ms` TBT and zero CLS. `/dp` initial transfer fell from about `368KB` to `163KB`; the below-fold `104KB` chart chunk is absent from initial requests.
- Development edge evidence for the same functional artifact is slower and remains the honest network baseline: Login Mobile scored 93 with `2.78s` LCP; `/dp` Mobile scored 91 with `3.08s` LCP and zero CLS; `/dp` Desktop scored 99 with `0.69s` LCP and `0.048` CLS. Local production-build and remote Development measurements stay separate until field Core Web Vitals exist.
- Interactive reads: normally no more than two PostgreSQL round trips; writes normally no more than four.
- Usage consumption is the explicit exception: correctness requires one checked-out Hyperdrive PostgreSQL connection, a bounded transaction, one advisory lock and indexed entitlement/event/bucket operations. Contention is isolated to one user/metric/month key; rejected and replayed calls do not write. A copied high-volume product must measure this path before replacing it with Queue-backed aggregation or another architecture.
- Outgoing webhook HTTP calls never block the product request. The authoritative transaction performs one indexed endpoint lookup, bounded fan-out to at most 20 delivery rows, and one Queue batch write. Consumers process batches of at most 10 with at most 10 concurrent invocations, capture no more than 1KB of response text, time out HTTP after 10 seconds, and terminate after five attempts. Payloads are limited to 64KB encoded JSON; a copied high-volume product must measure fan-out and database pool pressure before raising these bounds.

## Rules

- Measure before optimizing and attach reproducible evidence to changes.
- Optimize perceived startup in this order: static HTML first, small route dispatcher, route-owned code, above-fold data only, viewport-deferred visualization, then measured caching. Do not add speculative preloads for routes the user did not request.
- Never render a materially different embedded data fallback before replacing it with remote project context. Use a stable loading frame or an exact embedded snapshot so asynchronous data cannot move visible content.
- Keep the complete AI-readable `/dp/project.snapshot.json` as canonical generated evidence, but serve the visual `/dp` route from a separately checked compact index that excludes Markdown bodies and unused donor details. The compact projection must be generated and freshness-checked from the same in-memory snapshot.
- `/dp` is the only application document that preloads the compact index. The Worker adds one route-specific `Link` response header so the browser discovers that critical fetch in parallel with React; Login and ordinary product routes receive no `/dp` preload.
- Keep queries SQL-first, bounded, indexed, and observable.
- Avoid speculative caching; document freshness, invalidation, and failure behavior.
- Validate source, preview, and production-equivalent paths where relevant.
- Treat compiler claims as unverified until the current supported TypeScript/Expo toolchain produces measurable optimized artifacts.
- Keep the focused Better Auth Metro resolver regression-tested. Removing it currently adds server-only schema and Zod locale code to all Mobile bundles and exceeds the release budgets.
- Every Catalog pack records its own bundle, query, asset, and runtime constraints before it can move from selected to locally verified.
- `design:contract` compiles every profile in memory and must stay free of network, database, browser, and materialization side effects. Runtime builds contain only the selected generated adapters and no StyleKit or PowerAI donor dependency.
- Playwright, axe-core and Lighthouse are development-only QA dependencies. Browser acceptance runs from the pinned `browser-acceptance` Compose profile and never enters Worker, Marketing, React, Docs or Expo production bundles.

## Change Spec

Performance changes document the baseline, workload, result, regression guard, and rollback path. Keep these budgets current.
