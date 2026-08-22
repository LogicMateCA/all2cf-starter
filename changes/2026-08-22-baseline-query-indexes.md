---
id: baseline-query-indexes
title: Index baseline rate-limit and operations queries
status: implemented
affectedModules: [auth, support, admin, notifications, operations]
docsImpact: [ARCHITECTURE.md, PERFORMANCE.md, features/support/MODULE.md, features/notifications/MODULE.md, features/operations/MODULE.md, /dp]
---

# Outcome

Baseline queries that filter by normalized email, support-message author/time, announcement creator/time or global notification time can use matching PostgreSQL indexes as product data grows.

# Scope

- Add a functional lower-email index for verified-user and organization lookup.
- Add partial author/time and creator/time indexes for hourly Support reply and Announcement publish limits.
- Add a global notification created-time index for Admin 24-hour overview counts.
- Keep existing recipient, ticket, status and audit indexes unchanged.

# Verification

- The disposable empty-database Workerd smoke suite applies and exercises the complete migration set successfully.
- Query-plan inspection and the Development database migration remain pending; no remote database schema changed in this release-neutral change.

# Release

Development migration required. Production remains unchanged.
