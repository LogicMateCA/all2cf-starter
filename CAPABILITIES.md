# Pages, Packs and Providers

This document is a reader-facing summary of `pages/catalog.json`, `catalog/catalog.json`, and `catalog/providers.json`. The machine-readable Catalogs remain authoritative.

Status vocabulary:

- **Development verified** — exercised in an isolated Development environment.
- **Local verified** — executable adapter with local contract or round-trip evidence.
- **Implemented** — selectable implementation exists; environment-specific acceptance may remain.
- **Planned** — visible for planning but disabled and never generated.

## Permanent SaaS foundation

- Better Auth identity and account core
- Product Shell and navigation
- Notifications and account menu
- Account settings, theme and locale
- Product operations Admin
- Support tickets and bug intake
- Public Starlight Docs
- Audit evidence and operations health

## Pages

| Page | Route | Renderer | Availability |
|---|---|---|---|
| Home | `/` | Astro static | Required |
| Features | `/features` | Astro static | Optional |
| Pricing | `/pricing` | Astro static | Optional |
| About | `/about` | Astro static | Optional |
| Contact | `/contact` | Astro static | Optional |
| Changelog | `/changelog` | Astro static | Optional |
| Privacy | `/privacy` | Astro static | Required |
| Terms | `/terms` | Astro static | Required |
| Sign in | `/login` | React application | Required |
| Account and settings | `/app/settings` | React application | Required |
| Notifications | `/app/notifications` | React application | Required |
| Public Docs | `/docs` | Starlight | Required |
| Not found | `/404` | Astro static | Required |
| Support and bug intake | `/support` | React application | Required |
| Product operations Admin | `/admin` | React application | Required |
| Blog | `/blog` | Astro static | Optional growth Pack |
| Case studies | `/case-studies` | Astro static | Optional growth Pack |
| Integrations | `/integrations` | Astro static | Optional growth Pack |
| Careers | `/careers` | Astro static | Optional growth Pack |

## Optional SaaS Packs

| Pack | Status |
|---|---|
| TOTP two-factor authentication | Local verified |
| Teams and organizations | Local verified |
| Stripe subscriptions | Local verified |
| Polar billing | Implemented |
| Autumn billing | Implemented |
| API keys | Local verified |
| Plan entitlements | Local verified |
| Usage metering | Local verified |
| Product onboarding | Local verified |
| Outgoing webhooks | Local verified |
| API platform foundation | Local verified |

## Providers

| Family | Selectable now | Planned and disabled |
|---|---|---|
| Database | Native PostgreSQL + Hyperdrive | CFPG / All2CF Database connector (legacy receipts remain readable) |
| Data access | SQL-first; Drizzle | — |
| Social sign-in | None; Google; GitHub; Apple; Microsoft; Discord; Facebook; LinkedIn | Generic OAuth/OIDC |
| Authentication email | CFsend; Resend; Cloudflare Email Service | — |
| Billing | None; Stripe; Polar; Autumn | — |
| Object storage | None; Cloudflare R2; S3-compatible | — |
| Anti-abuse | None; Cloudflare Turnstile | — |
| Observability | Cloudflare Observability | Sentry |
| Product analytics | None | Pulse; Cloudflare Web Analytics; PostHog; Plausible |
| AI | None; Workers AI | Google Gemini; OpenAI; Anthropic |
| Search and vector | None; PostgreSQL search; Cloudflare Vectorize | Cloudflare AI Search; Algolia; Typesense/Meilisearch |
| Maps | None; MapCN + MapLibre | MapTiler; Mapbox; Google Maps/Places |
| Notifications | In-app; Email | Web Push |
| Native push | None; Expo Push | — |
| SMS | None; Twilio SMS | — |
| Media | None; Cloudflare Images; Cloudflare Stream | — |
| Background and realtime | None; Cloudflare Queues; Workflows; Cron; Durable Objects/WebSockets | — |
| Cache and flags | None; Cloudflare Cache API | Cloudflare KV; PostgreSQL feature flags |
| Release | Cloudflare Workers; GitHub; Expo/EAS; local Android + Mac/Xcode; App Store Connect; Google Play | — |

## Runtime loading rule

The Full Source repository contains all Pack templates as build-time input. Only Packs selected and materialized through `/setup` contribute realized files, dependencies, SQL, routes, Bindings, native modules or client chunks. The public baseline receipt reports `optionalPackCount: 0`.
