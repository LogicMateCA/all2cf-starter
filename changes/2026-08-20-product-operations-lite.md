---
id: 2026-08-20-product-operations-lite
title: Better Auth Admin and lightweight support operations
status: local-verified
affectedModules: [auth, admin, support, web]
docsImpact: [PROJECT.md, ARCHITECTURE.md, features/auth/MODULE.md, features/admin/MODULE.md, features/support/MODULE.md, starter.manifest.json, starter.blueprint.json, catalog/catalog.json, /admin, /support, /dp]
---

# Decision

Use Better Auth 1.7.1's official Admin plugin for platform user roles, user lookup, bans, session revocation, and other identity operations. Remove the Starter-specific `platformRole` field so identity authority has one upstream-owned model.

Build only the product-specific remainder: authenticated support and bug intake, a small Admin inbox, bounded status updates, and append-only privileged mutation evidence. Do not add a generic admin framework, helpdesk engine, attachment system, SLA automation, or organization scope to the baseline.

# Empty database baseline

Starter databases are empty at creation. Admin plugin fields and support tables belong directly in the current SQL baseline; this change carries no legacy data backfill, dual-write path, or compatibility migration. Existing products must own a separate migration if they adopt the pack later.

# Security and ownership

- Better Auth Admin roles are platform roles and remain independent of optional Organization plugin membership.
- Support intake requires an authenticated, verified user. Admin reads and mutations require the Better Auth `admin` role.
- Privileged mutations write append-only audit evidence with actor, action, target, and timestamp.
- Destructive identity operations remain Better Auth endpoints and are not duplicated in custom Worker routes.

# Rollback

Before any release, revert the Admin plugin, support routes and UI, SQL baseline additions, and Catalog lifecycle changes together. No remote state is changed by this local implementation.

# Validation evidence

- Better Auth 1.7.1 schema generation ran against a newly created temporary PostgreSQL database and produced complete `CREATE TABLE` output with Admin role, ban, and impersonation fields; the database was force-dropped afterward.
- `npm run auth:smoke:dev` applied every baseline migration to a separate temporary database and passed registration, mandatory verification, CFsend contract delivery, sign-in, preferences, ordinary-user Admin denial, Better Auth Admin user readback, support intake/isolation, ticket resolution, append-only audit evidence, reset, revocation, and sign-out; the database was force-dropped afterward.
- The Web production build keeps `/admin` and `/support` route-lazy at approximately 1.68 KB and 1.81 KB gzip. Worker and Web type checks pass.
- Full `npm run verify` passed: AI/knowledge/change checks, generated Cloudflare type parity, all TypeScript projects, Web and Docs production builds, Web and Docs performance budgets, and Development/Production Worker dry runs. No deployment is authorized or performed.
