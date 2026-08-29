---
id: usage-metering
title: Add atomic idempotent SaaS usage metering
status: complete
affectedModules: [assembler, billing, entitlements, usage, admin, docs]
docsImpact:
  [
    PROJECT.md,
    ARCHITECTURE.md,
    PERFORMANCE.md,
    features/assembler/MODULE.md,
    features/entitlements/MODULE.md,
    features/usage/MODULE.md,
    features/admin/MODULE.md,
    catalog/catalog.json,
    catalog/saas-capabilities.json,
    starter.blueprint.json,
    /setup,
    /dp,
  ]
---

# Outcome

Copied products may select a server-only usage ledger and quota consumer without adopting credits, organization usage, provider metering, or a client-write API.

# Decisions

- Keep Usage independent from Entitlements and require the complete Usage → Entitlements → Stripe pack chain before materialization.
- Record only completed server-side product work through an exported Worker helper. Production exposes user/Admin readback but no generic consume endpoint.
- Use PostgreSQL as the authority: immutable events, monthly aggregate buckets, one transaction, and a transaction-level advisory lock keyed by user/metric/UTC period.
- Reject invalid, non-entitled, over-limit, and idempotency-conflict requests without leaving events or buckets. Same-key/same-amount calls replay the original result.
- Keep user ownership as the neutral baseline. Organizations, credits, corrections, exports, queues, analytics, and Stripe provider-side metering require separate product decisions.

# Verification

- Prove each missing-pack dependency is rejected before mutation.
- Run selected plan/apply/check, disposable empty-database schema and workerd smoke, concurrent same-key replay, concurrent distinct-key quota enforcement, exact event/bucket totals, permissions, Web/Worker types, builds, budgets and Wrangler dry-runs.
- Deselect and prove complete receipt-owned removal plus the default empty-database regression.
- Synchronize canonical Markdown, Change Specs and `/dp`.

# Release

No deployment is authorized. Development acceptance requires the copied product's real meter vocabulary, successful-action integration, Stripe Test subscription lifecycle, and remote concurrency evidence. Production remains separately authorized.
