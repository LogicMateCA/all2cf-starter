---
id: 2026-08-20-blueprint-materializer-mapcn
title: Receipt-backed Blueprint materializer and MapCN Web pack
status: implemented
affectedModules: [assembler, web]
docsImpact: [PROJECT.md, ARCHITECTURE.md, PERFORMANCE.md, features/assembler/MODULE.md, starter.manifest.json, catalog/catalog.json, starter.blueprint.json, /setup, /dp]
---

# Decision

Add a deterministic plan/apply/check materialization boundary rather than asking AI to copy optional code ad hoc. Each materializable pack declares exact source templates, targets, dependency versions, and lazy routes. `.starter/materialization.json` records file hashes and dependency ownership so deselection removes only unchanged generated assets and fails closed around project edits.

MapCN Web is the first pack to exercise the boundary. MapCN commit `d5d287dfdb214c349342f30e407a7c6cf81c4e84` is a pinned MIT-licensed design and composition donor. Starter owns a smaller adapted component; MapCN is not a runtime service. MapLibre GL `6.4.1` is the only map runtime and enters `apps/web` only when the pack is selected.

# Provider and performance boundary

Do not make CARTO or any other hosted basemap an implicit commercial dependency. The generated route uses a tile-free style for verification and requires `VITE_MAP_STYLE_URL` for a real basemap. Each product must review its map provider's attribution, license, privacy, cost, and availability.

The map route is dynamically imported. Its budget is 300 KB gzip for MapLibre JavaScript and 20 KB gzip for route CSS. The unselected build must contain no MapLibre or MapCN asset.

# Safety and rollback

`npm run starter:materialize` is read-only. Apply validates all target and dependency collisions before writing, updates only receipt-owned paths, runs package installation, refreshes `/dp`, and restores source files, package manifests, package lock, Blueprint, route registry, and receipt if an apply step fails. Deselecting a pack refuses to remove a changed generated file or independently changed dependency.

Rollback is pack deselection followed by a reviewed plan and `npm run starter:materialize:apply`. It does not mutate databases or Cloudflare.

# Validation evidence

- With MapCN selected, the plan contained exactly three files, one exact dependency, one lazy route registry change, and one lifecycle change. Apply and immediate drift check passed.
- The materialized Web project passed TypeScript and Vite production build. The MapLibre route chunk measured about 247 KB gzip and its CSS about 11 KB gzip; the public main chunk remained about 65 KB gzip.
- After deselection, the plan removed the same three receipt-owned files, dependency, route, and lifecycle state. Apply and drift check passed; a clean rebuild contained no MapLibre or MapCN asset and passed the core Web budget.
- Full `npm run verify` passed with materialization drift checking, AI/knowledge/change contracts, all TypeScript projects, Web and Docs builds and budgets, and both Cloudflare Worker dry runs.
- Browser WebGL rendering, a real map style/provider, keyboard interaction, and Development publication remain unverified. No deployment was authorized or performed.
