---
id: platform-announcements
title: Complete the platform announcement notification flow
status: local-verified
affectedModules: [notifications, admin, audit, product-shell]
docsImpact: [PROJECT.md, ARCHITECTURE.md, features/notifications/MODULE.md, features/admin/MODULE.md, starter.manifest.json, catalog/saas-capabilities.json, /dp]
---

# Outcome

Platform announcements are a small executable Admin function, not a partial navigation label. One Admin action persists the announcement, delivers isolated in-app records to every verified non-banned user, and appends exact audit evidence.

# Contract

- Only Better Auth platform Admin may read history or publish.
- Validate title/body bounds and require a same-origin deep link. Limit one Admin to ten announcements per hour.
- Publish the announcement, recipient notifications and audit event in one PostgreSQL transaction. A failed delivery set cannot leave a false announcement or audit record.
- Do not send email or push implicitly. Those remain separate channels.

# Verification

- Disposable empty-database workerd evidence covers ordinary-user denial, external-link rejection, exact eligible-recipient count, per-user notification rows, history and one audit event.
- Authenticated browser acceptance publishes from Admin on desktop/mobile and light/dark modes, then verifies announcement history and screenshots.
- Run default types/build/budgets/dry-runs, knowledge synchronization and change checks.

# Current evidence

- The default disposable empty-PostgreSQL workerd flow proves ordinary-user denial, external deep-link rejection, exact verified/non-banned recipient count, one notification per recipient, announcement history and one matching audit record.
- The default authenticated browser matrix publishes and reads announcements across desktop/mobile and light/dark modes, passing 28 cases and 48 screenshots with zero failures at `test-results/browser-acceptance/2026-08-21T05-22-32-541Z/authenticated`.

# Release

No deployment is authorized. Development and Production remain unchanged.
