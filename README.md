# All2CF Starter

An AI-first, Cloudflare-native product factory for Web SaaS, content websites, and mobile applications. The canonical repository exposes the full capability catalog; each generated project contains only the applications, Packs, Providers, pages, dependencies, bindings, and AI context selected for that product.

## Requirements

- Node.js 24+
- npm 11+
- PostgreSQL for SQL-first or Drizzle products
- Wrangler 4 and a Cloudflare account for deployment
- Android tooling and/or a connected Mac with Xcode only when native targets are selected

## Run the canonical factory

```bash
npm ci
npm run verify
npm run setup
```

Open the local URL and use `/factory` to define the product type, targets, Providers, SaaS foundation, capabilities, pages, and design fallback. The factory creates a separate project archive and local handoff; it does not rewrite canonical Starter identity.

## Work inside a generated project

Generated projects use `/setup`, not `/factory`:

```bash
npm ci
npm run setup
npm run ai:context -- --task "describe the first product feature"
```

- `/setup` configures the generated product and can be reopened later.
- `/dp` shows architecture, ownership, selected capabilities, lifecycle evidence, and where AI should edit.
- `AGENT_MAP.md` routes ordinary work without loading the complete repository context.
- `npm run starter:status`, `starter:diff`, `starter:add`, and `starter:update` manage authorized Starter updates.

The generated product runs independently. Connecting it to All2CF is optional and enables managed generation, update orchestration, release evidence, and cloud operations.

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

