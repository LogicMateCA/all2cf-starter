# Codex handoff

All2CF Starter is a Cloudflare-platform specialist Starter designed first for Codex. This file is the first-read guide when the user provides only the GitHub URL.

## Copyable prompt

```text
Use https://github.com/LogicMateCA/all2cf-starter to create my Cloudflare project.
Read CODEX.md and AGENTS.md first. Clone it, install exact dependencies, start local /setup,
and help me select only the modules and Providers the product needs.
```

## Bootstrap

```bash
git clone https://github.com/LogicMateCA/all2cf-starter.git my-product
cd my-product
npm ci
npm run setup
```

Open the displayed local `/setup` URL. Do not start by loading every Pack, Catalog or Change Spec.

## Read order

1. `AGENTS.md` — repository rules and authorization boundaries.
2. `AGENT_MAP.md` — route the current task to one ownership domain.
3. `.starter/public-release.json` — verify the public package identity.
4. `CAPABILITIES.md` — available pages, Packs and Providers.
5. `PROJECT.md` and `ARCHITECTURE.md` only for first architecture or whole-project review.
6. One matched `features/*/MODULE.md` and the newest directly relevant Change Specs.

For ordinary work:

```bash
npm run ai:context -- --task "describe the requested product change"
```

## Setup model

Setup has six steps: Product, Modules, Providers, Pages, Design and Review.

Providers has two levels:

- Essentials — native PostgreSQL with SQL-first/Drizzle, storage, social sign-in, authentication email and billing.
- Advanced — maps, anti-abuse, AI/search, push/SMS, media, background/realtime, release platforms and the complete reference Catalog.

`None` means the optional Pack is not materialized. There is no duplicate Capabilities step. CFPG remains readable for legacy receipts but is not selectable for new projects. Independent AI visual design is Under development; keep the fixed Starter baseline.

## Cloudflare boundary

Prefer Cloudflare-native capabilities when they satisfy the product: Workers, Hyperdrive, R2, Cache API, Queues, Workflows, Durable Objects, Vectorize, Workers AI, Images and Stream. Use official Cloudflare tooling for native inventory and mutations. Do not duplicate Cloudflare MCP behavior inside All2CF MCP.

Development and Production are independent release lanes with separate Worker identities, domains, databases, Bindings and secrets.

## Performance invariant

The repository contains every Pack template as build-time input. Unselected Packs contribute zero realized files, runtime dependencies, SQL migrations, routes, Bindings, native modules and client chunks. Never import directly from `packs/` into an application.

## Secrets and Stripe

Never commit `.dev.vars`, `.env*.local`, All2CF project tokens, OAuth secrets, Stripe keys or Cloudflare tokens.

Stripe Development uses Test keys, Test webhook secret and Test Price IDs. Production uses independent Live values. Secret or restricted keys never enter Web or Mobile bundles; only the matching environment publishable key may enter a client build.

## Ownership

- Generalize reusable foundation bugs back into canonical Starter with regression tests, docs and an update path.
- Keep product business logic, later schema evolution, prompts, permissions and visual direction product-owned.
- Register product domains in `.ai/features.json`, then run `npm run feature:sync`.
- Material changes require one focused Change Spec and current `/dp` sources.

## Release language

- `发布` or `deploy` means Development after required checks.
- `正式发布` or `Production` authorizes Production after verification and rollback identity are ready.
- Never infer Production authorization from an implementation request.

All2CF connection is optional and must not become a runtime dependency.

## All2CF maintenance and paid MCP

For “connect All2CF”, “check my plan”, “check Starter updates”, “preview an update” or “use paid All2CF tools”, open the local `/maintenance` page first. `/all2cf` and `/update` are compatibility aliases.

Prefer the globally installed `all2cf-project` plugin and its hosted All2CF MCP. Authenticate through MCP OAuth, identify the local project from `.starter/source.json`, verify ownership and paid entitlement, obtain a project-scoped connection receipt, then connect it with:

```bash
npm run all2cf:connect -- /path/to/all2cf-project-connection.json
```

Never print, commit or place the project Token in product configuration. It belongs only in ignored `.starter/update-auth.local.json`. If MCP is unavailable, `/maintenance` may import the same cloud-issued connection receipt manually. Follow status → entitlement/check → diff → explicitly authorized update. Use official Cloudflare MCP, not All2CF MCP, for Cloudflare resources and mutations.

## Completion

Use the smallest relevant checks for ordinary work. A whole-project candidate normally includes:

```bash
npm run ai:doctor
npm run agent-map:check
npm run knowledge:sync
npm run knowledge:check
npm run change:check
npm run typecheck
npm run build:sites
npm run bundle:check:marketing
npm run bundle:check:web
npm run bundle:check:docs
npm run cf:dry-run:dev
npm run cf:dry-run:production
```

Report implemented, locally verified, Development verified, Production released, blocked and planned states separately.
