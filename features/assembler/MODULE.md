---
module: assembler
status: local-verified
source: starter
---

# Project assembler module

Purpose: turn a product brief and explicit `/setup` selections into a small, owned, verifiable project instead of copying every possible feature into every new repository.

- `/setup` is the local configuration workspace. It collects identity, platforms, design profile, page packs, SaaS modules, capability packs, providers, and environment choices. Deployed Development and Production Workers reject `/setup` and its local API.
- The Pages step reads `pages/catalog.json` and selects routes individually. Required auth, legal, docs, home, and 404 surfaces cannot be removed; selecting an optional growth route selects its backing pack, while removing the last route removes that pack.
- Saving a project plan writes the Blueprint and `starter.config.json`, then reuses the transactional identity synchronizer and regenerates `/dp`. A first copied-project identity change must replace canonical Starter resource names.
- `starter.blueprint.json` is the canonical selection and realization record. It distinguishes selected, materialized, locally verified, Development verified, and Production released states.
- `catalog/catalog.json` is the AI-readable internal catalog. Every pack declares targets, ownership, provenance, update policy, requirements, conflicts, performance constraints, verification, and documentation impact.
- `design/catalog.json` is the owned profile layer beneath the Design pack. `/setup` selects one exact profile/version and automatically keeps its backing Design pack consistent; AI consumes the same semantic direction and adapter readiness through project context.
- Catalog presets provide opinionated starting points for Basic Product, Team SaaS, API Platform, and Custom projects. Selecting a preset never prevents later explicit pack changes; a manual deviation becomes `custom`.
- Materialization is additive and deterministic. `npm run starter:materialize` produces a read-only plan, `starter:materialize:apply` applies selected pack manifests, and `starter:materialize:check` fails on drift. Pack files, dependencies, lazy routes, and lifecycle state share one receipt under `.starter/materialization.json`.
- Removal is ownership-safe: a deselected pack removes only files and exact dependency versions recorded in its receipt. If generated code or a managed dependency changed afterward, removal fails instead of deleting project work. Package installation and source writes roll back on a failed apply.
- Unselected pages, database tables, bindings, secrets, routes, and runtime dependencies are not generated or hidden behind runtime feature flags. Optional pack templates remain in `packs/` as assembler inputs and do not enter the Worker asset graph.
- AI may recommend and prefill selections, but it must show conflicts and consequences before changing the Blueprint. The controller owns integration and release.
- `/dp` is a read-only projection of the Blueprint, Catalog, Markdown contracts, code status, and release evidence. It never edits the Blueprint.

StyleKit, PowerAI, and MapCN are donor inputs to owned packs, not permanent upstream runtime services. OpenSaaS, LastSaaS, Open Design, and RunCopilot remain reference sources. Better Auth core and every selected official plugin, including Organization, API Key, Expo, and Stripe, are the tracked stable-compatible upstream family.

The file/dependency/route materializer is locally verified through a complete MapCN select, plan, apply, build, check, deselect, safe removal, rebuild, and bundle-absence cycle. `/setup` still saves intent rather than running commands itself; AI must show the plan and invoke apply. Full assembler completion still requires selected public Page Pack materialization and a Development release without relying on chat history.
