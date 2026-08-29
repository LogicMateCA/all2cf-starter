---
id: admin-user-management
title: Complete Better Auth platform user operations
status: local-verified
affectedModules: [admin, auth, product-shell, docs]
docsImpact:
  [
    PROJECT.md,
    ARCHITECTURE.md,
    features/admin/MODULE.md,
    catalog/saas-capabilities.json,
    starter.manifest.json,
    /admin,
    /dp,
  ]
---

# Outcome

Platform Admins can search and inspect users, change the supported platform role, ban or unban an account, review and revoke sessions, and enter or leave a bounded impersonation session without Starter reimplementing Better Auth identity behavior.

# Decisions

- Better Auth Admin 1.7 owns every identity read and mutation. Starter adds only the product operations UI and append-only audit integration.
- The neutral Starter exposes the two configured platform roles, `user` and `admin`. Organization roles remain a separate tenant boundary.
- Self-role changes, self-bans, self-session revocation, and self-impersonation are disabled in the UI; Better Auth independently enforces the authority boundary on the server.
- Admin-to-admin impersonation remains disabled by the Better Auth server policy. Impersonation lasts at most one hour and the shared account menu exposes an explicit return-to-Admin action.
- Hard deletion, forced password changes, forced email changes, and user creation are not default UI actions. They need a product-specific operational and approval policy before exposure.
- Better Auth after hooks append successful role, ban, unban, session-revoke, impersonation, and stop-impersonation events to the existing Starter audit feed. Failed authorization must not create false audit evidence.

# Verification

- Run the disposable empty-database workerd smoke for non-Admin denial, user search, role round trip, ban/unban state, impersonated identity, return to Admin, session listing/revocation, and exact audit actions.
- Run all workspace type checks, Web build, StyleKit boundary, bundle budgets, and Development/Production Wrangler dry-runs.
- Keep browser interaction and accessibility evidence distinct from code/build evidence.
- Synchronize canonical Markdown, Change Specs and `/dp`.

# Release

No deployment is authorized. Development release requires real browser acceptance and a reviewed initial platform-Admin bootstrap path. Production remains separately authorized.
