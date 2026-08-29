---
id: setup-essentials-advanced
title: Widen Setup and reduce Providers to Essentials and Advanced
status: development-verified
affectedModules: [assembler, design]
docsImpact: [PROJECT.md, README.md, CAPABILITIES.md, apps/docs/src/content/docs/docs/reference/capabilities.md]
---

# Outcome

Customer `/setup` is available directly even in the canonical local workspace, remains English regardless of saved Product Shell locale, and opts out of browser translation. Its desktop canvas grows from 1180px to 1540px with a wider navigation rail and smaller dead gap so four-column cards retain useful width.

Setup has six product-neutral steps: Product, Modules, Providers, Pages, Design and Review. Modules replaces the SaaS-specific label because the same Starter creates Web SaaS, content/website and Mobile App products. The duplicate Capabilities step is removed because each former capability is already controlled by a Provider `None`/implementation choice or SQL-first/Drizzle. Provider navigation now has only Essentials and Advanced. Essentials contains native PostgreSQL with SQL-first/Drizzle, object storage, social sign-in, authentication email and billing. Advanced contains maps, Turnstile, AI/search, native push, SMS, media, Cron, Workflows, realtime, release platforms and the complete reference Catalog.

Product intent is reduced to one concrete product brief plus optional primary users. Core objects move to product-domain implementation, while tenancy and charging come from explicit Modules and Billing Providers. The previous inferred proposal cannot auto-select modules.

CFPG is removed from the new-project Setup surface and marked Planned/disabled in the Provider Catalog. Internal parsing remains for existing project receipts only. AI visual design remains visible but is explicitly Under development and cannot be selected; the fixed Starter visual baseline stays active.

# Verification

- `npm run factory:ux:contract`
- `npm run providers:contract`
- `npm run typecheck --workspace apps/web`
- local `/setup` browser review at desktop and mobile widths
- Docs typecheck/build and public Catalog synchronization

# Release

This changes canonical Setup and public documentation. A new Engine/Public Source version is required before updating GitHub packaged assets or All2CF's download channel.
