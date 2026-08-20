---
id: empty-database-blueprint-policy
title: Make the empty-database Starter boundary machine-readable
status: local-verified
affectedModules: [assembler, web]
docsImpact: [PROJECT.md, features/assembler/MODULE.md, starter.blueprint.json, .ai/manifest.json, catalog/catalog.json, /setup, /dp]
---

# Outcome

AI and `/setup` no longer infer database behavior from the ambiguous string `postgresql-sql-first`. The Project Blueprint now declares a structured, machine-checked policy: PostgreSQL, SQL-first access, an empty initial database, schema composed from the final selected packs, and existing data explicitly out of scope.

# Scope

- Replace the Blueprint database provider string with a fixed structured policy.
- Enforce every policy field in the schema and executable assembly validator.
- Expose the same facts in `/setup`, its review step, `/dp`, the Catalog policy, and the AI manifest.
- Preserve the existing selected SQL baseline and all database contents. This change does not provision, connect, migrate, backfill, or delete any database.

# Verification

- Assembly validation rejects a Blueprint that changes any empty-database policy field.
- A real localhost `/__starter/setup` round trip returned `200` for the current payload, rejected `initialState: existing` with `400`, and left both `starter.blueprint.json` and `starter.config.json` byte-for-byte unchanged.
- `/setup`, Web, Worker, Mobile, Marketing, and Docs type/build checks pass with the structured policy.
- Materialization drift, knowledge synchronization, bundle budgets, and both Cloudflare dry-runs pass without a live database connection.

# Release

Local verification only. No Development or Production deployment is authorized by this change.
