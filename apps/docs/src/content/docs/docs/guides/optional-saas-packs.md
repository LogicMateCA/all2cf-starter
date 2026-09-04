---
title: Optional SaaS and identity packs
description: Select Organizations, security, enterprise identity, API authorization, billing and product-operation Packs without loading unused runtime code.
---

# Optional SaaS and identity packs

The Starter always includes identity, sessions, platform Admin, support, docs and localized authentication errors. Every capability below is independently materialized from `/setup`: an unselected Pack contributes no plugin, dependency, route, SQL migration, Cloudflare requirement or client chunk.

After saving the Blueprint, review `npm run starter:materialize`, apply it with `npm run starter:materialize:apply`, then run the selected contracts. Pack dependencies and conflicts are enforced by the Materializer as well as Setup; editing Blueprint JSON cannot bypass them.

## Identity foundation

Better Auth core, Admin, Expo and every selected official plugin move together on the reviewed `1.7.2` line. `saas.auth-i18n` is required and includes only English, French and Chinese authentication errors. Username, Sign in with Ethereum, Creem, Dodo and Commet remain deferred and cannot be selected.

## Organizations

`saas.team-organizations` is an optional customer-side tenant layer under `/app/team`, not a platform `/admin` substitute. It provides:

- organization create, switch, profile update, leave and owner-only deletion;
- verified-email invitations with accept, reject, cancel, 48-hour expiry and branded email;
- teams, team membership and active team selection;
- owner/admin/member roles plus organization-scoped dynamic roles;
- Free/Pro organization, member and team limits;
- logo, brand color, support contact, sender label and desired custom-domain metadata.

Custom domains are not active merely because metadata was saved. A copied product must separately verify DNS ownership and routing before serving an organization domain. Tenant roles never grant Better Auth platform Admin.

When `saas.api-keys` is also selected, Better Auth exposes separate `user-keys` and `org-keys` configurations. Owners/admins manage shared organization keys; members can list them but cannot create or revoke them. Both key types remain hashed and cannot create browser sessions.

## Account security and passwordless

- `saas.account-security-2fa`: verified TOTP enrollment, challenge, trusted-device choice, one-time recovery codes and bounded lockout.
- `saas.auth-passkey`: WebAuthn registration, sign-in, list and removal. Production acceptance requires a real secure-context authenticator flow.
- `saas.auth-hibp`: k-anonymous compromised-password rejection on password creation/change/reset paths.
- `saas.auth-magic-link`: ten-minute one-time links delivered by the selected authentication email provider.
- `saas.auth-last-login`: database-backed last authentication method without a non-essential tracking cookie.
- `saas.auth-multi-session`: up to five browser account sessions with explicit switch and revoke UI at `/account/sessions`.

## Enterprise identity

- `saas.auth-generic-oauth`: one to twenty operator-configured OAuth/OIDC providers. IDs are unique, discovery and endpoint URLs require HTTPS, and PKCE remains enabled.
- `saas.auth-sso`: domain-routed OIDC or SAML SSO. OIDC requires HTTPS discovery and PKCE; SAML requires signed certificate material. This Pack uses code/secret-defined providers and does not claim Better Auth's commercial self-service SSO dashboard.
- `saas.auth-scim`: inbound SCIM 2.0 users and groups with connection-isolated bearer credentials and scopes. It requires PostgreSQL interactive transactions and does not grant product roles unless the copied product deliberately adds a projection.

## API, OAuth, MCP and agents

- `saas.auth-jwt`: short-lived asymmetric JWTs and JWKS rotation.
- `saas.auth-bearer`: Better Auth session-token Bearer transport. It is not an OAuth access token.
- `saas.auth-openapi`: experimental Better Auth endpoint reference, visibly marked experimental.
- `saas.auth-oauth-provider`: OAuth 2.1/OIDC authorization server with exact redirects, PKCE, consent, refresh and administrator-managed clients. It requires JWT.
- `saas.auth-device-authorization`: RFC 8628 device flow with explicit client/scope/resource review. It requires JWT and OAuth Provider.
- `saas.auth-mcp`: OAuth-protected MCP resource with discovery and one narrow identity tool. It requires JWT and conflicts with the standalone OAuth Provider Pack because MCP owns that provider instance.
- `saas.auth-agent`: experimental Agent Auth protocol. It permits delegated mode only, dynamic host registration is disabled, grants expire, JWT/JWKS replay state uses PostgreSQL shared secondary storage, and the built-in proof capability can only read the identity that approved it.

## Optional login modes

- `saas.auth-phone`: verified phone linking and phone/password sign-in. It requires the Twilio SMS capability, E.164 numbers, five attempts and five-minute OTP expiry.
- `saas.auth-anonymous`: guest sessions that can later link to a verified account. Guest identity is explicit and removable.
- `saas.auth-google-one-tap`: reuses the selected Google OAuth client and loads Google's script only on `/one-tap`; account auto-selection is disabled.

## Stripe Billing

The Stripe module adds `/app/billing`, Checkout subscriptions, Customer Portal, signed webhooks, subscription projection and replay receipts. Development requires Stripe Test credentials; Production requires separate Live credentials. A copied product must deliberately choose user or organization billing ownership.

## API SaaS

The `api-saas` preset selects API Keys, Stripe, Entitlements, Usage, Outgoing Webhooks and `saas.api-platform`. Its proof endpoint requires a verified key, `product:read` and a unique idempotency key. Replace the example resource, scopes and quota vocabulary before Development release.

## Entitlements and Usage

`saas.entitlements` requires Stripe and resolves verified subscription projections into Free or paid features. `saas.usage` requires Entitlements and records only successful server-side actions under a transaction-level advisory lock. Both ship generic vocabulary that copied products must replace and enforce.

## Outgoing Webhooks

Outgoing Webhooks adds customer management, an SQL event/delivery ledger and one environment-specific Queue. Endpoint secrets are shown only on create/rotation and derived from `WEBHOOK_SIGNING_KEY`. Product code inserts its event in the same SQL transaction as the authoritative change; the Queue consumer signs deliveries, retries bounded failures and records terminal evidence.

## Product Onboarding

Product Onboarding adds a versioned, sequential and idempotent first-success checklist. The neutral welcome step proves the framework only; replace it and increment the definition version when product steps change.

## Empty database and updates

New Starter projects initialize an empty database from exactly the selected migrations. Once a product has customer data, updates use Base/Local/Target comparison: customer changes are preserved, safe foundation changes apply, and true conflicts fail closed for review. Deselected catalog Packs remain in canonical source for later selection but stay absent from the product runtime.
