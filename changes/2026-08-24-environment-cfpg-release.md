---
id: environment-cfpg-release
title: Model CFPG as an environment-specific PostgreSQL transport
status: implemented
affectedModules: [assembler, database, release]
docsImpact: [PROJECT.md, ARCHITECTURE.md, cloudflare/bindings.contract.json, features/assembler/MODULE.md, /dp]
---

# Outcome

Add environment-specific PostgreSQL transports to the Blueprint. Development and Production may independently select `native-postgresql` or `cfpg`; SQL-first/Drizzle, migrations and application queries remain the same. The legacy global provider remains the fallback for older generated projects.

Materialization installs `@all2cf/database-connect` when either environment selects CFPG, applies the `pg` alias and `ALL2CF_DATABASE` Service Binding only to that environment, and preserves Hyperdrive in the other environment.

Factory/Setup may persist an intentionally deferred CFPG selection without a command. Saving the draft remains possible, but materialization and release fail closed until the selected environment has a validated descriptor.

# Verification

Assembly and provider contracts must cover native/native, CFPG/native and distinct CFPG/CFPG combinations. Portable SQL-first and Drizzle products, deterministic materialization and both Wrangler dry-runs must pass before an Engine candidate exists.

# Migration

This is an additive Blueprint field. Existing projects without `transports` continue to use the legacy global `provider`. No customer data migration or backfill exists.

# Rollback

Roll back the Engine candidate and Development Channel. Generated projects remain pinned to their existing receipts; Production is unchanged.

# Release

Not released. The temporary CFPG migration Worker and All2CF Development orchestration remain separate gates.
