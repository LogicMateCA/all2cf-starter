---
id: auth-email-providers
title: CFsend-default authentication email with Resend switch
status: local-verified
affectedModules: [auth, mobile, docs]
docsImpact: [features/auth/MODULE.md, ARCHITECTURE.md, RELEASE.md, PROJECT.md, /dp]
---

# Outcome

Every Starter environment requires verified email before credential sign-in. Authentication email uses CFsend by default and can switch explicitly to Resend without changing Better Auth or product UI code.

# Scope

- Replace the outbox-only Development mode with an explicit `cfsend | resend` provider contract.
- Keep CFsend as the product default and require a customer-owned CFsend Runtime URL, scoped API key, and verified sender.
- Add a Resend HTTP adapter requiring its own API key and verified sender.
- Retain Cloudflare Email Service as a third, explicit opt-in adapter. It adds a `send_email` binding only when selected and does not increase default CFsend setup.
- Preserve one provider and one stable idempotency key on each outbox row; record provider message IDs and stable failure codes.
- Require email verification in Development and Production. Missing provider credentials fail closed and must block release.
- Verify both providers against local HTTP contract doubles before any live Development mutation.

# Verification

- Provider contract tests cover payload, authorization, idempotency, success IDs, permanent 4xx failures, and retryable 429/5xx failures.
- Local workerd registration writes and sends through a CFsend contract double; unverified password sign-in is rejected; verification permits sign-in.
- Typecheck, immutable SQL migration status, Web/Mobile builds, bundle budgets, Change Spec checks, and both Worker dry runs pass.
- A real Gmail acceptance test must prove receipt, verification callback, `email_verified=true`, and post-verification login before Development is marked released.

Local evidence passed for all three providers. CFsend and Resend contract doubles verified authorization, payload, HTML/text, stable idempotency, provider message IDs, retryable 429/5xx behavior, permanent 401 behavior, and fail-closed missing configuration. Real workerd verified registration, provider-backed outbox evidence, unverified sign-in denial, verification callback, verified sign-in, preference persistence, password reset, reset-time session revocation, and sign out. The isolated test user and outbox rows were removed.

Development migration `0003_auth_email_provider_evidence.sql` was applied additively to `starterdev` with checksum `af7cd033e0a3aa6fa5c0f098277bb73e2b19200fc47ddfb6831d4fbcf20600b5`; a second status read showed no pending migration.

# Release

Implementation is local-verified only. Current Development and Production Workers remain unchanged. The existing CFsend Runtime `https://cfsend-all2cf-com.alex887885.workers.dev` is healthy at version `1.1.3` and has been recorded in the shared Development profile, but its scoped API key is still absent. Development release remains blocked until that key exists and a real Gmail verification flow passes. Production still requires explicit Production wording.
