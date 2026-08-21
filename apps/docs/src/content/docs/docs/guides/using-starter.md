---
title: Use the Starter
description: How an AI controller should turn the Blueprint into an owned product.
---

## Controller loop

1. Read the compact context with `npm run ai:context -- --json`.
2. Compare Blueprint selections with Catalog contracts and realized code.
3. Create one focused Change Spec for the next material slice.
4. Implement the smallest owned change that closes that slice.
5. Update every affected canonical Markdown source in the same change.
6. Run `npm run knowledge:sync`, `npm run knowledge:check`, and verification proportional to risk.
7. Record what is local-only, Development-verified, or Production-released without collapsing those states.

## Ownership boundaries

- StyleKit is an audited input to the owned Design Engine, not a runtime dependency.
- PowerAI contributes public-page structure, not brand, authentication, demo content, or an upstream update relationship.
- MapCN contributes adapted Web components; MapLibre is the runtime renderer.
- Open SaaS and SaaSBoard are pinned structure/interaction donors; LastSaaS is the pinned completeness checklist. Their accepted paths and rejected runtimes are machine-readable in `catalog/saas-sources.json`, while generated product code remains Starter-owned and Cloudflare-native.
- Open Design and RunCopilot are research and extraction aids only.
- Better Auth core and selected official plugins stay on one reviewed stable-compatible line.

## Materialization outputs

- The selected Design Profile compiles into tracked semantic adapters for Astro Marketing, shadcn Desktop/Admin, Starlight Docs, and the lean Tamagui Mobile theme.
- Selected Astro Page Catalog entries become real route files. Unselected optional routes remain absent from the build rather than hidden behind runtime flags.
- The final Worker asset artifact serves Astro at the root, the React product application under `/_app`, and Starlight under `/docs`; explicit Worker routes map `/login`, `/app`, `/support`, `/admin`, and `/dp` to the React shell.
- `/setup` shows selected outputs, requirements, and conflicts, but saves intent only. AI must review the read-only materialization plan before applying it.
- `productIntent` records the product summary, audiences, core objects, tenant model, and charging model. The setup proposal may preselect Organization or Stripe packs, but it never applies them silently.
- `catalog/saas-capabilities.json` is the honest capability ledger. `planned` registrations may appear in `/admin` and `/dp`, but cannot be selected as executable features.
- Optional pack manifests may own Cloudflare Queue bindings and secret names as well as files and routes. The materializer derives environment-specific resource names, records ownership for drift-safe removal, and never stores secret values or creates remote infrastructure during local assembly.
- Development and Production each start from a new empty PostgreSQL database initialized from the final selected SQL baseline. Starter does not plan around existing data.
- Public `/api/health` is Worker liveness only. Platform operators use the lazy Admin System Health module for active PostgreSQL latency plus credential-safe email, Google, selected Stripe, and selected Queue evidence; the page never generates synthetic provider traffic.

## Keep the system understandable

Every material change must leave a current answer to four questions: what is selected, what is implemented, what has been verified, and what has actually been released. `/dp` is the read-only projection of those answers; Markdown and frontmatter remain canonical.

## Local runtime and browser acceptance

Run the ordinary Worker with `npm run dev:worker` inside the Development container. The command reads `.dev.vars`, applies the canonical Development database host and port from `starter.config.json`, and supplies Wrangler's local Hyperdrive connection without copying credentials into a command.

The browser gate uses the pinned Compose QA profile:

- Public Worker: start `dev:worker`, then run `docker compose --profile qa run --rm browser-acceptance npm run browser:acceptance:public`.
- Authenticated product: run `docker compose --profile qa run --rm browser-acceptance npm run browser:acceptance:auth`; it owns a disposable PostgreSQL database, CFsend double and verified Admin user.
- Local configurator: start the Web Vite server, then run `docker compose --profile qa run --rm browser-acceptance npm run browser:acceptance:setup`.

`/setup` and `/__starter/*` are deliberately local-only and deployed Workers return 404. Do not weaken that boundary to make a browser test convenient. Evidence under `test-results/browser-acceptance/` is ignored, current-run proof; Markdown and `/dp` record only the resulting lifecycle decision.
