---
title: "Starter architecture"
status: "template"
source: "starter"
---

# Architecture

## System shape

`Desktop Web / Mobile Web / iOS / Android / Docs` → `Cloudflare Worker API` → `Hyperdrive / Queues / R2 / CFsend` → `PostgreSQL and provider services`

Assembly control flow:

`product brief` → `/setup` → `starter.blueprint.json` → `catalog/catalog.json` → `AI materialization` → `owned project code` → `local verification` → `Development release` → explicit `Production release`

- `apps/web` is a Desktop Web product optimized for mouse, keyboard, large-screen density, dashboards, tables, and complex operations.
- `apps/mobile` is a separate touch-first Expo Router product whose UI source targets Mobile Web, iOS, and Android.
- `apps/docs` is a static Astro/Starlight workspace. Its collision-checked output is merged under `/docs` into the existing Worker asset artifact; it does not create a second Worker or server runtime.
- Desktop and Mobile do not share pages, navigation, layout, UI components, or presentation tokens. They may share API/domain types, auth and permission contracts, i18n keys, telemetry events, and base brand assets.
- Mobile Web uses Expo Router's `single` output because it is an authenticated application rather than an SEO-oriented document site. Its hosting domain and release target remain undecided.

Project initialization replaces generic names and records the smallest accurate component map. Ownership, trust boundaries, and data flow remain explicit.

## Configuration and knowledge boundaries

- `/setup` is local-only configuration UI, not a public product route. It writes reviewed changes to `starter.blueprint.json` and `starter.config.json`, invokes the transactional identity synchronizer, and refreshes `/dp`; it does not mutate Cloudflare or database infrastructure directly. Both deployed Workers reject `/setup` and `/__starter/*` before static asset fallback.
- `/setup` records intent; it does not silently install packages. AI runs the read-only materialization plan, reviews collisions, then explicitly applies it. Pack manifests own exact files, dependencies, and lazy routes, while `.starter/materialization.json` records hashes needed for idempotency and safe removal.
- `starter.blueprint.json` answers what this project selected and how far each selection has progressed.
- `catalog/catalog.json` answers what Starter can assemble and the contract for each pack.
- `design/catalog.json` answers which owned visual profile is selected, its normalized semantic tokens and rules, donor provenance, and readiness of each platform adapter.
- `pages/catalog.json` answers which owned route definitions exist, which renderer owns each route, which routes are mandatory, and which PowerAI patterns were accepted or rejected.
- `starter.manifest.json` answers what the repository itself currently contains and supports.
- Markdown and Change Specs explain why the state exists. Generated `/dp` JSON is a disposable projection of these sources.
- `/dp` is read-only and reports selection, materialization, verification, release, and drift. `/admin` remains the authenticated product-operations area and never becomes the Starter configurator.

Each Catalog pack declares targets, ownership, provenance and license, update policy, routes or APIs, storage and bindings, dependency requirements, conflicts, performance budgets, tests, documentation, and removal behavior. Materialization omits unselected code and infrastructure instead of using broad runtime feature flags.

## Catalog ownership

- Design Catalog: owned profiles and adapters for shadcn Web/Admin, Astro pages, Starlight Docs, and Tamagui brand seeds. The initial catalog contains Owned Neutral plus Precision SaaS, Editorial Signal, and Midnight Control. StyleKit is an audited, commit-pinned donor, never a runtime service.
- Page Catalog: owned core and optional route definitions. PowerAI Astro is a pinned, licensed information-architecture donor whose brand, theme, demo content, auth behavior, and unnecessary client islands are rejected. Public marketing and growth routes are static-first Astro; `/login`, `/app`, `/support`, and `/admin` are React/shadcn product surfaces; `/docs` uses Starlight.
- SaaS Catalog: identity, account, lightweight operations, team, API, billing, and other product presets. OpenSaaS and LastSaaS are product-logic references, not copied foundations.
- Capability Catalog: independently selectable capabilities such as maps, charts, uploads, search, AI, realtime, queues, and observability. MapCN is the first implemented Web pack; its adapted components become owned source while MapLibre remains a normal runtime dependency only when selected.
- Optional source templates live under `packs/` and are excluded from application imports. The generated capability route registry has no imports when no capability is selected; selecting MapCN materializes its owned files and exact MapLibre dependency, while deselection removes them only when the receipt still matches.
- Presets compose catalog IDs rather than duplicating implementations. Basic Product contains the required core; Team SaaS adds Better Auth organizations and Stripe; API Platform adds API keys, signed webhooks, usage, and developer docs; Custom records explicit deviations.

## Decisions

- PostgreSQL access is SQL-first. No default ORM.
- Cloudflare facts and operations are verified through official Cloudflare MCP first.
- Worker Studio integrations are capability-detected at runtime.
- Durable state, queues, storage, and external services must document ownership and failure behavior.
- Desktop Web uses shadcn/ui/Tailwind. Mobile Web/iOS/Android use a lean Tamagui 2 runtime configuration with package-level imports.
- Runtime baseline: Node 24.14, Wrangler 4.124.0, Workers types 5.20260820.1, Hono 4.13.3, Vite 8.2.2, Expo 57.0.14, and React Native 0.86.2. Expo owns compatible React, React Native, Router, and native-module selection.
- Better Auth 1.7.1 owns identity endpoints in the repository. It uses its built-in PostgreSQL/Kysely adapter through request-scoped Hyperdrive pools, host-only Web cookies, official Expo deep-link/SecureStore plugins, the official Admin plugin, database rate limits, and SQL-first migrations. Starter release databases are empty infrastructure created from the current baseline; this repository has no legacy backfill path. Remote schemas change only through an authorized release.
- Better Auth 1.7 account identity is keyed by `(issuer, account_id)`. The empty-project schema starts with this contract: credential rows use `local:credential` plus their linked stable user ID, while Google rows use `https://accounts.google.com` plus the verified provider subject. Starter does not carry legacy-account backfill logic; an existing product must own its upgrade migration separately.
- Better Auth core and every selected official plugin upgrade together on the latest reviewed stable-compatible line. Generated schema changes are proposals; immutable SQL migrations remain the release source.
- Authentication email always passes through `app_auth_email_outbox` and a real provider. CFsend is the default product provider, using a customer-owned Runtime URL, scoped key, verified sender, and stable idempotency key. Resend is an explicit HTTP adapter switch. Cloudflare Email Service is retained as a third opt-in adapter and adds a `send_email` binding only when selected.
- Outbox-only is not an authentication email provider. Missing credentials or provider delivery failure fails closed; Development and Production both require verified email before credential sign-in.
- Theme and locale are user-profile fields exposed through an authenticated preferences contract; product authorization remains separate from these presentation preferences.
- `/support` stores verified-user support and bug submissions in PostgreSQL and limits each account to five submissions per hour. Users read only their own submissions. `/admin` requires the Better Auth platform `admin` role, reads users through Better Auth, manages only ticket state in custom code, and records each privileged ticket mutation in an append-only audit table.

## Change Spec

Architecture changes require a Change Spec covering the decision, alternatives, compatibility, data migration, rollback, and validation evidence. Update this source before generated `/dp` output.
