---
id: product-type-generated-shapes
title: Generate distinct Web SaaS, website/content, and Mobile App products
status: local-verified
affectedModules: [assembler, marketing, docs, mobile]
docsImpact: [PROJECT.md, ARCHITECTURE.md, features/assembler/MODULE.md]
---

# Outcome

Factory first selects the primary product architecture rather than several SaaS recipes. Web SaaS keeps the authenticated Web product and Worker API. Website/content products select a product, company, landing, blog, Docs, portfolio, directory or custom content structure and omit the application Worker, PostgreSQL runtime and mobile source. Mobile App products make Expo iOS/Android primary, keep a Worker API and independently select no companion website, a landing site, a full public site and an optional Web Admin.

# Scope

- Add product-shape fields to the Blueprint and immutable Factory configuration.
- Materialize selections first, then prune unshipped runtime surfaces and source-only scripts without removing local Setup ownership.
- Record `.starter/product-shape.json` so AI and release tooling know which outputs are deployable.
- Apply required-page invariants by product type: full account/Admin/Support requirements for Web SaaS, public legal/system requirements for websites and only selected companion-site requirements for Mobile App.
- Keep D1 out of scope; dynamic Web SaaS and Mobile API products remain PostgreSQL SQL-first/Drizzle.

# Verification

- Generate clean Web SaaS, Blog website and mobile-only baselines.
- Shape fixtures reset optional Pack, Page and storage selections so absence checks prove the selected product rather than pruning a pre-materialized unrelated SaaS configuration.
- Prove expected output presence/absence, independent dependency installation, type checks and selected builds.
- Run mobile bundle budgets only after the explicit Expo export gate; ordinary generated verification cannot assume export artifacts already exist.
- Verify All2CF persistence, fixed-dialog decisions, Runner generation, source download and mobile reflow.

# Release

Local shape contracts passed for Web SaaS, Blog website and mobile-only output. Independent Blog and mobile-only products passed their own clean dependency installation, workspace type checks and selected builds; mobile additionally passed Expo all-platform export and Worker dry-run. Development, Production and Starter Engine publication remain pending.
