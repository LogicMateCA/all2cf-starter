---
id: operations-health-selection-authority
title: Keep Operations Health selection Blueprint-authoritative
status: implemented
affectedModules: [operations, billing, background, media, mobile]
docsImpact: [PROJECT.md, /dp]
---

# Outcome

Operations Health determines optional capability selection from generated auth registries, Cloudflare Bindings and Provider variables. PostgreSQL relation presence and configured credentials are evaluated only after a capability is selected. Historical Stripe, webhook, push, SMS, Stream or Cron tables in a reused Development database can no longer make a newly generated unselected project report that feature as active.

# Verification

- The existing Auth smoke flow uses a database that contains prior optional Pack tables while its current Blueprint selects none; every optional component must return `not-selected`.
- Selected capabilities still require their Binding/configuration plus ledger relation before reporting ready.
- Source verification, generated Web SaaS verification and the real All2CF Development release flow remain required.

# Release

Source-only until a new immutable Development Engine is built and accepted through All2CF. Production and Stable are not authorized.
