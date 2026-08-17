---
title: "Cloudflare AI Starter"
status: "production-released"
owner: "project owner"
source: "starter"
---

# Project

## Purpose

Reusable foundation for AI-led Cloudflare products with a Web application, Worker API, PostgreSQL path, Expo client, product documentation, internal Development Plan, and evidence-bound releases.

## Users and boundaries

- Primary users: product owners and AI development controllers
- Explicit non-goals: project-specific business behavior and branding
- Environments: `development`, `production`

## Success criteria

- A copied project can explain its modules, tools, Cloudflare topology, documentation, and release state without relying on chat history.
- Generic release intent targets Development; only explicit Production intent promotes the same verified artifact.

## Change Spec

Every material change records intent, affected contracts, migration or rollback needs, validation evidence, and documentation updates before merge. This file remains current as the project evolves.

## Operational skills

- `skills/cloudflare-release/SKILL.md` owns verified Cloudflare builds, Development releases, explicit Production releases, and rollback evidence.
- `skills/starter-bootstrap/SKILL.md` owns copied-project identity replacement, environment materialization, infrastructure idempotency, and the first Development release.
- `skills/expo-release/SKILL.md` owns Expo verification, Development/Preview updates and builds, and separate Apple App Store and Google Play submission evidence.
- `skills/runtime-upgrade/SKILL.md` owns stable-version discovery, compatibility decisions, Better Auth/plugin alignment, upgrade verification, and Development release evidence.
- `skills/project-context/SKILL.md` owns Change Specs, module/document status, AI onboarding context, stale detection, and `/dp` synchronization.
- Visual systems, Web/Expo component sets, and chart choices remain reusable templates selected per product; they are not release skills.

The remaining planned operational skill is `cloudflare-infrastructure`. Create it only after its topology-change workflow has been exercised end to end. Database migration and provider-specific skills wait for the real Better Auth, Stripe, and CFsend implementations.
