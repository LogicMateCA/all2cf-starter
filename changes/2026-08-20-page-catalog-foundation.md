---
id: 2026-08-20-page-catalog-foundation
title: PowerAI audit and owned Page Catalog foundation
status: local-verified
affectedModules: [assembler, web, auth, docs]
docsImpact: [PROJECT.md, ARCHITECTURE.md, DESIGN.md, features/assembler/MODULE.md, features/docs/MODULE.md, starter.blueprint.json, pages/catalog.json, /setup, /dp]
---

# Decision

Treat PowerAI Astro as a pinned, licensed information-architecture donor and create a Starter-owned Page Catalog. `/setup` selects individual routes; the Project Blueprint records them; `/dp` reports the selection and readiness of every page.

Public product and growth pages are static-first Astro surfaces. Authenticated product routes remain owned React/shadcn pages and retain the existing Better Auth behavior. Public documentation uses Starlight and remains distinct from internal `/dp`.

# Donor boundary

- Pin PowerAI Astro commit `a1176bf882bf0b1af98115f3280c2a6928e69261` and its MIT license.
- Adapt page hierarchy and useful section patterns only.
- Do not import its brand, theme, fonts, demo content, authentication behavior, or unnecessary client-side motion.
- Do not establish automatic source synchronization after the owned Page Packs are implemented.

# Compatibility and data

This change adds configuration contracts and does not change production routes, Worker bindings, database schema, or existing authentication behavior. The Starter database remains an empty-project baseline; Page Catalog selection has no data migration.

# Rollback

Revert this Change Spec, `pages/catalog.json`, its schema, and the Blueprint/setup/dp integrations. Existing React routes and deployed assets are unaffected until a later materialization Change Spec.

# Validation evidence

- Pinned-source audit confirmed PowerAI Astro commit `a1176bf882bf0b1af98115f3280c2a6928e69261`, its MIT license, 16 route templates, and its Astro 6 content/layout structure.
- Page Catalog validation accepted a selected optional Blog route only with `page.optional-growth` selected and rejected removal of required `docs.public`.
- The real local `/setup` API returned 16 page definitions and round-tripped the unchanged Blueprint with GET 200 and PUT 200; 12 default routes remained selected.
- Knowledge synchronization, knowledge checks, Change Spec checks, Web typecheck/build, and Web bundle budgets passed. The setup route remains lazy at 4,640-byte gzip; no new public runtime dependency was added.
- Full `npm run verify` passed: AI/knowledge/change contracts, generated Cloudflare types, all workspace typechecks, Web build and bundle budgets, plus Development and Production Wrangler dry runs. No deployment was performed or authorized.
