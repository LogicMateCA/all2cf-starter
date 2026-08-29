---
id: complete-powerai-page-system
title: Preserve the complete PowerAI page and content system
status: local-verified
affectedModules: [assembler, marketing, auth, docs]
docsImpact: [PROJECT.md, ARCHITECTURE.md, DESIGN.md, features/assembler/MODULE.md, features/marketing/MODULE.md, starter.blueprint.json, catalog/catalog.json, pages/catalog.json, /setup, /dp]
---

# Outcome

Starter can materialize the complete useful PowerAI Astro page families and content collections, then render every selected route through the chosen StyleKit snapshot. A new product chooses which complete page families it needs instead of receiving four index placeholders.

# Donor boundary

- Pin PowerAI Astro commit `a1176bf882bf0b1af98115f3280c2a6928e69261` and retain MIT provenance.
- Audit all 20 route source files plus their content collections, layouts, sections, pagination, detail pages, forms and reusable content patterns.
- Adapt useful information architecture, content models and section behavior. Do not import its brand, fixed content, authentication behavior, fonts, assets or runtime relationship.
- Better Auth owns login and sign-up behavior while the selected StyleKit contract owns their visual presentation.

# Page families

- Core marketing: Home, Features, Pricing, About, Contact, Changelog, Privacy, Terms and real 404.
- Blog: index, pagination, post details, content collection, metadata and RSS.
- Case studies: index, pagination, details, related content and evidence fields.
- Careers: index, job details and a configured application path/form.
- Integrations: index, integration details and real availability states.
- Generic Markdown content route for additional public product pages.
- Auth entry and account surfaces remain React/Better Auth routes but participate in the same page and design manifest.
- Docs remains Starlight-owned and separate from internal `/dp`.

# Assembly contract

- `/setup` selects complete page families and then allows individual route refinement. Selecting a family materializes every required index/detail/content component and its build contract.
- Planned or index-only packs cannot be reported as implemented. A family is locally verified only after its real dynamic/static generation, content validation, metadata and representative browser routes pass.
- AI receives page intent, required sections, content schema, data source, form behavior, selected StyleKit adapter and performance budget before editing a page.
- `/dp` distinguishes source route inventory, available family, selected routes, materialized files, content readiness, functional verification and release state.

# Verification

- Catalog audit accounts for every pinned PowerAI route source and records accepted, replaced and rejected behavior.
- Build tests generate representative index, detail, paginated, empty and 404 routes with no required client JavaScript for static content.
- Contact and career forms remain unavailable until their server destination, validation, spam controls and privacy policy are configured.
- Browser checks cover representative routes in the selected StyleKit across desktop/mobile widths, both modes where supported, metadata, navigation, keyboard access and performance budgets.
- Run `knowledge:sync`, `knowledge:check`, `change:check`, Page Catalog checks, Astro type/build checks and materialization add/remove cycles.

# Current implementation evidence

- All 20 pinned `src/pages` source files are accounted for with accepted, replaced and rejected decisions. Generic `[regular].astro` stays rejected; PowerAI login and sign-up behavior stay replaced by Better Auth.
- `page.optional-growth@0.2.0` owns the Astro 7 content configuration, schema-validating Markdown samples, Blog/Case/Careers/Integration indexes and details, Blog/Case pagination, Blog RSS, noindex sample behavior, evidence fields and honest unavailable application/integration states.
- `pages:contract` verifies the exact donor inventory and every complete materializable route family. A disposable all-families Blueprint materialized 16 owned files plus the current `@astrojs/rss` dependency; Astro typecheck reported zero diagnostics and the static build generated 17 routes, including every representative detail and RSS route.
- A disposable all-family cycle rendered Blog, Case Studies, Integrations and Careers index/detail routes through the selected Neumorphism adapter. Thirty-two desktop/mobile, light/dark browser cases passed with zero axe, overflow, console, subresource or navigation failures; RSS returned HTTP 200 with `application/xml`. The materializer then removed all Growth files and `@astrojs/rss`, restored the default Blueprint and proved both source and built route absence.
- This verifies the reusable Starter page system. A copied product still must replace noindex samples with truthful content, evidence, final metadata, contact/application destinations and any product-specific performance acceptance before release.

# Release

No deployment is authorized by this change. Development and Production remain unchanged until their respective release commands are used.
