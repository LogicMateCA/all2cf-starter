---
title: Optional SaaS packs
description: Select and verify Organizations, TOTP 2FA, API SaaS, Stripe, Entitlements, Usage, Onboarding, and Outgoing Webhooks without bloating the default project.
---

# Optional SaaS packs

The default Starter contains identity, lightweight Admin, support, and docs. Organization, TOTP 2FA, API Key, Stripe, Entitlements, Usage, Onboarding, Outgoing Webhook and API Platform implementations live under `packs/` and do not enter the assembled application until selected in `/setup`.

After saving the Blueprint, ask AI to review `npm run starter:materialize`. Apply the reviewed plan with `npm run starter:materialize:apply`, then run `npm run auth:smoke:dev`. The smoke flow creates a disposable empty PostgreSQL database, applies exactly the selected SQL baseline, runs workerd, and destroys the database afterward.

## Organizations

The Starter Teams and Organizations module adds teams, verified-email invitations, `/app/team`, and `/app/invitation`. Its identity adapter uses the official Better Auth Organization plugin. Tenant roles do not grant platform Admin access. Invitation mail uses the configured authentication email provider, with CFsend as the default.

## Stripe Billing

The Starter Stripe Billing module adds `/app/billing`, Checkout subscriptions, Customer Portal, signed webhooks, the subscription projection, and replay receipts. Its identity/billing adapter uses the aligned Stripe SDK and Better Auth integration. Development requires Stripe Test credentials; Production requires separate Live credentials. The default billing owner is the authenticated user. Organization billing is a separate product decision.

Local smoke evidence is not a substitute for a real Stripe Test lifecycle. Before Development verification, complete Checkout, the required subscription webhooks, Portal, cancellation/restore, and entitlement reconciliation against Stripe Test.

## API keys

The Starter API Keys module adds `/app/api-keys` and its reviewed SQL-first table. Its credential adapter uses the official Better Auth API Key plugin. The default keys belong to the current user, are stored only as hashes, cannot become browser sessions, and begin with one `product:read` permission. Replace that placeholder permission vocabulary and prove both allowed and denied product routes before Development release. Usage metering and outgoing webhooks are separate capabilities and are not implied by this pack.

## TOTP two-factor authentication

The Starter Account Security module adds TOTP 2FA, `/app/security/two-factor`, and the Worker-first `/two-factor` challenge. Its authentication adapter uses the aligned Better Auth Two-Factor plugin. Enrollment remains pending until a valid TOTP, backup codes are shown only on generation, and five failed challenges lock the account for 15 minutes. Passkeys are not bundled because they require a separate adapter and real WebAuthn browser/device evidence.

## API SaaS

The `api-saas` preset selects API Keys, Stripe Billing, Entitlements, Usage, Outgoing Webhooks and `saas.api-platform`. Its `/api/v1/me` proof endpoint requires `product:read`, a unique `Idempotency-Key`, and a verified owner-scoped API key; it consumes the `api.requests` quota and emits `api.request.completed` only once for a newly recorded request. `/app/developer` and `/docs/guides/api-platform/` expose the assembled contract. Copied products replace the example resource, scopes and quota vocabulary rather than rebuilding authentication, metering and delivery.

## Entitlements

`saas.entitlements` requires `saas.billing-stripe` and resolves the signed-in user's verified subscription projection into Free or paid plan features. The generic `product.read` and `product.actions.monthly` definitions are scaffolding, not a finished product policy: replace them and enforce the result inside the copied product's Worker routes before Development release. Usage accounting, credits, seats, and organization billing remain separate decisions.

## Usage

`saas.usage` requires Entitlements and records only successful server-side product work. It exposes user and platform-Admin readback but no production consume endpoint. PostgreSQL serializes concurrent consumption, replays the same idempotency key without double counting, rejects changed replays, and rolls back over-limit or non-entitled calls without residue. Replace the generic meter and call the helper from the copied product's completed business action before Development release. Credits, corrections, provider metering, and organization usage remain separate decisions.

## Outgoing Webhooks

`saas.outgoing-webhooks` adds `/app/webhooks`, read-only `/admin/webhooks`, an SQL event/delivery ledger, and one environment-derived Cloudflare Queue. Endpoint secrets are shown only on create or rotate and are derived from the Worker-only `WEBHOOK_SIGNING_KEY`; no endpoint secret is stored. Product Worker code must call `enqueueOutgoingWebhook()` inside the same SQL transaction as the authoritative product change. The receiver gets a bounded JSON envelope plus `Webhook-Id`, `Webhook-Timestamp`, and `Webhook-Signature` HMAC-SHA256 headers. Non-2xx and network failures retry with bounded delays and become terminal after five attempts.

Materialization declares `starter-dev-outgoing-webhooks` for Development and `starter-outgoing-webhooks` for Production, but it does not create cloud resources or store signing roots. Provision the matching Queue and a separate signing root in each environment through the Cloudflare release workflow. Before Development acceptance, replace `starter.webhook.test` with the product event vocabulary and prove a real product transaction against a remote receiver.

## Product Onboarding

`saas.onboarding` adds `/app/onboarding`, Worker-owned ordered steps, versioned user progress, and an authenticated Product Shell redirect. The neutral welcome step proves the framework but is not a finished product journey. Replace `productOnboarding.steps` with the copied product's first-success path, increment its version when the definition changes, and keep settings/support/admin routes available as recovery paths. Completion is sequential and idempotent; Admin sees aggregate adoption counts only.

## Empty database rule

Starter always provisions a new empty database from the current selected baseline. It does not generate legacy migrations, data backfills, or dual-write compatibility. Once a copied product has real data, that product owns its later upgrades independently.
