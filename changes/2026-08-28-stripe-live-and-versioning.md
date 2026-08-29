---
id: stripe-live-and-versioning
title: Separate Stripe Test and Live configuration and start stable versioning at 2.1.1
status: development-verified
affectedModules: [billing, assembler]
docsImpact: [RELEASE.md, VERSIONING.md]
---

# Outcome

Stripe Setup now exposes independent Development/Test and Production/Live secret or restricted keys, publishable keys, webhook signing secrets and Price IDs. Test and Live dashboard links are both available. Production client builds receive only `STARTER_PRODUCTION_STRIPE_PUBLISHABLE_KEY`; Development Web/Mobile continue to receive the Test publishable key. Worker release already maps Production secret, webhook and Price values independently.

Public stable versioning begins at `2.1.1` and follows SemVer. Patch releases carry compatible fixes, minor releases add backward-compatible capability, and major releases carry breaking contracts. Development candidates may retain `-dev.N` but public promoted packages use stable versions.

# Security

Secret or restricted keys and webhook signing secrets remain write-only, ignored locally and synchronized to deployment secrets. They are never bundled into Web or Mobile clients. Use separate keys per environment and prefer restricted keys with only the permissions the product requires.

# Verification

- Setup contract proves all four Production Stripe fields are present.
- Environment materialization writes distinct Development and Production Web/Mobile public values.
- Credentials doctor requires complete Test and Live Stripe groups.
- Release controller maps only Production Stripe server credentials to the Production Worker.

# Release

Build and verify stable Engine `2.1.1`, then publish matching neutral GitHub source archives and checksums. Do not mutate or relabel prior dev candidates.
