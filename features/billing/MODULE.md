---
module: billing
status: template
source: starter
---

# Billing module

Purpose: own optional Stripe subscriptions, signed webhooks, plans, and application entitlements without forcing billing into every copied project.

- Provider: Better Auth Stripe with Stripe Test in Development and Stripe Live in Production.
- Version boundary: `@better-auth/stripe` upgrades only with the selected Better Auth core and plugin line. Stripe SDK and API-version changes receive their own compatibility and webhook replay evidence.
- Selection boundary: the official server/client plugin, Stripe SDK, `/app/billing`, subscription and webhook-receipt tables, and release secrets are absent until Billing is selected in the Project Blueprint.
- Ownership boundary: authenticated-user billing is the neutral default. Co-selecting Organizations does not silently change the customer to an organization. Organization billing, seats, deletion rules, and authorization require an explicit product decision and Change Spec.
- Environment boundary: Development accepts only Stripe Test keys and Production only Stripe Live keys. Each environment owns a separate endpoint signing secret and Price ID. The Worker uses the Fetch HTTP client and Stripe API `2026-07-29.dahlia` through Stripe SDK 22.5.0.
- Currency/tax rules: project-specific and recorded during initialization.
- Entitlement source: the persisted `app_subscription` projection updated by the official Better Auth Stripe webhook handler. Client state never grants access.
- Webhook/idempotency policy: the official plugin verifies the raw-body Stripe signature and updates subscriptions by provider subscription identity. `app_stripe_webhook_event` records unique event IDs and replay counts; subscription identity is protected by a partial unique index.

Local evidence covers empty-database schema application, empty subscription readback, foreign-reference denial, invalid signature denial, valid signed unknown-event acceptance, replay counting, selected Web build, and both Worker dry runs. Real Stripe Test Checkout, Customer Portal, the four required subscription events, cancellation/restore, and entitlement reconciliation are required before Development verification.

Never change money movement or entitlements without a Change Spec, reconciliation evidence, and rollback plan.
