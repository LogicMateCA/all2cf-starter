---
id: better-auth-advanced-packs
title: Select advanced Better Auth capabilities without changing the default runtime
status: local-verified
affectedModules: [auth, organizations, setup, materializer, mobile]
docsImpact:
  [
    features/auth/MODULE.md,
    features/api-keys/MODULE.md,
    features/organizations/MODULE.md,
    docs/guides/optional-saas-packs,
  ]
---

# Outcome

Better Auth `1.7.2` is the single identity line. Localized errors are required; Organization is an optional customer capability; every other approved identity/access capability is an independent Advanced Pack. Deselected Packs add no dependency, plugin, route, migration, Cloudflare requirement or client chunk.

# Scope

- Required: English/French/Chinese Better Auth i18n.
- Optional Organization: lifecycle, teams, membership, verified invitations, dynamic roles, limits, branding metadata and organization-owned API keys.
- Optional security/passwordless: 2FA, HIBP, Last Login, Multi Session, Passkey and Magic Link.
- Optional enterprise: Generic OAuth, SSO and SCIM.
- Optional service authorization: JWT, Bearer, OAuth Provider, Device Authorization, MCP and experimental Agent Auth.
- Optional entry: Phone/Twilio, Anonymous and Google One Tap.
- Explicitly excluded: Username, Ethereum, Creem, Dodo and Commet.

# Decisions

- Materializer, not only Setup, enforces Pack dependencies and conflicts. OAuth Provider and MCP cannot coexist because each owns the OAuth Provider instance.
- API Key schema mapping is plugin-wide in multi-configuration mode. User and organization references share one table, use configuration-aware integrity triggers, and clean up with their owner.
- Agent Auth remains visibly experimental. Delegated mode only, dynamic host registration disabled, short grants/JWTs and PostgreSQL-backed JTI/JWKS secondary storage close multi-isolate replay gaps.
- SSO uses operator-configured OIDC/SAML and does not claim Better Auth's commercial self-service console. SCIM requires PostgreSQL interactive transactions.
- Custom organization domains are metadata until a copied product proves DNS ownership and routing.

# Verification

- Minimal Factory: only foundation, design, core page and i18n; no advanced files, dependencies, routes, migrations or chunks.
- Full OAuth and full MCP Factory variants: materialization, dependency installation, all workspace type checks, production builds, bundle budgets and Wrangler dry-run.
- Negative Materializer: missing Device dependencies and OAuth/MCP conflict fail closed.
- PostgreSQL 18.4/workerd: first-user platform Admin, organization create/update/delete, branding, team limits/membership, dynamic role, invitation accept/reject, non-member denial, member read-only organization keys, owner key creation, hash-at-rest and owner-delete cleanup.
- Agent selected proof: all type checks and shared secondary-storage migration.
- Expo SDK 57 patch matrix: Expo Doctor 21/21, TypeScript and Web/iOS/Android export.
- Pending before release: secure-context virtual-authenticator Passkey browser flow and final browser layout/accessibility route sweep.

# Security and dependency audit

- Generated Web/Worker full OAuth production dependencies: zero known npm advisories.
- Canonical Mobile retains 13 moderate and 4 high npm advisories in Expo/Metro transitive packages. Expo `57.0.19`, Router `57.0.18` and React Native `0.86.3` are the latest official SDK-compatible patches and Expo Doctor passes. The high advisory is `image-size` in Metro's build-time image parser; no patched npm release exists as of this review. `query-string/decode-uri-component` and `xcode/uuid` are upstream-pinned transitive chains. No incompatible override or SDK downgrade is used to manufacture a clean report.

# Performance

- Minimal Worker dry-run: 2,319.43 KiB raw / 417.14 KiB gzip.
- Full OAuth Worker: 7,620.60 KiB raw / 1,318.47 KiB gzip.
- Full MCP Worker: 7,598.86 KiB raw / 1,315.60 KiB gzip.
- Marketing remains zero-JavaScript; Web, Docs and every lazy capability route pass committed budgets.

# Release

Starter `2.3.0` is not released until all pending browser gates, final migration matrix, update compatibility and release read-back pass.
