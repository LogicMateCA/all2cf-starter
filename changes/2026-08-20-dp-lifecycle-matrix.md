---
id: dp-lifecycle-matrix
title: Separate pack readiness from project lifecycle in the Development Plan
status: local-verified
affectedModules: [assembler, web]
docsImpact: [PROJECT.md, features/assembler/MODULE.md, /dp]
---

# Outcome

The Development Plan now exposes every pack's reusable Catalog readiness and delivery mode alongside five independent current-project lifecycle facts: selected, materialized, locally verified, Development verified, and Production released. A deselected Catalog pack can no longer look active merely because its reusable implementation has been verified.

# Scope

- Replace the collapsed highest-stage Blueprint cards with one semantic lifecycle table.
- Preserve the Catalog status and delivery contract as distinct columns.
- Render explicit affirmative and empty states for every Blueprint lifecycle flag, with accessible labels and a horizontally scrollable narrow-screen layout.
- Keep `starter.blueprint.json`, Catalog JSON, and Markdown authoritative; the table reads the generated snapshot and does not mutate project state.

# Verification

- Web TypeScript and production build pass with the Catalog delivery field represented in the snapshot type.
- Full repository verification regenerates and validates `/dp`, checks the materialization receipt, builds all surfaces, enforces bundle budgets, and completes both Cloudflare dry-runs.
- No database, provider, or Cloudflare state is accessed or changed.

# Release

Local verification only. No Development or Production deployment is authorized by this change.
