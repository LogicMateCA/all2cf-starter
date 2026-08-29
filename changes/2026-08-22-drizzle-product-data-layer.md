---
id: drizzle-product-data-layer
title: Add one optional Drizzle product data layer over the pg contract
status: implementing
affectedModules: [assembler]
docsImpact: [PROJECT.md, ARCHITECTURE.md, PERFORMANCE.md, features/assembler/MODULE.md, /dp]
---

# Outcome

Generated products choose exactly one application data layer: SQL-first or Drizzle. PostgreSQL, Pack-owned SQL migrations and the `pg` runtime contract remain identical. Hyperdrive and CFPG only change how `pg` connects.

# Scope

- Add `capability.data-layer-drizzle` with Drizzle ORM, Drizzle Kit configuration, an empty product-domain schema and a database factory that reuses `createDatabasePool`.
- Keep Starter/Better Auth/Pack tables and migrations SQL-first.
- Make Blueprint `providers.database.access` the two-value product-code choice and require it to match Pack selection.
- Do not add Prisma, Kysely, a CFPG query layer or a second migration tree for platform tables.

# Verification

- Select/apply installs exact stable Drizzle dependencies, focused TypeScript passes, Drizzle Kit generates SQL offline from a temporary product table, and deselection removes all files and dependencies. Complete repository verification and both Cloudflare dry-runs pass. Native PG/CFPG live runtime parity remains pending.

# Release

No release authorized.
