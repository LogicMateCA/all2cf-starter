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
- Default Astro Marketing routes require `0KB` initial JavaScript; an individual Page Pack may add a route-specific island only with a measured reason and a `< 20KB` gzip route budget before project-specific changes.
- Desktop Chart code must be lazy-loaded outside the main route bundle.
- Capability packs with heavy clients, including MapLibre, editors, and advanced charts, must be dynamically imported and excluded from routes that do not select or render them.
- The MapCN Web pack caps its route-only MapLibre main module at `300KB` gzip, shared worker module at `180KB`, worker entry at `20KB`, and route CSS, including MapLibre's required stylesheet, at `20KB`. The locally verified selected build measured about `247KB`, `134KB`, `6KB`, and `11KB` respectively; none loaded on the public home route. The deselected rebuild contained no MapLibre or MapCN asset.
- Production-build Lighthouse for every owned Marketing profile scored 100 for Performance, Accessibility, Best Practices, and SEO in both the desktop and mobile runs used for local acceptance. Those local measurements do not replace field Core Web Vitals after a copied project adds real content, fonts, analytics, and third-party providers.
- Organization and Billing product routes are lazy chunks; the combined selected build measured about `1.4KB` gzip for the Organization page and `0.9KB` gzip for Billing, while the public main route remained about `66KB` gzip. Deselecting both removes their UI, SQL, auth adapters, `@better-auth/stripe`, and Stripe SDK from the assembled application.
- Mobile Web foundation JavaScript: `< 400KB` gzip before product templates and features; every project must replace this provisional ceiling with measured route budgets.
- Docs initial JavaScript: `< 20KB` gzip; Pagefind search and its WASM index load outside the initial document path, with each search artifact capped at `600KB` raw.
- The merged Worker asset artifact keeps Marketing at the root, React application assets under `/_app`, and Docs assets under `/_docs`; budget checks must inspect those exact boundaries and fail when an unselected static route is present.
- Current auth-enabled evidence: Desktop public main route is about `63KB` gzip, Desktop auth/account code is lazy-loaded, Mobile Web is about `386KB` gzip, iOS Hermes bytecode is about `2.96MB`, and Android Hermes bytecode is about `3.27MB`.
- Interactive reads: normally no more than two PostgreSQL round trips; writes normally no more than four.
- Usage consumption is the explicit exception: correctness requires one checked-out Hyperdrive PostgreSQL connection, a bounded transaction, one advisory lock and indexed entitlement/event/bucket operations. Contention is isolated to one user/metric/month key; rejected and replayed calls do not write. A copied high-volume product must measure this path before replacing it with Queue-backed aggregation or another architecture.
- Outgoing webhook HTTP calls never block the product request. The authoritative transaction performs one indexed endpoint lookup, bounded fan-out to at most 20 delivery rows, and one Queue batch write. Consumers process batches of at most 10 with at most 10 concurrent invocations, capture no more than 1KB of response text, time out HTTP after 10 seconds, and terminate after five attempts. Payloads are limited to 64KB encoded JSON; a copied high-volume product must measure fan-out and database pool pressure before raising these bounds.

## Rules

- Measure before optimizing and attach reproducible evidence to changes.
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
