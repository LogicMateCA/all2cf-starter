---
id: provider-verification-actions
title: Add real Provider verification actions to Setup
status: implemented
affectedModules: [assembler, auth]
docsImpact: [PROJECT.md, features/assembler/MODULE.md, features/auth/MODULE.md, /setup, /dp]
---

# Outcome

Setup can verify configured providers with real behavior instead of treating the presence of keys as proof that a Provider works.

# Scope

- Add a Development OAuth test action for selected Google, GitHub and Apple providers. It opens the real deployed Better Auth login flow so authorization, exact redirect URI, callback and token exchange are exercised by the owner.
- Add a local-only CFsend/Resend delivery endpoint that uses the production authentication-email adapter, including Authorization, payload, stable idempotency, retry and Provider message-ID validation.
- Allow the delivery test to overlay non-empty credential values currently entered in Setup without persisting or returning them.
- Require a valid recipient, limit repeated successful tests for the same Provider/recipient to one per ten seconds, and return only Provider, recipient, message ID and attempt count.
- Keep Cloudflare Email Service testing behind a deployed Worker because its `EMAIL` binding does not exist in local Setup.

# Verification

- Run the authentication-email Provider contract for CFsend, Resend and Cloudflare Email Service payload, authorization, retry, idempotency, message-ID and fail-closed behavior.
- Verify invalid recipient and unsupported local-binding requests fail without sending.
- Run Web typecheck, build, typography, knowledge and Change Spec contracts.
- A real outbound test email and owner-completed OAuth callback remain explicit button-driven checks; implementation does not send mail or authenticate automatically.

# Release

Local implementation only. Development and Production remain unchanged until an explicit release.
