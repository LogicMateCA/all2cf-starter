---
id: entitlements-foundation
title: Add server-authoritative plan entitlements
status: complete
affectedModules: [assembler, billing, entitlements, admin, docs]
docsImpact:
  [
    PROJECT.md,
    ARCHITECTURE.md,
    features/assembler/MODULE.md,
    features/billing/MODULE.md,
    features/entitlements/MODULE.md,
    features/admin/MODULE.md,
    catalog/catalog.json,
    catalog/saas-capabilities.json,
    starter.blueprint.json,
    /setup,
    /dp,
  ]
---

# Outcome

Copied Stripe subscription products may select a receipt-owned entitlement resolver without adopting usage metering, credits, organization billing, or client-authoritative access logic.

# Decisions

- Keep Better Auth Stripe as the only subscription lifecycle and webhook owner.
- Require `saas.billing-stripe` at materialization time and fail before mutation when the dependency is missing.
- Resolve only current active/trialing user subscriptions, fall back to Free, and keep organization ownership as a separate explicit decision.
- Store plan definitions and feature grants in reviewed SQL. The generic feature vocabulary is a placeholder that every copied product replaces before Development release.
- Extend the assembler with a generated Worker-feature registry so optional backend modules install and remove without editing the monolithic Worker per pack.
- Keep usage events, aggregation, quota consumption, and credits in a later independent `saas.usage` pack.

# Verification

- Prove missing-pack dependency denial, selected plan/apply/check, disposable empty-database Workerd access resolution, Web/Worker types, builds, budgets, and both Wrangler dry-runs.
- Deselect and remove every receipt-owned file, route, Worker feature, SQL migration, and Stripe dependency; then run the default empty-database regression.
- Synchronize canonical Markdown and `/dp`.

Evidence: the missing Stripe dependency is rejected before mutation. The selected Stripe plus Entitlements cycle passed plan/apply/check, disposable empty-database Workerd verification for anonymous denial, Free fallback, active Pro grants, expired fallback, cross-account denial and platform Admin readback, plus all type, build, bundle and Wrangler dry-run gates. Deselection removed nine generated files, three Stripe dependencies, client routes, auth plugins and the Worker feature registration; the empty generated registry, default materializer check and default auth regression passed afterward.

# Release

No deployment is authorized. Development acceptance requires a real Stripe Test lifecycle plus the copied product's final plan/feature vocabulary and server-route enforcement. Production remains separately authorized.
