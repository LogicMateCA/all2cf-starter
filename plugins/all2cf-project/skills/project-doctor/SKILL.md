---
name: all2cf-project-doctor
description: Diagnose overall health, drift, missing configuration, performance or release readiness in an All2CF-generated project without changing it.
---

# All2CF project doctor

Run read-only project checks first: `npm run ai:doctor`, `npm run agent-map:check`, `npm run knowledge:check`, relevant contracts, dependency status and project-specific build checks. Read `.starter/source.json` and report Starter receipt/channel drift separately from product code health.

Check only configured providers and selected modules. Do not print secrets, mutate configuration, deploy, migrate a database or apply updates. Separate confirmed failures, warnings and unavailable live evidence. Use official Cloudflare MCP for current Cloudflare state; use All2CF MCP only for project identity, entitlement, Engine/Pack compatibility and authorized update facts when it becomes available.
