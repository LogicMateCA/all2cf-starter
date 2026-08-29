---
id: provider-capability-catalog
title: Account for every common Provider and Capability
status: local-verified
affectedModules: [assembler, docs]
docsImpact: [PROJECT.md, ARCHITECTURE.md, features/assembler/MODULE.md, starter.manifest.json, catalog/providers.json, /setup, /dp]
---

# Outcome

The Starter and every future AI can distinguish the complete Provider/Capability surface from the smaller set that is currently executable, selected, configured, tested, materialized and released.

# Scope

- Add a schema-validated Provider Catalog covering Database, Auth, Social, Email, Billing, Object Storage, Anti-abuse, Observability, Analytics, AI, Search/Vector, Maps, Notification channels, Media, Background/Realtime, Cache/Feature Flags and Release platforms.
- Require `None` for every optional category and forbid `None` in required categories.
- Keep Planned options visible but non-selectable until their dependency, Binding, configuration, verification, materialization and removal contracts exist.
- Record credentials, Bindings, dependencies, setup links, verification mode, delivery type, defaults and capability ownership per option without storing secret values.
- Render the same catalog in local Setup and `/dp`; AI reads the same machine source.

# Verification

- Validate schema, category coverage, unique IDs/defaults, optional `None`, required-category rules, executable anchors, and the ban on selectable Planned options.
- Run Setup and Development Plan type/build checks, knowledge synchronization and Change Spec contracts.

# Release

Local catalog foundation only. Planned options are not runtime claims, and no Cloudflare or Production mutation is authorized.
