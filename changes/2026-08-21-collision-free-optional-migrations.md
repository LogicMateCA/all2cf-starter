---
id: collision-free-optional-migrations
title: Give optional SaaS migrations a collision-free sequence
status: local-verified
affectedModules: [assembler, organizations, billing, api-keys, account-security, entitlements, usage, webhooks, onboarding, api-platform]
docsImpact: [features/assembler/MODULE.md, /dp]
---

# Outcome

Optional SaaS packs can be materialized into a Starter whose baseline migrations are already applied without reusing baseline migration filenames.

# Scope

- Reserve `0001` through `0999` for the permanent baseline and move optional pack targets to the stable `1001` through `1009` sequence.
- Keep each SQL template and schema contract unchanged; only the receipt-owned output filename changes.
- Reapply the materializer so it removes the previous receipt-owned colliding files and writes the new targets before any database migration runs.

# Verification

- Materialization plan/apply/check must show safe removal of the old receipt-owned targets and addition of the new targets.
- Development migration status must list only `1001`, `1002`, `1005`, `1006`, `1007`, and `1008` for the currently selected packs, with no duplicate numeric prefix.
- Apply to the isolated Development database only, then verify the migration ledger, selected-pack workerd flows, type checks, builds, bundle budgets, and both Worker dry-runs.

# Release

The collision-free sequence is applied and verified on Development `starterdev`. Production database structure remains unchanged and no Worker was deployed.
