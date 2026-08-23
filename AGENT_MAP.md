---
title: "Starter Agent Map"
status: "implemented"
source: ".ai/agent-map.json"
---

# Starter Agent Map

This is the default entry point after initial project setup. Do not load the whole repository to begin an ordinary task.

## Default routine

1. Read `AGENTS.md`, this file, `starter.blueprint.json`, and `.starter/materialization.json`.
2. Run `npm run ai:context -- --task "<the user request>"`.
3. Read only the matched route's primary files, module documents, and newest directly relevant Change Specs.
4. Search wider only when the matched owner or evidence is insufficient.
5. Use `npm run ai:context -- --full` only for first initialization, whole-project architecture, or release/cutover audit.

The machine-readable route table is `.ai/agent-map.json`. `npm run agent-map:check` verifies every declared path, every module owner, and the default context size.

## Route directory

| Route | Owns |
| --- | --- |
| `project-assembly` | Factory, source Engine candidates and Channels, update-release Skill, generated-project Setup, Blueprint, lifecycle updates, materializer, identity sync, `/dp` generation |
| `auth-account` | Better Auth, OAuth, email verification, sessions, preferences, 2FA |
| `product-shell` | Dashboard shell, navigation, notifications, onboarding, settings |
| `organizations-billing` | Organizations, Stripe, subscriptions, entitlements, usage |
| `api-webhooks` | API keys, developer platform, outgoing webhooks and Queues |
| `support-admin-operations` | Support/bug tickets, Admin, audit, announcements, health |
| `database` | PostgreSQL, Hyperdrive, CFPG, migrations and SQL performance |
| `storage-media` | R2/S3, uploads, Images and Stream |
| `ai-search-maps` | Workers AI, AI Gateway, Vectorize, search and MapCN |
| `background-realtime` | Cron, Workflows, Durable Objects and WebSockets |
| `public-pages-docs` | Astro Marketing, PowerAI pages, Starlight and Pagefind |
| `design-stylekit` | StyleKit global lock, Design Providers, design tokens, typography, modes and visual acceptance |
| `mobile-expo` | Expo Router, Tamagui, EAS, iOS, Android and native push |
| `cloudflare-release` | Bindings, provisioning, deploy, rollback and live identity |
| `performance` | Bundles, caching, request fan-out, Web Vitals and query plans |

## Ownership shortcuts

- Reusable optional capability: start at `packs/<kind>/<pack>/pack.json`, then its templates. Apply through the materializer.
- Selected receipt-owned output: inspect `.starter/materialization.json` before editing. A direct target-only edit is drift.
- Permanent SaaS shell: start in `apps/web/src/components`, `workers/app`, and the matching `features/*/MODULE.md`.
- Historical reasoning: search `changes/` by feature name or `affectedModules`; never read all Change Specs by default.
- Provider facts or Cloudflare operations: follow the exact matched Skill and current live evidence requirements.
