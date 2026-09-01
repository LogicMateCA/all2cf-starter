---
module: api-keys
status: local-verified
source: starter
---

# API keys module

Purpose: provide an optional Better Auth-owned machine credential lifecycle without inventing a parallel token system.

- `saas.api-keys` materializes the official `@better-auth/api-key` 1.7.2 server and client plugins, an SQL-first empty-database table, and `/app/api-keys`.
- Better Auth owns random key generation, hashing, indexed verification, user ownership, expiration, per-key database rate limiting, list, and revoke behavior. The plaintext key is returned once at creation and is not recoverable from list or storage.
- API keys cannot create browser sessions. The default permission is `product:read`; a copied product must replace that placeholder with its real resource/action vocabulary and prove allowed and denied routes before Development release.
- Organization-owned keys remain a separate product decision requiring the Organization pack and an explicit ownership/authorization Change Spec.
- This standalone module does not imply usage metering or outgoing webhooks. The separately selected `saas.api-platform` hard-requires and composes all three capabilities into a complete API SaaS boundary.

Selected-state local verification uses a disposable empty PostgreSQL database and real workerd to prove create, non-plaintext storage, owner isolation, list-without-secret, `product:read` acceptance, `product:write` denial, no browser session creation, and revoke invalidation. The full API Platform cycle additionally proves owner-scoped API use, idempotent quota consumption, signed event delivery and post-revoke 401. The selected Web/Worker type, build, bundle-budget, and Wrangler dry-run gates pass. A complete deselect/apply/check cycle removes every receipt-owned file, dependency, route, plugin registration, and SQL migration, after which the default empty-database auth regression still passes. The reviewed SQL strengthens the generated Better Auth proposal with an owner foreign key, unique hash index, and explicit counter defaults. Remote Development and Production remain unchanged.
