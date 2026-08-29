---
module: api-platform
status: local-verified
source: starter
---

# API platform module

Purpose: compose the existing API Key, Billing, Entitlements, Usage and Outgoing Webhook packs into one executable API-SaaS boundary instead of presenting disconnected feature pages.

- Selection: the `api-saas` preset selects `saas.api-platform` and every required pack. The default free/personal Starter remains unchanged.
- Authentication: `/api/v1/me` accepts a Better Auth API key in `Authorization: Bearer` or `x-api-key`, requires `product:read`, and never converts the key into a browser session.
- Ownership: the verified API key's Better Auth `referenceId` is the sole user authority. A client cannot submit another user ID.
- Idempotency: every request requires an 8–200 character `Idempotency-Key`. Replaying the same key and amount returns the existing usage event and does not consume quota or emit a second webhook event.
- Quotas: the neutral baseline grants 1,000 monthly `api.requests` to Free and 100,000 to Pro. Copied products replace this example vocabulary with their real resources and plans.
- Events: a newly recorded request emits `api.request.completed` through the selected Cloudflare Queue and signed outgoing-webhook pipeline. No subscribed endpoint means no delivery record, not a fake success.
- Documentation: `/app/developer` links credential, usage, webhook and public guide surfaces; the Starlight guide documents authentication, errors and a runnable curl boundary.
- Performance: the API path is Worker-first, SQL-first, bounded and `no-store`. API keys and server Stripe/Webhook dependencies remain absent when the preset is deselected.

Local verification must prove dependency closure, owner isolation, permission denial, missing/revoked key denial, idempotent metering, quota enforcement, signed event delivery, browser accessibility, dry runs and clean removal. Real remote receivers and Development publication remain separate gates.
