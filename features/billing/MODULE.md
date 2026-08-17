---
module: billing
status: template
source: starter
---

# Billing module

Purpose: own organization-scoped Stripe subscriptions, signed webhooks, plans, and application entitlements.

- Provider: Better Auth Stripe with Stripe Test in Development and Stripe Live in Production.
- Currency/tax rules: project-specific and recorded during initialization.
- Entitlement source: persisted projection of verified provider events.
- Webhook/idempotency policy: provider event IDs are unique and every projection is replay-safe.

Never change money movement or entitlements without a Change Spec, reconciliation evidence, and rollback plan.
