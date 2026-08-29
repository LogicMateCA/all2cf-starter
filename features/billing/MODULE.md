---
module: billing
status: local-verified
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
- Account surface: when selected, `/app/billing` stays inside the shared Product Shell and exposes verified projection history, monthly/annual Checkout intent, Customer Portal, cancellation review, and renewal restore. Controls call Better Auth Stripe only; they never write plan state directly.
- Notifications: Better Auth Stripe subscription-complete/create/update/cancel/delete callbacks create recipient-scoped in-app billing events. IDs derive from the Stripe event and owner, so a replay updates the webhook receipt without duplicating the notification.
- Entitlement delivery: `saas.entitlements` is a separate optional Starter pack that requires Billing and converts the verified user projection into Free/paid plan grants. Billing does not pretend that usage counting, credits, organization ownership, or final product feature enforcement exist merely because subscriptions are selected.
- Webhook/idempotency policy: the official plugin verifies the raw-body Stripe signature and updates subscriptions by provider subscription identity. `app_stripe_webhook_event` records unique event IDs and replay counts; subscription identity is protected by a partial unique index.

The pack is locally verified but remains unselected in the default free/personal Blueprint. Local evidence covers empty-database schema application, empty subscription readback, foreign-reference denial, invalid signature denial, valid signed unknown-event acceptance, replay counting, idempotent recipient billing notifications, selected Product Shell Web build, and 32-case desktop/mobile light/dark browser acceptance at `test-results/browser-acceptance/2026-08-21T04-29-16-643Z/authenticated`. Real Stripe Test Checkout, Customer Portal, the four required subscription events, cancellation/restore provider completion, and entitlement reconciliation are required before Development verification.

Never change money movement or entitlements without a Change Spec, reconciliation evidence, and rollback plan.
