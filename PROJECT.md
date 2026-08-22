---
title: "Cloudflare AI Starter"
status: "local-verified"
owner: "project owner"
source: "starter"
---

# Project

## Purpose

Blueprint-driven project assembler for AI-led Cloudflare SaaS products. The reusable baseline owns the normal SaaS platform, application shell, administration, account, notification, support, documentation and operations behavior. `/setup` captures what the new SaaS actually does, its actors, core objects, tenancy and charging model, product capabilities, providers and page families before the replaceable StyleKit presentation choice; AI then materializes the product-specific remainder into an owned Cloudflare application.

## Users and boundaries

- Primary users: product owners and AI development controllers
- Explicit non-goals: project-specific business behavior and branding
- Environments: `development`, `production`
- Configuration boundary: local `http://localhost:15173/setup` writes the Project Blueprint; local `http://localhost:15173/dp` is the current worktree projection; deployed `/dp` is read-only evidence for that exact released commit; `/admin` operates the resulting product.
- Setup persistence boundary: every step can save a draft and “Save and continue” persists before navigation. Provider selection is independent from credential timing; Google, GitHub, Apple, CFsend, Resend, Stripe and Cloudflare Email Service may inherit project/shared values, accept project-local replacements, or remain visibly deferred until a later local `/setup` session. Provider readiness is not inferred from key presence alone: Setup can open the real Development OAuth flow and send an explicit real CFsend/Resend test email.
- AI control boundary: Sol is the sole controller but not a permanently high-reasoning process. It selects light, medium, or high from task complexity and risk, defaults normal implementation to medium, and reserves high for architecture, release, ambiguous cross-module judgment, and high-risk mutation.

## Success criteria

- A copied project can explain its modules, tools, Cloudflare topology, documentation, and release state without relying on chat history.
- A copied project begins with a coherent authenticated SaaS shell and platform services. Product work starts by adding the SaaS-specific objects and journeys rather than rebuilding login state, account menus, notifications, settings, billing seams, support, Better Auth-backed platform user operations, Admin and Docs.
- A copied project can show which packs were selected, materialized, locally verified, Development verified, and Production released.
- `/dp` presents Catalog readiness and current-project lifecycle as separate facts, so an available or reusable verified pack cannot be mistaken for a selected or released project capability.
- Unselected routes, dependencies, bindings, secrets, and database objects are absent rather than hidden behind runtime flags. Every copied Starter database begins empty from the final selected baseline; this repository never carries legacy-data migration or backfill logic.
- Generic release intent targets Development; only explicit Production intent promotes the same verified artifact.

## Assembly sources

