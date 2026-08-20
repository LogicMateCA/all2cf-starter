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
- Desktop Chart code must be lazy-loaded outside the main route bundle.
- Capability packs with heavy clients, including MapLibre, editors, and advanced charts, must be dynamically imported and excluded from routes that do not select or render them.
- The MapCN Web pack caps its route-only MapLibre JavaScript at `300KB` gzip and route CSS, including MapLibre's required stylesheet, at `20KB` gzip. The verified selected build measured about `247KB` and `11KB`; the deselected rebuild contained no MapLibre or MapCN asset.
- Organization and Billing product routes are lazy chunks; the combined selected build measured about `1.4KB` gzip for the Organization page and `0.9KB` gzip for Billing, while the public main route remained about `66KB` gzip. Deselecting both removes their UI, SQL, auth adapters, `@better-auth/stripe`, and Stripe SDK from the assembled application.
- Mobile Web foundation JavaScript: `< 400KB` gzip before product templates and features; every project must replace this provisional ceiling with measured route budgets.
- Docs initial JavaScript: `< 20KB` gzip; Pagefind search and its WASM index load outside the initial document path, with each search artifact capped at `600KB` raw.
- Current auth-enabled evidence: Desktop public main route is about `63KB` gzip, Desktop auth/account code is lazy-loaded, Mobile Web is about `386KB` gzip, iOS Hermes bytecode is about `2.96MB`, and Android Hermes bytecode is about `3.27MB`.
- Interactive reads: normally no more than two PostgreSQL round trips; writes normally no more than four.

## Rules

- Measure before optimizing and attach reproducible evidence to changes.
- Keep queries SQL-first, bounded, indexed, and observable.
- Avoid speculative caching; document freshness, invalidation, and failure behavior.
- Validate source, preview, and production-equivalent paths where relevant.
- Treat compiler claims as unverified until the current supported TypeScript/Expo toolchain produces measurable optimized artifacts.
- Keep the focused Better Auth Metro resolver regression-tested. Removing it currently adds server-only schema and Zod locale code to all Mobile bundles and exceeds the release budgets.
- Every Catalog pack records its own bundle, query, asset, and runtime constraints before it can move from selected to locally verified.

## Change Spec

Performance changes document the baseline, workload, result, regression guard, and rollback path. Keep these budgets current.
