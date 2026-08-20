---
id: 2026-08-20-optional-auth-saas-packs
title: Optional Better Auth Organizations and Stripe Billing packs
status: implemented
affectedModules: [assembler, auth, organizations, billing, web, release, docs]
docsImpact: [AGENTS.md, PROJECT.md, ARCHITECTURE.md, PERFORMANCE.md, features/assembler/MODULE.md, features/auth/MODULE.md, features/organizations/MODULE.md, features/billing/MODULE.md, features/admin/MODULE.md, starter.manifest.json, catalog/catalog.json, cloudflare/bindings.contract.json, /setup, /dp, /docs]
---

# Decision

Implement Organizations and Stripe as receipt-owned optional assembler packs, not dormant dependencies in the default application. Pack manifests contribute exact files, dependencies, lazy routes, SQL, and Better Auth server/client plugin factories. Generated auth registries compose any selected combination and remain empty when no optional auth pack is selected.

Starter databases always begin empty from the final selected baseline. The pack SQL creates the current shape directly; legacy migrations, data backfills, compatibility columns, and dual writes belong only to an already initialized product and are excluded here.

# Organization boundary

Use the official Better Auth Organization plugin aligned at 1.7.1. Enable teams and verified-email invitations, deliver invitations through the existing authentication email provider, and keep tenant roles separate from Better Auth platform Admin. Do not invent product quotas in the generic Starter.

# Billing boundary

Use `@better-auth/stripe` 1.7.1 with Stripe SDK 22.5.0 and API `2026-07-29.dahlia`. The neutral pack is user-scoped, requires verified email, authorizes reference IDs server-side, uses Checkout Sessions and Customer Portal, relies on the official raw-body webhook signature verification, and records replay-counted provider event receipts. Development accepts Test keys and Production accepts separate Live keys. Automatic tax and organization billing remain explicit product decisions.

# Removal and release

Deselecting either pack removes only receipt-matching code, SQL, routes, plugin registry entries, and exact dependencies. Stripe secrets are uploaded by the release controller only while the Billing pack is selected. No Cloudflare deployment or remote database mutation is part of this change.

# Validation evidence

- Organization-only workerd smoke passed against a newly created disposable PostgreSQL database: registration, mandatory verification, organization create/list, owner membership, default team, CFsend-backed invitation, platform Admin denial, support, reset, revocation, and sign-out.
- Stripe-only workerd smoke passed: empty subscription projection, foreign-reference denial, invalid signature denial, valid signed webhook acceptance, replay count `2`, and all core auth/support regressions.
- Combined Organization plus Stripe selection passed the same disposable empty-database workerd flow.
- The combined selected Web build passed. Organization and Billing route chunks measured about 1.4 KB and 0.9 KB gzip; the public main route remained about 66 KB gzip. Development and Production Worker dry runs both passed at about 582 KB gzip.
- Deselecting all optional SaaS packs removed their application files, SQL migrations, routes, Stripe packages, and auth registry imports; the materialization drift check returned clean.
- Real Stripe Test Checkout, Customer Portal, subscription create/update/delete/cancel/restore, real-mailbox remote invitation delivery/acceptance, Development release, and Production release remain unverified. No deployment was performed.
