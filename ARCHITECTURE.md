---
title: "Starter architecture"
status: "template"
source: "starter"
---

# Architecture

## System shape

`Desktop Web / Mobile Web / iOS / Android / Docs` → `Cloudflare Worker API` → `Hyperdrive / Queues / R2 / CFsend` → `PostgreSQL and provider services`

- `apps/web` is a Desktop Web product optimized for mouse, keyboard, large-screen density, dashboards, tables, and complex operations.
- `apps/mobile` is a separate touch-first Expo Router product whose UI source targets Mobile Web, iOS, and Android.
- Desktop and Mobile do not share pages, navigation, layout, UI components, or presentation tokens. They may share API/domain types, auth and permission contracts, i18n keys, telemetry events, and base brand assets.
- Mobile Web uses Expo Router's `single` output because it is an authenticated application rather than an SEO-oriented document site. Its hosting domain and release target remain undecided.

Project initialization replaces generic names and records the smallest accurate component map. Ownership, trust boundaries, and data flow remain explicit.

## Decisions

- PostgreSQL access is SQL-first. No default ORM.
- Cloudflare facts and operations are verified through official Cloudflare MCP first.
- Worker Studio integrations are capability-detected at runtime.
- Durable state, queues, storage, and external services must document ownership and failure behavior.
- Desktop Web uses shadcn/ui/Tailwind. Mobile Web/iOS/Android use a lean Tamagui 2 runtime configuration with package-level imports.
- Better Auth 1.6.29 owns identity endpoints on the Worker. It uses its built-in PostgreSQL/Kysely adapter through request-scoped Hyperdrive pools, host-only Web cookies, official Expo deep-link/SecureStore plugins, database rate limits, and SQL-first migrations.
- Development auth email is recorded in `app_auth_email_outbox`. Production uses the same outbox as an audit/retry boundary and sends through the configured customer-owned CFsend Runtime with an idempotency key.
- Theme and locale are user-profile fields exposed through an authenticated preferences contract; product authorization remains separate from these presentation preferences.

## Change Spec

Architecture changes require a Change Spec covering the decision, alternatives, compatibility, data migration, rollback, and validation evidence. Update this source before generated `/dp` output.
