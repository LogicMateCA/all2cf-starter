---
id: auth-foundation
title: A2C-derived Better Auth login foundation
status: development-released
affectedModules: [auth, admin, mobile, docs]
docsImpact: [features/auth/MODULE.md, DESIGN.md, ARCHITECTURE.md, RELEASE.md, /dp]
---

# Outcome

Starter users can register, sign in with email/password or configured Google OAuth, restore a secure session, enter protected Desktop routes, and sign out through the A2C-derived multi-step login flow without inheriting A2C product-specific coupling.

# Scope

- Better Auth 1.6.29 with built-in PostgreSQL/Kysely over per-request Hyperdrive connections; no Drizzle ORM.
- Neutral auth tables and reviewed SQL-first migrations.
- Host-only secure cookies, trusted origins, Cloudflare client IP, database-backed rate limiting, safe same-origin return paths, and production email-enumeration protection.
- Desktop login state machine, route/session guard, account entry, theme/language persistence, and logout.
- Expo client and A2C-derived sign-in/reset UI using the official Better Auth Expo plugin, SecureStore, and environment-specific deep links.
- Provider-backed authentication outbox. The follow-up `auth-email-providers` Change Spec replaces the original Development outbox-only behavior with mandatory verification and CFsend-default delivery.
- Signed-in System/Light/Dark and English/简体中文 preferences stored on the user profile; signed-out preferences remain local.
- Database-authoritative sessions with Cookie cache disabled so reset, sign out, and revocation are immediate.

# Verification

- Review generated SQL before applying it to Development PostgreSQL.
- Verify registration, invalid/valid password login, session restoration, protected route denial, logout, password reset token lifecycle, and Cookie attributes.
- Verify Google capability and callback configuration without claiming OAuth success until a real browser callback completes.
- Verify Worker typecheck/dry-run, Development database identity, bundle budgets, and Development deployment.

Local workerd evidence passed registration validation, generic duplicate registration, known/unknown email routing, credential login, protected session, persisted preferences, reset request and callback token, reset-time session revocation, replacement-password login, sign out, and Development outbox writes. The smoke suite removes its exact test user and email rows.

Bundle evidence passes the existing budgets: Desktop public main about 63KB gzip; Mobile Web about 386KB gzip; iOS about 2.96MB raw Hermes; Android about 3.27MB raw Hermes. The Metro focused cookie-utils resolver is a required upgrade regression test.

# Release

The original Development auth foundation was released at `app-dev.example.com`, but its outbox-only email policy is superseded and must not be promoted. The `auth-email-providers` Change Spec owns the mandatory-verification correction. Production database and Production Worker remain unchanged.
