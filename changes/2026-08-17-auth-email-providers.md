---
id: auth-email-providers
title: CFsend-default authentication email with Resend switch
status: development-verified
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
- Isolate the local workerd contract smoke from parent-process provider secrets so an operator's real CFsend or Stripe credentials cannot override the disposable test env-file.

# Verification

- Provider contract tests cover payload, authorization, idempotency, success IDs, permanent 4xx failures, and retryable 429/5xx failures.
- Local workerd registration writes and sends through a CFsend contract double; unverified password sign-in is rejected; verification permits sign-in.
- Typecheck, immutable SQL migration status, Web/Mobile builds, bundle budgets, Change Spec checks, and both Worker dry runs pass.
- A real Gmail acceptance test must prove receipt, verification callback, `email_verified=true`, and post-verification login before Development is marked released.
- Running the Development release with real provider credentials still uses only the local CFsend contract double during `auth:smoke:dev`; real credentials are reserved for Worker secret sync and the remote edge acceptance test.

Local evidence passed for all three providers. CFsend and Resend contract doubles verified authorization, payload, HTML/text, stable idempotency, provider message IDs, retryable 429/5xx behavior, permanent 401 behavior, and fail-closed missing configuration. Real workerd verified registration, provider-backed outbox evidence, unverified sign-in denial, verification callback, verified sign-in, preference persistence, password reset, reset-time session revocation, and sign out. The isolated test user and outbox rows were removed.

Development migration `0003_auth_email_provider_evidence.sql` was applied additively to `starterdev` with checksum `af7cd033e0a3aa6fa5c0f098277bb73e2b19200fc47ddfb6831d4fbcf20600b5`; a second status read showed no pending migration.

# Release

Development is verified on `app-dev.example.com`. Functional commit `dde68f790c6ca1f4c84915e2a9f3121a5167dcb1` and artifact `ddbfabfdd62800af34ea8ac82b73f44884790775b857b9ecf2feb4d55e95f8a5` passed the complete release gate against Worker `starter-dev`, Hyperdrive `d665e59cdc9741c1898ba7c472c22abf`, database `starterdev`, and user `starterdev`. Official Cloudflare MCP read-back confirmed the custom domain, 100% deployment, required secret names, Development variables, and Hyperdrive identity.

The shared Development profile now retains the valid CFsend Runtime credential and the verified sender `Starter <account@all2cf.com>`. A real Gmail registration acceptance produced provider message `mail_0c660a75-62b2-41d7-8b5c-c21e3e4f043f`; Gmail received the verification message with SPF, DKIM, and DMARC passing. The verification callback redirected to `/login?verified=1`, PostgreSQL reported `email_verified=true`, and subsequent password sign-in returned 200 with Secure, HttpOnly, host-only cookies. The local release gate also removes parent-process provider overrides before starting its contract double. Production remains unchanged and still requires explicit Production wording.
