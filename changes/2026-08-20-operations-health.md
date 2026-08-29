---
id: operations-health
title: Add evidence-backed baseline system health
status: complete
affectedModules: [operations, admin, assembler, docs]
docsImpact: [PROJECT.md, ARCHITECTURE.md, features/operations/MODULE.md, features/admin/MODULE.md, features/assembler/MODULE.md, catalog/saas-capabilities.json, starter.manifest.json, /dp]
---

# Outcome

Every copied Starter has one lightweight Admin health surface that distinguishes Worker liveness, active database reachability, provider configuration readiness, and recent delivery evidence without causing test email or Queue side effects.

# Decisions

- Keep public `/api/health` dependency-free so it remains a Worker liveness check. Put dependency and provider evidence behind Better Auth platform Admin at `/api/admin/health`.
- Actively query PostgreSQL and measure latency. For email, Google, optional Stripe, and optional outgoing-webhook Queue, expose only configuration completeness and bounded database-backed evidence; never return credential values.
- Treat an unselected optional provider as `not-selected`, not broken. Treat missing required configuration and recent terminal delivery failures as `attention`.
- Load the Admin Health module only when opened. Do not send probe emails, create Stripe objects, or enqueue synthetic product events from the dashboard.

# Verification

- The default disposable empty-database workerd flow proves anonymous and ordinary-user denial, Admin-only evidence, active database latency, configured CFsend and Google state, authentication-email delivery counts, and truthful `not-selected` optional providers.
- The isolated Stripe-only flow proves selected configuration and persisted signed-webhook ledger evidence while Queue stays unselected.
- The isolated Outgoing-Webhook-only flow proves the real local Queue binding, delivery ledger, two successful deliveries, and one five-attempt terminal failure surfaced as `attention`.
- After restoring the default Blueprint, the full workerd regression, all workspace types, Marketing/Web/Docs builds, bundle budgets, Development and Production Cloudflare dry-runs, materialization check, and knowledge contracts passed.

# Release

No deployment is authorized. Remote provider reachability and operational alert delivery remain Development acceptance work.
