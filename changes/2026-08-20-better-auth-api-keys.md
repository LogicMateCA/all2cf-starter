---
id: better-auth-api-keys
title: Add Better Auth API keys as an independent optional pack
status: complete
affectedModules: [assembler, auth, api-keys, admin, docs]
docsImpact:
  [
    PROJECT.md,
    ARCHITECTURE.md,
    features/assembler/MODULE.md,
    features/auth/MODULE.md,
    features/api-keys/MODULE.md,
    features/admin/MODULE.md,
    catalog/catalog.json,
    catalog/saas-capabilities.json,
    starter.blueprint.json,
    /setup,
    /dp,
  ]
---

# Outcome

Copied products may select a receipt-owned Better Auth API Key pack without also claiming that usage metering or outgoing webhooks exist.

# Decisions

- Use the official `@better-auth/api-key` package on the same exact stable line as Better Auth core and every other official plugin.
- Keep keys user-owned by default, hashed in PostgreSQL, unable to create browser sessions, rate-limited, named, optionally expiring, listed without their secret, and revocable by their owner.
- Give the generic Starter one non-escalating `product:read` default permission. Every copied product replaces and tests this vocabulary before release.
- Keep organization-owned keys, usage metering, credits, and signed outgoing webhooks as separate decisions.
- Materialization adds and removes the plugin imports, route, dependencies, SQL, and receipt together. New Starter databases are empty; no legacy key migration exists here.

# Verification

- Confirm the official stable package and current API/schema contract.
- Run selected plan/apply/check, disposable empty-database schema and Workerd lifecycle smoke, Web/Worker typecheck, build, bundle budgets, then deselect/apply/check and prove owned outputs and dependencies are absent.
- Synchronize `/dp` from canonical Markdown and machine-readable Catalogs.

Selected-state evidence: the materializer plan/apply/check gate passed; a disposable empty PostgreSQL database plus real workerd passed create, hash-at-rest, owner list, read-scope allow, write-scope denial, no-session, and revoke checks. Web/Worker types, builds, budgets, and Development/Production Wrangler dry-runs passed. The deselection plan then removed all five receipt-owned generated files, both active dependencies, SQL migration, route and plugin registrations; `starter:materialize:check` reported no drift, and the default empty-database auth/notifications/support/Admin/reset/CFsend regression passed.

# Release

No deployment is authorized. Development acceptance requires the copied product's real permission vocabulary and a verified Development release. Production still requires explicit Production intent.
