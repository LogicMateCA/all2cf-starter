---
id: factory-setup-provider-model
title: Unify Factory selection and generated Setup configuration
status: local-verified
affectedModules: [factory, setup, providers, auth-account, mobile-expo]
docsImpact: [PROJECT.md, dp]
---

# Outcome

Factory and generated Setup share one Provider model without pretending their jobs are identical. Factory selects architecture and code; local Setup configures credentials, resources and verification. SaaS Core is visible, Billing is provider-neutral, SMS belongs to Providers, and native mobile automatically receives Expo Push.

# Scope

- Show Auth, Account, Notifications, Admin, Support, Docs, Audit and Health as permanent SaaS Core.
- Replace provider-specific Billing capability cards with one Billing & subscriptions capability and an exclusive Stripe, Polar or Autumn Provider choice.
- Keep SQL-first/Drizzle and Native PostgreSQL/CFPG together as two independent Database dimensions.
- Move Expo Push and Twilio SMS out of generic capability selection; Factory defaults Expo Push for iOS/Android and generated Setup may remove it.
- Split the long Provider Setup into bounded category tabs.
- Use full-card selection with four desktop columns, two tablet columns and one mobile column, with no nested vertical scrolling in Setup content.

# Verification

Run Factory UX, Provider Catalog, Product Shape, Factory generation, assembly, type, build, Knowledge and Change Spec gates. All2CF Console owns its separate Factory presentation and must consume these contracts through an exact reviewed commit; this Starter change does not deploy A2C Core.

# Release

No Engine publication is authorized until the generated SQL-first, Drizzle, Web-only and native-mobile combinations pass full verification and visual review.
