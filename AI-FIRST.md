# An AI-first Starter

All2CF Starter is designed for software primarily implemented and maintained by AI agents while remaining understandable and operable by people. “AI-first” does not mean generated without review. It means the repository gives an agent bounded context, explicit ownership, deterministic operations, and executable evidence.

## The problem it solves

A conventional starter helps create files but usually loses architectural intent immediately afterwards. Over time an AI must rediscover routes, providers, database ownership, release commands, optional modules, and unfinished work from a large repository or old chat history. That wastes tokens and encourages inconsistent rewrites.

All2CF Starter keeps that knowledge in the project itself.

## Core advantages

### 1. Low-context navigation

`AGENT_MAP.md` maps task families to owners, edit locations, required reading, and verification commands. `npm run ai:context -- --task "..."` returns a focused context packet. Full-project context is reserved for onboarding and architecture audits.

Result: AI spends context on the current change rather than repeatedly reading the whole codebase.

### 2. A Blueprint before code

The Blueprint records product intent, Web and mobile targets, database data layer, Providers, SaaS modules, pages, capabilities, design fallback, and release environment. Schemas reject unsupported combinations before generation.

Result: AI adapts an explicit product decision instead of silently inventing architecture.

### 3. Selective, reversible capabilities

Every Pack declares exact templates, targets, dependencies, routes, migrations, bindings, documentation, and lifecycle state. The materializer plans before applying and records hashes in `.starter/materialization.json`. Removal fails closed when project-owned edits would be lost.

Result: the generated project contains only selected functionality without turning optional capabilities into permanent baggage.

### 4. Decisions survive chat history

Canonical Markdown owns architecture and operating rules. Module documents define purpose and boundaries. Change Specs record material decisions, verification, and release state. `/dp` renders the same source into a readable project plan.

Result: a new AI conversation can continue from repository truth without relying on remembered prompts.

### 5. Agent Map evolves with the product

New product features and adopted legacy modules enter the feature lifecycle and Agent Map. Coverage checks identify source files that no task route owns.

Result: adding business functionality does not gradually make the project opaque to AI.

### 6. Verification is part of the architecture

Contracts validate cross-field rules, optional capability boundaries, Provider selection, source identity, release identity, documentation freshness, dependency compatibility, performance budgets, and database behavior. Real builds and workerd smoke tests supplement static checks.

Result: “implemented,” “locally verified,” “Development verified,” and “Production released” remain distinct states.

### 7. Cloudflare release safety

Development and Production use separate Workers, domains, databases, secrets, and evidence. “Deploy” means Development by default. Production requires an explicit production command and exact source/version read-back.

Result: AI can release frequently without treating every successful build as production authorization.

### 8. Foundation fixes compound

When a generated or adopted product exposes a reusable authentication, session, email, Provider, data-layer, setup, update, or release bug, the generalized fix must return to canonical Starter with a regression contract and update path.

Result: product work improves future projects instead of producing isolated patches.

### 9. Independent projects with optional managed services

Generated projects own their source, data, secrets, Git history, Cloudflare resources, and release commands. They do not require All2CF to build or run. Optional All2CF and Visual connections add managed workflows without becoming runtime dependencies.

Result: users keep operational control and can adopt managed services selectively.

### 10. Useful to humans too

The same Blueprint, ownership map, scripts, receipts, and release evidence reduce onboarding and review work for human developers. SQL-first and Drizzle are both supported; AI optimization does not require a proprietary coding runtime.

## Comparison

| Concern | Conventional starter | All2CF Starter |
| --- | --- | --- |
| Initial setup | Copy and edit files | Configure and validate a Blueprint |
| Optional features | Manually delete or ignore | Selective Pack materialization with receipts |
| AI context | Read repository and chat history | Task-scoped Agent Map and context command |
| Architecture memory | README often becomes stale | Canonical Markdown, Module contracts, Change Specs, `/dp` |
| Existing projects | Usually outside scope | Feature adoption and Agent Map integration |
| Updates | Replace files or merge manually | Receipt-aware status, diff, add, and authorized update flow |
| Verification | Build succeeds | Contracts, build, smoke, budgets, lifecycle evidence |
| Deployment | One generic deploy command | Development default; explicit Production and rollback identity |
| Foundation bugs | Fixed per project | Generalized and upstreamed to Starter |
| Cloud dependency | Often tied to vendor | Generated product runs independently |

## Intended AI workflow

1. Read `AGENTS.md` and `AGENT_MAP.md`.
2. Run `npm run ai:context -- --task "the requested change"`.
3. Inspect the routed Module and current implementation.
4. Update one focused Change Spec for material changes.
5. Make the smallest owned change.
6. Run the routed contracts, type checks, build, smoke, and performance gates.
7. Synchronize Knowledge so `/dp` reflects the repository.
8. Release Development and read back exact identity.
9. Release Production only after explicit authorization.

## What it does not replace

Starter does not invent product strategy, truthful marketing claims, customer workflows, legal terms, tax handling, production credentials, Provider approval, App Store review, visual acceptance, or real user testing. It provides stable seams and evidence for those decisions; the product owner and responsible agent still own them.

AI-first is therefore a governance and execution architecture, not a promise that unreviewed generated code is production-ready.

