---
id: better-auth-advanced-packs
title: Select advanced Better Auth capabilities without changing the default runtime
status: implemented
affectedModules: [auth, organizations, setup, materializer]
docsImpact:
  [
    features/auth/MODULE.md,
    features/organizations/MODULE.md,
    docs/guides/optional-saas-packs,
  ]
---

# Outcome

Setup exposes Better Auth security, passwordless and API identity capabilities under an Advanced Identity & Access section. Every capability remains a receipt-owned Pack: deselected means no dependency, route, plugin or schema.

# Scope

- Align Better Auth core, Admin, Expo, Stripe, API Key, Captcha, 2FA and Organization to stable `1.7.2`.
- Add working Packs for HIBP password checks, database-backed last-login method, multi-session, passkeys, magic links, i18n, OpenAPI, JWT/JWKS and Bearer authentication.
- Upgrade Organization to `0.3.0` with normal customer-side organization editing, Teams, dynamic roles, plan-aware limits, white-label metadata, branded invitations, leave/delete and invitation rejection.
- Keep Organization under `/app/team`; platform `/admin` remains oversight rather than the customer organization product.
- Explicitly exclude deferred Username, Ethereum, Creem, Dodo and Commet capabilities.

# Verification

- Materialize all new Packs together in a disposable generated project.
- Run every Web, Worker, Marketing and Docs type check and production build.
- Exercise disposable PostgreSQL/workerd flows for plugin schemas, route behavior, deselection and security boundaries before release.
- Verify Passkey with a real virtual WebAuthn authenticator in a secure browser context.

# Release

Starter `2.3.0` is not yet released. Enterprise Identity, OAuth/MCP/Agent Auth and the remaining advanced optional login Packs remain in this same release scope.
