---
title: Optional SaaS packs
description: Select, materialize, and verify Organizations and Stripe without bloating the default project.
---

# Optional SaaS packs

The default Starter contains identity, lightweight Admin, support, and docs. Organization and Stripe implementations live under `packs/` and do not enter the assembled application until selected in `/setup`.

After saving the Blueprint, ask AI to review `npm run starter:materialize`. Apply the reviewed plan with `npm run starter:materialize:apply`, then run `npm run auth:smoke:dev`. The smoke flow creates a disposable empty PostgreSQL database, applies exactly the selected SQL baseline, runs workerd, and destroys the database afterward.

## Organizations

`saas.team-organizations` adds the official Better Auth Organization plugin, teams, verified-email invitations, `/app/team`, and `/app/invitation`. Tenant roles do not grant platform Admin access. Invitation mail uses the configured authentication email provider, with CFsend as the default.

## Stripe Billing

`saas.billing-stripe` adds Better Auth Stripe, Stripe SDK, `/app/billing`, Checkout subscriptions, Customer Portal, signed webhooks, the subscription projection, and replay receipts. Development requires Stripe Test credentials; Production requires separate Live credentials. The default billing owner is the authenticated user. Organization billing is a separate product decision.

Local smoke evidence is not a substitute for a real Stripe Test lifecycle. Before Development verification, complete Checkout, the required subscription webhooks, Portal, cancellation/restore, and entitlement reconciliation against Stripe Test.

## Empty database rule

Starter always provisions a new empty database from the current selected baseline. It does not generate legacy migrations, data backfills, or dual-write compatibility. Once a copied product has real data, that product owns its later upgrades independently.
