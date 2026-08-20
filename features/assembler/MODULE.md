---
module: assembler
status: defined
source: starter
---

# Project assembler module

Purpose: turn a product brief and explicit `/setup` selections into a small, owned, verifiable project instead of copying every possible feature into every new repository.

- `/setup` is the local configuration workspace. It collects identity, platforms, design profile, page packs, SaaS modules, capability packs, providers, and environment choices. Deployed Development and Production Workers reject `/setup` and its local API.
- Saving a project plan writes the Blueprint and `starter.config.json`, then reuses the transactional identity synchronizer and regenerates `/dp`. A first copied-project identity change must replace canonical Starter resource names.
- `starter.blueprint.json` is the canonical selection and realization record. It distinguishes selected, materialized, locally verified, Development verified, and Production released states.
- `catalog/catalog.json` is the AI-readable internal catalog. Every pack declares targets, ownership, provenance, update policy, requirements, conflicts, performance constraints, verification, and documentation impact.
- `design/catalog.json` is the owned profile layer beneath the Design pack. `/setup` selects one exact profile/version and automatically keeps its backing Design pack consistent; AI consumes the same semantic direction and adapter readiness through project context.
- Catalog presets provide opinionated starting points for Basic Product, Team SaaS, API Platform, and Custom projects. Selecting a preset never prevents later explicit pack changes; a manual deviation becomes `custom`.
- Materialization is additive and deterministic. Unselected pages, database tables, bindings, secrets, routes, and dependencies are not generated or hidden behind runtime feature flags.
- AI may recommend and prefill selections, but it must show conflicts and consequences before changing the Blueprint. The controller owns integration and release.
- `/dp` is a read-only projection of the Blueprint, Catalog, Markdown contracts, code status, and release evidence. It never edits the Blueprint.

StyleKit, PowerAI, and MapCN are donor inputs to owned packs, not permanent upstream runtime services. OpenSaaS, LastSaaS, Open Design, and RunCopilot remain reference sources. Better Auth core and every selected official plugin, including Organization, API Key, Expo, and Stripe, are the tracked stable-compatible upstream family.

The assembler is not complete until `/setup` can validate the Blueprint, materialize a selected project idempotently, explain drift, and pass local and Development verification without requiring chat history.
