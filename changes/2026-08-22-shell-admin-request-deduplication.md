---
id: shell-admin-request-deduplication
title: Remove duplicate Shell and eager Admin data requests
status: implemented
affectedModules: [product-shell, notifications, admin]
docsImpact: [features/product-shell/MODULE.md, features/notifications/MODULE.md, features/admin/MODULE.md, PERFORMANCE.md, /dp]
---

# Outcome

The authenticated Shell shares one notification model across Bell, Recent Activity and the full inbox; account preference hydration no longer writes the same values back immediately; Admin loads only the active module's data.

# Scope

- Add one Shell-scoped Notifications Provider with route-aware limits and a 30-second stale refresh boundary.
- Slice shared data for Bell and Recent Activity instead of issuing separate notification requests.
- Track the last persisted preference tuple and skip the initialization PUT after GET hydration.
- Replace Admin's five-domain eager load with Overview-only startup and active-module loaders. Support still loads its ticket list and bounded Admin assignee list together.
- Keep the notification badge contrast-safe in both selected Editorial modes.

# Verification

- Web/Worker/Mobile/Astro types pass. The complete disposable empty-database Workerd suite passes session, preferences, notification, Admin, support and selected SaaS behavior after the client request-ownership changes.
- Browser network evidence remains pending.

# Release

No release yet. Development and Production remain unchanged.
