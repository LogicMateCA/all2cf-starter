---
id: multisurface-provider-wizard
title: Model multi-surface applications and executable Providers
status: implemented
affectedModules: [assembler, auth, billing, mobile]
docsImpact: [PROJECT.md, AGENT_MAP.md, /dp]
---

# Outcome

The hosted creation model can express Desktop Web, Mobile Web, iOS and Android together instead of treating Web SaaS and Mobile App as exclusive output shapes. Mobile iOS/Android selections include the existing Expo Push Pack by default, while Expo Project ID remains optional until the product activates remote push.

Provider selection now separates SQL/Drizzle architecture from external Providers. Social auth expands to Google, GitHub, Apple, Microsoft, Discord, Facebook and LinkedIn. Billing is an exclusive choice among None, Better Auth Stripe, Polar and Autumn. Polar and Autumn have real materialized server/client adapters, lazy billing pages, exact dependencies and local configuration requirements.

# Verification

- Provider and SaaS catalog contracts pass with 71 Provider options.
- Expanded Social Provider contract passes.
- Baseline workspaces typecheck.
- Independent generated projects selecting Polar and Autumn each install and typecheck all retained workspaces.
- Factory contract passes.
- Hosted Console typecheck, design check and Starter v2 unit contracts pass after integration.

# Release

Canonical Starter and All2CF integration source only. A new Development Engine and exact All2CF release are required before customer generation.
