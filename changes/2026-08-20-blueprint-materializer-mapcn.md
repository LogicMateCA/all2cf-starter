---
id: 2026-08-20-blueprint-materializer-mapcn
title: Receipt-backed Blueprint materializer and MapCN Web pack
status: local-verified
affectedModules: [assembler, web]
docsImpact: [PROJECT.md, ARCHITECTURE.md, PERFORMANCE.md, features/assembler/MODULE.md, starter.manifest.json, catalog/catalog.json, starter.blueprint.json, /setup, /dp]
---

# Decision

Add a deterministic plan/apply/check materialization boundary rather than asking AI to copy optional code ad hoc. Each materializable pack declares exact source templates, targets, dependency versions, and lazy routes. `.starter/materialization.json` records file hashes and dependency ownership so deselection removes only unchanged generated assets and fails closed around project edits.

MapCN Web is the first pack to exercise the boundary. MapCN commit `d5d287dfdb214c349342f30e407a7c6cf81c4e84` is a pinned MIT-licensed design and composition donor. Starter owns a smaller adapted component; MapCN is not a runtime service. MapLibre GL `6.4.1` is the only map runtime and enters `apps/web` only when the pack is selected.

Pack routes must declare whether Cloudflare Static Assets should run the Worker first. The materializer accepts only safe exact application paths, generates the client route registry and Worker shell registry together, and adds or removes pack-owned `assets.run_worker_first` entries in both Wrangler environments without rewriting unrelated configuration. `/setup` preserves `materialized: true` during a deselection request so `/dp` can show pending removal accurately; successful apply clears it.

# Provider and performance boundary

Do not make CARTO or any other hosted basemap an implicit commercial dependency. The generated route uses a tile-free style for verification and requires `VITE_MAP_STYLE_URL` for a real basemap. Each product must review its map provider's attribution, license, privacy, cost, and availability.

The map route is dynamically imported. Its budgets are 300 KB gzip for the MapLibre main module, 180 KB for its shared worker module, 20 KB for the worker entry, and 20 KB for route CSS. The unselected build must contain no MapLibre or MapCN asset.

# Safety and rollback

`npm run starter:materialize` is read-only. Apply validates all target and dependency collisions before writing, updates only receipt-owned paths, runs package installation, refreshes `/dp`, and restores source files, package manifests, package lock, Blueprint, route registry, and receipt if an apply step fails. Deselecting a pack refuses to remove a changed generated file or independently changed dependency.

Rollback is pack deselection followed by a reviewed plan and `npm run starter:materialize:apply`. It does not mutate databases or Cloudflare.

# Validation evidence

- With MapCN selected, apply added exactly three owned component files, one exact dependency, one lazy client route, one exact Worker application route, and `/map` to both Development and Production `assets.run_worker_first` lists. Immediate drift check passed.
- Local Wrangler served the production build through the real Worker seam. `/map` returned 200 while selected. Desktop light and Mobile dark Playwright runs proved WebGL, one MapLibre canvas, route-only loading, reduced motion, zero horizontal overflow, a visible 3px keyboard outline on the Calgary marker, Enter-triggered popup behavior, zero axe violations, and zero console/page errors.
- The selected build measured about 247 KB gzip for the MapLibre main module, 134 KB for its shared worker module, 6 KB for the worker entry, 11 KB for route CSS, and 65 KB for the unchanged public main application route.
- After deselection, apply removed the same three receipt-owned files, dependency, client route, Worker route, and both Wrangler entries. A clean rebuild contained no MapLibre or MapCN assets, the Worker returned 404 for `/map`, and the core Web budget passed.
- A real map style/provider and Development publication remain copied-product release gates. The tile-free verification style deliberately proves the local rendering and integration contract without selecting a commercial map provider. No deployment was authorized or performed.
