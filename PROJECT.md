---
title: "Cloudflare AI Starter"
status: "production-released"
owner: "project owner"
source: "starter"
---

# Project

## Purpose

Blueprint-driven project assembler for AI-led Cloudflare products. `/setup` captures the intended product, platforms, design, pages, SaaS functions, optional capabilities, providers, and environments; AI then materializes only those selections into an owned Web application, Worker API, SQL-first PostgreSQL path, Expo client, documentation system, and evidence-bound release flow.

## Users and boundaries

- Primary users: product owners and AI development controllers
- Explicit non-goals: project-specific business behavior and branding
- Environments: `development`, `production`
- Configuration boundary: `/setup` writes the Project Blueprint; `/dp` is read-only; `/admin` operates the resulting product.

## Success criteria

- A copied project can explain its modules, tools, Cloudflare topology, documentation, and release state without relying on chat history.
- A copied project can show which packs were selected, materialized, locally verified, Development verified, and Production released.
- Unselected routes, dependencies, bindings, secrets, and database objects are absent rather than hidden behind runtime flags.
- Generic release intent targets Development; only explicit Production intent promotes the same verified artifact.

## Assembly sources

- `starter.blueprint.json` is the canonical project selection and realization record.
- `catalog/catalog.json` is the internal Design, Page, SaaS, and Capability catalog used by AI and `/setup`.
- `starter.manifest.json` records the repository capabilities and current implemented state; it does not replace the Blueprint.
- StyleKit, PowerAI, and MapCN are donor sources for owned adapters or packs. OpenSaaS, LastSaaS, Open Design, and RunCopilot are reference-only inputs.
- Better Auth core and every selected official Better Auth plugin are maintained as one aligned stable-compatible upstream family.

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