- `starter.blueprint.json` is the canonical project selection and realization record.
- The reusable Starter's fixed default visual system is StyleKit `editorial@2.2.0`: a restrained white/light-gray and black/dark-gray SaaS foundation chosen once during initialization. Ordinary Setup sessions do not rotate styles; later changes require an explicit owner choice, save, materialization and Development release.
- Its structured database policy fixes the PostgreSQL engine, SQL-first access, an empty initial state, the final selected-pack schema baseline, and no existing-data compatibility scope. `/setup` separately selects native PostgreSQL through Hyperdrive or CFPG through `@all2cf/database-connect`; AI must not infer migration or backfill work for a new Starter project.
- `catalog/catalog.json` is the internal Design, Page, SaaS, and Capability pack catalog used by AI and `/setup`; `catalog/saas-sources.json` pins donor evidence and accepted adaptation paths, while `catalog/saas-capabilities.json` is the baseline/materializer/planned capability ledger.
- `catalog/providers.json` is the complete Provider/Capability ledger. It requires `None` for optional categories, records defaults, credentials, Bindings, dependencies, official setup links and real verification modes, and keeps Planned options disabled until an executable Pack exists.
- Object storage is an explicit optional Provider choice. `none` adds no runtime; R2 materializes a native `OBJECTS` binding and isolated environment buckets; S3-compatible materializes its SDK and environment-specific secrets only when selected. PostgreSQL owns metadata while the selected Provider owns bytes.
- Product Analytics remains `None` in the current Blueprint. Pulse is the preferred future external-product integration boundary, so this Starter does not duplicate Pulse with an embedded analytics runtime before that contract is defined.
- AI is also optional by default. The executable Cloudflare-native choice materializes Workers AI with an environment-specific model and optional AI Gateway; external model SDKs remain Planned until they have the same real configuration, verification and removal contracts.
- Each Catalog pack declares `baseline`, `materializer`, or `planned` delivery. `/setup` may display planned work, but executable presets, saved selections, and AI materialization reject it until a real delivery path exists.
- The Design Catalog audits all 146 pinned StyleKit entries and classifies them before selection. Only 28 deliberately distinct whole-site `global-system` entries may own the base style lock; 35 close style variants, 18 layouts, 11 enhancements, one Admin density mode, and 53 reference/content entries stay separate. Selecting an eligible system creates an immutable Starter-owned snapshot with source slug/revision, hashes, tokens, recipes, AI rules, required/forbidden states, and per-surface adapter evidence.
- `stylekit:contract` and `stylekit:boundary` compile and inspect the selected snapshot through Marketing, Auth, Product, Admin, Docs, Setup, DP, and Mobile adapters. Browser comparison, accessibility, modes, and breakpoints remain separate acceptance evidence rather than being inferred from compilation.
- `starter.manifest.json` records repository capabilities and the strongest evidence for the current source tree; it does not replace the Blueprint or inherit a historical Production state after unreleased changes.
- StyleKit is the pinned visual-system source catalog; PowerAI is the pinned page/content-system donor; Open SaaS is the pinned SaaS product-shell and flow donor; SaaSBoard is the pinned authenticated dashboard-shell interaction donor; LastSaaS is the pinned completeness checklist. All generated runtime code remains Starter-owned and Cloudflare-native. Open Design and RunCopilot remain research/extraction aids.
- `pages/catalog.json` must account for PowerAI's complete useful page families, content collections, details and pagination rather than index placeholders. Authenticated routes retain Better Auth behavior while sharing the selected StyleKit presentation contract.
- `packs/` contains Design adapters, route-level Page templates, and optional Object Storage, Cloudflare Turnstile through Better Auth Captcha, Workers AI with optional AI Gateway, MapCN Web, Better Auth Organizations, TOTP 2FA, Stripe Billing, Starter Entitlements, Usage Metering, Better Auth API Key, Product Onboarding, Outgoing Webhooks, and the complete API SaaS composition. API keys, onboarding, account security, anti-abuse, AI, entitlements, usage metering, credits, webhooks, and API Platform remain explicit capabilities. Pack manifests may declare hard dependencies, Worker route/event registrations, Cloudflare Queue bindings, R2/AI bindings, provider-specific dependencies and secret requirements; invalid combinations fail before mutation. `npm run starter:materialize` plans, `starter:materialize:apply` writes, and `starter:materialize:check` proves that selected files, dependencies, client and Worker routes, Wrangler Worker-first routing, Queue/R2/AI configuration, generated Design/Project/storage artifacts, auth/Worker registries, lifecycle state, and the ownership receipt agree. Deselection remains visible as pending removal until apply completes.
- `apps/marketing` builds the selected static-first Astro public routes at the site root; the React application builds under `/_app`, and Starlight remains under `/docs`. Cloudflare Static Assets serves public routes and a real 404 while the Worker handles only APIs and the explicit React application routes.
- Better Auth core and every selected official Better Auth plugin are maintained as one aligned stable-compatible upstream family. An offline contract checks active manifests, deselected optional-pack manifests, and official-plugin source pins in every `verify`; the online dependency report compares all of them with stable registry tags.
- The current locally verified runtime baseline is Wrangler 4.124.0, Workers types 5.20260820.1, Hono 4.13.3, Vite 8.2.2, Astro 7.2.4, Starlight 0.41.7, Expo SDK 57.0.15, and aligned Better Auth 1.7.1 packages. TypeScript 6.0.3 is the newest line currently compatible across Astro Check/Volar, Expo, Web, and Worker. Optional Organizations 1.7.1, API Key 1.7.1, and Stripe Billing 1.7.1 with Stripe SDK 22.5.0 pass selected disposable empty-database workerd flows; remote Stripe Test Checkout, Development, and Production remain unreleased.
- CFPG is an explicit database Provider choice, not a permanent dependency. Setup validates the exact All2CF connection command and stores its non-secret database ID plus immutable install descriptor. Materialization adds `@all2cf/database-connect@0.2.0-rc.2`, aliases `pg`, replaces Hyperdrive with `ALL2CF_DATABASE` per environment, and owns reversal in its receipt. Development and Production require distinct CFPG database IDs.

