---
id: cloudflare-cron
title: Add optional Cloudflare Cron Trigger
status: local-verified
affectedModules: [assembler, background, admin, operations]
docsImpact: [PROJECT.md, ARCHITECTURE.md, features/assembler/MODULE.md, features/background/MODULE.md, features/admin/MODULE.md, features/operations/MODULE.md, starter.manifest.json, catalog/providers.json, /setup, /dp]
---

# Outcome

A copied project can select different UTC Cron expressions for Development and Production, receive a generated scheduled handler plus SQL heartbeat evidence, and remove the deployed trigger explicitly when deselected.

# Scope

- Extend the optional Worker event registry with `scheduled` dispatch while preserving Queue events.
- Add a receipt-owned Cron Pack, environment expressions, Wrangler triggers, handler/SQL heartbeat and Admin readback.
- Keep the generic scheduled handler limited to one heartbeat upsert; copied products register bounded idempotent jobs separately.
- Preserve `triggers.crons: []` after deselection because omitted configuration would leave remote Cron Triggers unchanged.

# Verification

- Wrangler's current `/cdn-cgi/handler/scheduled` local route invoked the real Workerd scheduled handler with the exact configured expression and millisecond scheduled time; SQL heartbeat count/time matched.
- The older `/__scheduled` route returned Static Assets 404 and was replaced with the current documented route rather than weakening the test.
- Selected types/dry-runs show different environment expressions; deselection removes Worker/SQL/registries/variables and writes empty trigger arrays in both configs, then default regression passes.
- The local Setup browser matrix passed four responsive light/dark cases, eight screenshots and zero failures after Cron controls were added.

# Release

Local verification only. Current Blueprint leaves Cron unselected. Development needs deployment plus trigger propagation/readback and a live scheduled event; Production remains unchanged.
