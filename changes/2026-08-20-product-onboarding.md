---
id: product-onboarding
title: Add resumable product-owned first-login onboarding
status: complete
affectedModules: [assembler, product-shell, onboarding, admin, docs]
docsImpact: [PROJECT.md, ARCHITECTURE.md, features/assembler/MODULE.md, features/product-shell/MODULE.md, features/onboarding/MODULE.md, features/admin/MODULE.md, catalog/catalog.json, catalog/saas-capabilities.json, starter.blueprint.json, /setup, /dp]
---

# Outcome

Copied products may select an ordered, resumable first-login flow and replace one neutral Starter step with their real first-success journey without rebuilding session ownership or progress persistence.

# Decisions

- Keep onboarding optional and product-owned. Do not force a fake workspace, organization, billing, or product-object step into every Starter.
- Make the Worker definition authoritative and accept completion only for the current next step. Store user-scoped versioned progress in PostgreSQL and preserve only still-valid step IDs when a definition changes.
- Let Product Shell redirect incomplete authenticated application visits while preserving the requested return path. Do not gate Admin, public pages, settings, support, or authentication callbacks.
- Give platform Admin aggregate read-only adoption counts, not cross-user mutation.

# Verification

- Selected materialization passed empty-database workerd anonymous denial, initial next step, order validation, idempotent completion, persisted resume, session ownership, and Admin aggregate readback.
- The selected full gate passed generated-route checks, Web and Worker types, all builds, bundle budgets, and Development and Production Cloudflare dry-runs.
- Deselect planning named only receipt-owned removals; apply removed them and the default empty-database workerd authentication, notification, support, Admin, password-reset, and CFSEND regression passed.
- Canonical Markdown and `/dp` were synchronized after the default-state regression.

# Release

No deployment is authorized. Development acceptance requires the copied product's real onboarding definition and browser completion/redirect evidence.
