---
id: platform-admin-foundation
title: Make the first account the protected platform administrator
status: implemented
affectedModules: [auth, admin, entitlements]
docsImpact: [features/admin/MODULE.md]
---

# Outcome

The first account in an empty product database becomes the platform
administrator for every registration path. Existing databases with users but
no administrator promote the oldest account during migration. PostgreSQL
advisory locking serializes first-account assignment, and a database trigger
prevents removal or deletion of the final administrator.

`/admin` continues to use Better Auth's single `admin` role model to add or
remove additional administrators. Platform administrators resolve every
defined product entitlement as enabled and unlimited without requiring a
product subscription. This product-local bypass does not grant an All2CF cloud
maintenance subscription.

# Verification

- The platform Admin contract verifies the migration guards, Better Auth role
  control, unlimited administrator resolution, and unchanged customer plan
  resolution.
- Disposable PostgreSQL verification inserts concurrent/ordered accounts,
  confirms the first account is Admin, confirms later accounts are users, and
  rejects removal of the final Admin.
- Full authentication smoke and generated-project contracts remain required
  before release.

