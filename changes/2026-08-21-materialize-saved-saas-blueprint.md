---
id: materialize-saved-saas-blueprint
title: Materialize the saved SaaS and Growth project plan
status: local-verified
affectedModules: [assembler, marketing, organizations, billing, entitlements, usage, webhooks, onboarding, docs]
docsImpact: [starter.blueprint.json, .starter/materialization.json, /dp]
---

# Outcome

The owner's saved Glassmorphism SaaS plan is no longer selection-only: Growth pages, Organizations, Stripe Billing, Entitlements, Usage, Outgoing Webhooks and Product Onboarding are receipt-owned application code with their selected empty-database schema.

# Scope

- Materialize the exact saved Blueprint while retaining native PostgreSQL/Hyperdrive as the current database Provider and Google as the current social sign-in selection.
- Generate 17 static Marketing routes, six selected SaaS migrations, lazy Product routes, Better Auth Organization/Stripe registries, Worker feature/event registries, Queue configuration, required secrets, exact dependencies and all selected StyleKit adapters.
- Apply only the six new optional migrations to the Development `starterdev` database. Production schema and both deployed Workers remain unchanged.
- Keep CFPG configuration available but unselected until a distinct Production command is supplied.

# Verification

- `starter:materialize:check` returns no drift and Development migration status returns no pending migration.
- The selected disposable-database workerd smoke passes Organizations, signed Stripe webhook/replay, Entitlements, concurrent Usage quota/idempotency, Onboarding, Outgoing Webhook retry/HMAC/terminal handling, Operations Health, Admin, authentication email and password/session flows.
- Full repository `verify` passes dependency, design, typography, page, SaaS, StyleKit, knowledge, types, builds, bundle budgets, and Development/Production Worker dry-runs.
- Focused public browser acceptance passes Docs, `/dp`, Blog, Case Studies, Integrations and Careers across desktop/mobile and light/dark: 24 cases, 26 screenshots, zero accessibility, console, subresource or overflow failures.
- Local Setup browser acceptance passes four desktop/mobile light/dark cases with eight screenshots and zero failures.

# Release

Local verification only. No Worker was deployed and no Production database migration was applied.
