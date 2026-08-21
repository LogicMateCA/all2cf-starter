---
module: entitlements
status: local-verified
source: starter
---

# Entitlements module

Purpose: turn a verified user subscription projection into one server-authoritative plan and a bounded feature-access snapshot.

- `saas.entitlements` is independently materialized but requires `saas.billing-stripe`; invalid selection fails before files or dependencies are written.
- Better Auth Stripe owns subscription lifecycle and webhook verification. Starter reads only active or trialing `app_subscription` rows whose period has not ended, then resolves the matching `app_billing_plan` and `app_billing_plan_entitlement` rows. Missing, expired, incomplete, canceled, unpaid, or unknown subscriptions fall back to the active Free plan.
- `/api/entitlements/me` derives its subject only from the current session. `/api/admin/entitlements/:userId` requires the Better Auth platform Admin role. Both responses are `no-store`; client state never grants access.
- The committed `product.read` and `product.actions.monthly` keys are neutral placeholders. A copied product must replace its plan, feature, and quota vocabulary and enforce it inside the product's server routes before Development release.
- Organization billing, seats, usage accounting, credits, overrides, and provider-side metering are deliberately separate capabilities. `saas.usage` may consume the resolved quota only when selected through its own pack; selecting Organizations never changes entitlement ownership implicitly.

Local verification proves the pack dependency gate, receipt-backed select/apply/check, empty-database schema, anonymous denial, Free fallback, active Pro resolution, expired fallback, ordinary-user cross-account denial, platform Admin readback, Web/Worker types, builds, budgets, and Wrangler dry-runs. A safe deselect/remove cycle removes the SQL, routes, Worker feature, UI, Billing plugin files and dependencies; the empty registry and default auth regression pass afterward. Remote Development and Production remain unchanged.
