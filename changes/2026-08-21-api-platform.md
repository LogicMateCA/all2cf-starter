---
id: api-platform
title: Make the API SaaS composition executable
status: local-verified
affectedModules: [assembler, api-platform, api-keys, billing, entitlements, usage, webhooks, product-shell, docs]
docsImpact: [PROJECT.md, ARCHITECTURE.md, features/assembler/MODULE.md, features/api-platform/MODULE.md, features/api-keys/MODULE.md, features/usage/MODULE.md, features/webhooks/MODULE.md, starter.manifest.json, catalog/catalog.json, catalog/saas-capabilities.json, /setup, /dp, /docs]
---

# Outcome

The API Platform is no longer a planned label. The `api-saas` preset assembles one real developer experience from the already owned credentials, subscription, entitlement, metering and delivery systems.

# Contract

- Require the complete pack closure: API Keys, Stripe Billing, Entitlements, Usage and Outgoing Webhooks.
- Authenticate API requests through Better Auth API Key verification with explicit scope. Never create a browser session or accept a caller-supplied owner ID.
- Require idempotency before consuming the `api.requests` meter. Reject missing keys, missing scope, absent entitlement and exhausted quota with distinct status and error codes.
- Emit `api.request.completed` only when a request is newly recorded. Duplicate retries do not double-charge or duplicate event delivery.
- Keep the first `/api/v1/me` resource intentionally small and owned. Copied products replace it with their product resources while retaining the security and operational envelope.

# Verification

- Select the full preset, apply it to a disposable empty PostgreSQL database, create a hashed API key, call `/api/v1/me`, replay idempotently, deny foreign/revoked keys, exhaust a bounded test quota, and verify signed Queue delivery evidence.
- Build and inspect the lazy Developer portal and Starlight API guide. Run browser acceptance, bundle checks and both Wrangler dry runs.
- Deselect the preset's optional packs, apply removal, prove dependency/file/binding absence, run the default auth regression and synchronize `/dp`.

# Current evidence

- The selected empty-PostgreSQL workerd flow passes missing-key and missing-idempotency denial, Better Auth scope verification, caller `userId` injection resistance, owner readback, one recorded request, one duplicate replay, a second recorded request, exact quota exhaustion on the third unique request, two usage rows/bucket units, two `api.request.completed` events, two successful signed Queue deliveries, key revocation and immediate 401 denial.
- The selected build emits the Developer route at 0.94 KB gzip and the public Starlight API guide. Both Development and Production dry runs include the selected Queue and stay within the existing Worker boundary.
- The authenticated browser matrix passes 36 desktop/mobile, light/dark cases and 60 screenshots with zero failures at `test-results/browser-acceptance/2026-08-21T05-06-10-156Z/authenticated`.
- All optional API SaaS files, dependencies, Queue configuration and generated registries were removed through the materializer; the default personal/free Blueprint returned clean.

# Release

No deployment is authorized. Development and Production remain unchanged.
