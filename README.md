# All2CF Starter

An AI-first, Cloudflare-native product factory for Web SaaS, content websites, and mobile applications. The canonical repository exposes the full capability catalog; each generated project contains only the applications, Packs, Providers, pages, dependencies, bindings, and AI context selected for that product.

## Why it is optimized for AI

Most starters optimize the first hour: copy files, install dependencies, and start coding. All2CF Starter optimizes the months after that, when multiple AI conversations must understand what exists, where to change it, how to verify it, and what is safe to release.

- **Task-scoped context:** `AGENT_MAP.md` and `ai:context` route AI to the few relevant files instead of loading the repository.
- **Architecture before generation:** a validated Blueprint records product shape, targets, Providers, capabilities, pages, and constraints before code changes.
- **Deterministic composition:** Packs declare owned files, dependencies, routes, SQL, bindings, and rollback behavior; materialization receipts detect drift.
- **Memory outside chat:** Markdown, Module contracts, Change Specs, catalogs, and `/dp` preserve decisions and verification evidence across conversations.
- **Executable truth:** contracts, type checks, builds, workerd smoke tests, budgets, and release read-back distinguish implemented behavior from plans.
- **Safe release language:** ordinary deployment targets Development; Production remains an explicit command with separate identity and rollback evidence.
- **Foundation learning:** reusable bugs found in any product must be generalized, tested, documented, and upstreamed into Starter.
- **Independent output:** generated products run without All2CF; managed cloud connection is optional.

See [AI-FIRST.md](AI-FIRST.md) for the development model, comparison, and limits.

## Requirements

- Node.js 24+
- npm 11+
- PostgreSQL for SQL-first or Drizzle products
- Wrangler 4 and a Cloudflare account for deployment
- Android tooling and/or a connected Mac with Xcode only when native targets are selected

## Quick start

```bash
git clone https://github.com/LogicMateCA/all2cf-starter.git my-product
cd my-product
npm ci
npm run setup
```

Open the local URL shown by the command. `/setup` defines the product type, targets, Providers, SaaS foundation, capabilities, pages, design fallback, Development and Production environments. Setup may be reopened later.

The repository contains the complete Pack catalog as build-time source. It does not load every Pack at runtime: only selections materialized by `/setup` contribute files, dependencies, SQL, routes, Cloudflare Bindings, native modules, or client chunks. Every Engine release verifies a minimal product whose optional Pack count is zero.

You can also download the exact verified Full Source Artifact from [All2CF](https://app.all2cf.com/deploy/projects) without creating an account or cloud project.

## What is included

Permanent product foundations include Better Auth, account settings, notifications, Product Shell, `/admin`, support and bug intake, public Docs, audit and operations health.

The page catalog includes Home, Features, Pricing, About, Contact, Changelog, Privacy, Terms, Sign in, Settings, Notifications, Docs, 404, Support and Admin. Optional growth pages add Blog, Case studies, Integrations and Careers.

Selectable Provider families include:

- Native PostgreSQL/Hyperdrive or the optional All2CF database connector; SQL-first or Drizzle product data;
- Google, GitHub, Apple, Microsoft, Discord, Facebook and LinkedIn sign-in;
- CFsend, Resend or Cloudflare Email Service;
- Stripe, Polar or Autumn billing;
- Cloudflare R2 or S3-compatible object storage;
- Turnstile, Workers AI, PostgreSQL search, Vectorize, MapCN + MapLibre, Expo Push and Twilio SMS;
- Cloudflare Images, Stream, Queues, Workflows, Cron and Durable Objects/WebSockets;
- Cloudflare Workers, GitHub, Expo/EAS, local Android, connected Mac/Xcode, App Store Connect and Google Play release paths.

Planned Providers remain visible but disabled until their adapters and verification are executable. See [CAPABILITIES.md](CAPABILITIES.md) for the complete status table.

## Work with AI

```bash
npm ci
npm run setup
npm run ai:context -- --task "describe the first product feature"
```

- `/setup` configures the generated product and can be reopened later.
- `/dp` shows architecture, ownership, selected capabilities, lifecycle evidence, and where AI should edit.
- `AGENT_MAP.md` routes ordinary work without loading the complete repository context.
- `npm run starter:status`, `starter:diff`, `starter:add`, and `starter:update` manage authorized Starter updates.

The product runs independently. Connecting it to All2CF is optional and enables project-scoped MCP management, private update authorization and release evidence. Disconnecting never disables the local product.

## Documentation

- [Getting started](apps/docs/src/content/docs/docs/getting-started.md)
- [Using `/setup`](apps/docs/src/content/docs/docs/guides/using-starter.md)
- [Optional SaaS Packs](apps/docs/src/content/docs/docs/guides/optional-saas-packs.md)
- [Release operations](apps/docs/src/content/docs/docs/operations/releases.md)
- [Architecture](ARCHITECTURE.md)
- [Performance](PERFORMANCE.md)
- [AI-first development](AI-FIRST.md)
- [Pages, Packs and Providers](CAPABILITIES.md)
- [Licensing](LICENSING.md)

## Development and release

```bash
npm run typecheck
npm run build
npm run auth:smoke:dev
npm run release:dev
```

Development is the default release lane. Production requires an explicit production command:

```bash
npm run release:production
```

For iOS and Android, run `npm run mobile:doctor` and use the documented local Android, connected-Mac Xcode, or optional EAS path selected by the project.

## Licensing

Choose one license path:

1. **AGPL-3.0-or-later** — free, including commercial use, provided all applicable AGPL obligations are followed.
2. **Commercial license — US$199 per independent product** — permits the licensed product to remain closed source and removes AGPL obligations for Starter-owned code under the commercial terms.

See [LICENSING.md](LICENSING.md) for examples and [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md) for the commercial grant. Third-party dependencies and donor material remain under their own licenses.

## Contributing and evolution

Reusable foundation fixes discovered in any product must be upstreamed into canonical Starter with regression tests, documentation, and an update path. Product-specific business logic remains in the product.
