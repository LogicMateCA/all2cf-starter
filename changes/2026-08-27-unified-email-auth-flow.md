---
id: unified-email-auth-flow
title: One verified email continuation flow
status: local-verified
affectedModules: [auth, web]
docsImpact: [features/auth/MODULE.md, dp]
---

# Outcome

Every generated project has one email entry instead of separate sign-in and registration choices. The project routes existing credentials to password entry, unknown emails to password choice plus mandatory verification, and social-only accounts to email ownership proof before creating their first password.

# Scope

Add Better Auth Email OTP to the shared Worker and Web client, enforce hashed ten-minute OTPs with bounded attempts, remove the production-only lookup fallback, and replace the visible registration and linked-provider setup branches with the unified state machine. Existing verification-link handling remains compatible.
The authentication contract also requires every generated project to derive and apply its own Better Auth cookie prefix so sibling products and historical host cookies cannot shadow sessions.

# Verification

Run `npm run auth:flow:contract`, Web and Worker type checks, the Web production build, and the disposable PostgreSQL authentication smoke. Verify the three observable branches: existing password, new email, and existing social-only email.

# Release

Source is locally verified but not yet committed, published as a Starter Engine, deployed to Development, or promoted to Production. All2CF adoption follows the immutable Starter release rather than copying unfinished source.
