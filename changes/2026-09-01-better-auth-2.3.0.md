---
id: starter-better-auth-2.3.0
title: Better Auth 2.3.0 identity and organization baseline
status: proposed
affectedModules:
  - auth
  - organizations
  - account-security
  - setup
  - mobile
  - documentation
docsImpact:
  - README.md
  - ARCHITECTURE.md
  - PROJECT.md
  - skills/starter-factory/SKILL.md
securityImpact: high
migrationImpact: high
rollback: restore the previous Starter Engine and selected-project materialization receipt
---

# Summary

Starter 2.3.0 aligns the Web, Worker and Expo identity layers on Better Auth 1.7.2. English, French and Chinese authentication errors are a required i18n foundation. Organization is a complete opt-in capability; advanced identity and access capabilities remain individually selectable Packs.

# Included capability

- Organization lifecycle, memberships, invitations, teams, limits, dynamic roles, branding metadata and organization-scoped API keys.
- Advanced Packs for 2FA, HIBP, last login, multi-session, passkeys, magic link, SSO, SCIM, generic OAuth, JWT, bearer sessions, OAuth Provider, MCP, experimental delegated Agent Auth, Device Authorization, experimental OpenAPI, Phone/Twilio, Anonymous and Google One Tap.
- Ethereum, Username, Creem, Dodo and Commet remain intentionally deferred.

# Safety and opt-in

Pack composition enforces requirements and conflicts before materialization. Deselecting a Pack removes its owned routes, dependencies, migrations and bindings. Agent replay storage is generated only when Agent Auth is selected. Organization and user API keys use configuration-aware owner checks, hashed storage and owner-delete cleanup.

# Upgrade and security boundary

The generated-project updater compares the recorded baseline with the target and fails closed on customer-only edits, case collisions, symbolic-link traversal, concurrent updates and unresolved conflicts. It preserves customer Pages, CSS, Agent Map, provider configuration and other product-owned files; it never treats a functional page edit as a safe template replacement. All Better Auth credentials remain write-only local development values or Worker secrets.

# Verification and rollback

Required evidence includes type checks, SQL-first and Drizzle materialization, true opt-in and deselection checks, Better Auth flow and organization security contracts, browser checks for the Setup surface, bundle budgets, Wrangler dry-runs, and a reproducible immutable Engine archive. Rollback restores the prior Engine/channel artifact and the previous project receipt without deleting customer files.

