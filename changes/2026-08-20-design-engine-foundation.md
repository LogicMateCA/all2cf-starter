---
id: design-engine-foundation
title: Add an owned, profile-based Design Engine
status: local-verified
affectedModules: [assembler, web, mobile, docs]
docsImpact: [PROJECT.md, ARCHITECTURE.md, DESIGN.md, starter.blueprint.json, catalog/catalog.json, design/catalog.json, /setup, /dp]
---

# Outcome

`/setup` chooses a pinned Starter-owned design profile rather than importing a theme or depending on StyleKit at runtime. AI receives the selected profile, cross-platform direction, hard rules, source provenance, and adapter readiness from canonical project context.

# Scope

- Add an internal Design Profile catalog with one existing neutral baseline and three initially defined StyleKit-derived directions.
- Normalize visual direction into semantic light/dark colors, typography, shape, depth, motion, imagery, AI do/don't rules, quality gates, and separate platform-adapter status.
- Pin the audited StyleKit repository and source slugs; retain MIT provenance while removing StyleKit runtime, API, Supabase, Next.js, and registry dependencies.
- Add the profile ID and exact internal version to the Project Blueprint, `/setup`, `/dp`, and AI context.
- Correct the donor repository URLs for StyleKit and PowerAI and pin MapCN's audited revision.

# Verification

- Donor audit pinned StyleKit at `29141b684d5abb967558eb8083fbae91dbbc51b8`, PowerAI Astro at `a1176bf882bf0b1af98115f3280c2a6928e69261`, and MapCN at `d5d287dfdb214c349342f30e407a7c6cf81c4e84`; repository URLs and MIT provenance were verified and corrected.
- Contract validation passed for unique profile IDs, exact selected version, required light/dark semantic modes, target adapter state, donor URL/revision/license, and selected backing Design pack. A mismatched profile version was rejected.
- Local `/setup` GET and same-state PUT returned 200 with the selected `owned-neutral@0.1.0` profile and all four profile records. Web typecheck/build and bundle budgets passed; the setup chunk is 4,270-byte gzip and remains route-lazy.
- Full `npm run verify` passed: AI/knowledge/change checks, both Worker type generations/checks, every TypeScript project, Vite production build, Web bundle budgets, and both Cloudflare dry-runs.
- Visual acceptance and platform adapter materialization remain separate work for each selected profile; `defined` profiles must not be reported as implemented.

# Release

Starting and rollback commit: `f280241`. No deployment is authorized by this change.
