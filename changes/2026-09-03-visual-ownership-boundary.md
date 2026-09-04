---
id: visual-ownership-boundary
title: Remove the Starter-owned visual data layer
status: implemented
affectedModules: [assembler, marketing, admin, product-shell, docs]
docsImpact: [DESIGN.md, ARCHITECTURE.md, features/assembler/MODULE.md]
---

# Outcome

Starter no longer owns or selects StyleKit snapshots, Design Profiles or visual Packs. Visual Design is the sole visual owner; Starter emits only structural, responsive and accessible compatibility tokens.

# Scope

- Remove the visual catalog, StyleKit source/snapshots/previews, Design Packs, schemas and compiler scripts.
- Remove visual selection fields from the Blueprint, Setup, Factory, Development Plan, AI context and release metadata.
- Keep generated structural compatibility tokens so existing Web, Marketing, Docs and Mobile code remains operable before Visual materialization.
- Keep `.visual/profile.json` and `.visual/receipt.json` as project-owned integration state.

# Verification

- `npm run design:contract`
- `npm run visual:integration:contract`
- `npm run starter:materialize:check`
- `npm run factory:contract`
- Web, Marketing and Docs production builds
- Web, Mobile and Worker TypeScript checks

# Release

Canonical Starter source change. A new Engine candidate is required before publication.
