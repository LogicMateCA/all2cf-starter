---
title: "Starter architecture"
status: "template"
source: "starter"
---

# Architecture

## System shape

`Web / Expo / Docs` → `Cloudflare Worker API` → `Hyperdrive / Queues / R2 / CFsend` → `PostgreSQL and provider services`

Project initialization replaces generic names and records the smallest accurate component map. Ownership, trust boundaries, and data flow remain explicit.

## Decisions

- PostgreSQL access is SQL-first. No default ORM.
- Cloudflare facts and operations are verified through official Cloudflare MCP first.
- Worker Studio integrations are capability-detected at runtime.
- Durable state, queues, storage, and external services must document ownership and failure behavior.

## Change Spec

Architecture changes require a Change Spec covering the decision, alternatives, compatibility, data migration, rollback, and validation evidence. Update this source before generated `/dp` output.
