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

## Change Spec

Architecture changes require a Change Spec covering the decision, alternatives, compatibility, data migration, rollback, and validation evidence. Update this source before generated `/dp` output.