## Change Spec

Every material change records intent, affected contracts, migration or rollback needs, validation evidence, and documentation updates before merge. The same change updates all affected canonical Markdown, runs `knowledge:sync`, and proves `knowledge:check`; generated `/dp` JSON is never edited as source. This file remains current as the project evolves.

## Operational skills

- `skills/cloudflare-release/SKILL.md` owns verified Cloudflare builds, Development releases, explicit Production releases, and rollback evidence.
- `skills/starter-bootstrap/SKILL.md` owns copied-project identity replacement, environment materialization, infrastructure idempotency, and the first Development release.
- `skills/expo-release/SKILL.md` owns Expo verification, Development/Preview updates and builds, and separate Apple App Store and Google Play submission evidence.
- `skills/runtime-upgrade/SKILL.md` owns stable-version discovery, compatibility decisions, Better Auth/plugin alignment, upgrade verification, and Development release evidence.
- `skills/project-context/SKILL.md` owns Change Specs, module/document status, AI onboarding context, stale detection, and `/dp` synchronization.
- Visual systems, Web/Expo component sets, and chart choices remain reusable templates selected per product; they are not release skills.

The remaining planned operational skill is `cloudflare-infrastructure`. Create it only after its topology-change workflow has been exercised end to end. The Better Auth database and release workflow is now implemented in project scripts; per the Starter policy, extract it into a Skill only after Development deployment and repeatable live evidence are stable. Stripe and broader CFsend operations still wait for their complete product flows. Agent Map and new Codex plugins are deliberately deferred until the assembler's real workflows expose stable boundaries worth packaging.

Authentication email is a product contract rather than an environment convenience: CFsend is the default provider, Resend is switchable, and Cloudflare Email Service is opt-in. Copied projects must configure one real provider before credential registration can be released.

Operations health is a baseline product contract, not an external monitoring suite. Public `/api/health` proves only Worker liveness; platform Admin `/api/admin/health` actively measures PostgreSQL reachability and reports credential-safe email, selected Google/GitHub/Apple login, optional Stripe, and optional Queue delivery evidence. The dashboard never creates synthetic provider traffic.

## Active foundation correction

The released baseline predates the current complete SaaS and StyleKit contracts. `complete-saas-foundation`, `stylekit-global-control`, and `complete-powerai-page-system` remain the focused Change Specs. Current source locally verifies the default `saas-foundation` preset, machine-readable product intent and SaaS provenance/capability ledgers, permanent Product Shell, notifications, account settings, lightweight support threads, modular Admin shell and operations health; a fully classified 146-entry StyleKit library curated to 28 genuinely distinct selectable global systems with `2.2.0` snapshots, pinned source-cover previews and selected-Neumorphism browser acceptance; and a complete materializable PowerAI page system with a disposable all-family browser cycle. Disposable local evidence, real providers, Development deployment and Production release remain distinct, so this source tree must not be described as a newly Production-released Starter.
