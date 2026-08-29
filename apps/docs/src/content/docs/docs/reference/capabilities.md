---
title: Pages, Packs and Providers
description: See exactly which product surfaces and integrations are available, and which options remain planned.
---

The machine-readable sources are `pages/catalog.json`, `catalog/catalog.json`, and `catalog/providers.json`. Planned options are visible for architecture planning but disabled and never generated.

## Permanent foundation

Authentication and sessions powered by Better Auth, account settings, Product Shell, notifications, `/admin`, support and bug intake, Starlight Docs, audit evidence and operations health are part of the permanent product foundation.

## Page catalog

| Surface | Routes |
|---|---|
| Public product | `/`, `/features`, `/pricing`, `/about`, `/contact`, `/changelog` |
| Legal and system | `/privacy`, `/terms`, `/404` |
| Authenticated product | `/login`, `/app/settings`, `/app/notifications` |
| Operations | `/admin`, `/support` |
| Documentation | `/docs` |
| Optional growth | `/blog`, `/case-studies`, `/integrations`, `/careers` |

## Selectable Providers

- Database: native PostgreSQL/Hyperdrive with SQL-first or Drizzle. Legacy CFPG receipts remain readable, but the connector is not selectable for new Starter projects.
- Social: Google, GitHub, Apple, Microsoft, Discord, Facebook and LinkedIn.
- Email: CFsend, Resend and Cloudflare Email Service.
- Billing: Stripe, Polar and Autumn.
- Storage: Cloudflare R2 and S3-compatible.
- Cloudflare capabilities: Turnstile, Workers AI, Vectorize, Images, Stream, Queues, Workflows, Cron and Durable Objects.
- Maps and messaging: MapCN + MapLibre, Expo Push and Twilio SMS.
- Release: Cloudflare Workers, GitHub, Expo/EAS, local Android, connected Mac/Xcode, App Store Connect and Google Play.

## Optional SaaS Packs

TOTP 2FA, Teams and Organizations, Billing, API Keys, Entitlements, Usage Metering, Product Onboarding, Outgoing Webhooks and the API Platform foundation are selectable Packs.

## Planned and disabled

CFPG/All2CF Database for new projects, Generic OAuth/OIDC, Sentry, product analytics Providers, Gemini, OpenAI, Anthropic, AI Search, Algolia, Typesense/Meilisearch, MapTiler, Mapbox, Google Maps/Places, Web Push, KV and PostgreSQL feature flags remain disabled until their adapters and verification are executable.

See the repository-level [`CAPABILITIES.md`](https://github.com/LogicMateCA/all2cf-starter/blob/main/CAPABILITIES.md) for the full status table.
