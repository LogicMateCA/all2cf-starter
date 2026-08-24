---
id: auth-smoke-selected-social-providers
title: Verify only the selected social providers in Auth smoke
status: implemented
affectedModules: [auth, operations]
docsImpact: [features/auth/MODULE.md, features/operations/MODULE.md, /dp]
---

# Outcome

Make the disposable Auth smoke compare Operations Health with the generated Blueprint's selected Google, GitHub and Apple providers. Selected providers must be configured and healthy; unselected providers must truthfully report `not-selected`. The smoke no longer hard-codes Google as required for projects that intentionally select no social login or another provider.

# Verification

The social-provider contract covers selected, deferred and unselected health states. The full SQL-first and Drizzle portable verification gates, Auth smoke, types, builds, bundle budgets and both Wrangler dry-runs must pass before a new Engine candidate exists.

# Threat model

The Blueprint remains the sole social-provider selection authority. Runtime credentials are never returned or logged; the assertion consumes only read-only health status and configured booleans. An unselected provider with stray credentials must still report `not-selected`, while a selected provider with incomplete credentials must fail the smoke.

# Migration

No schema or customer-data migration exists. Newly generated empty projects receive only the corrected verification helper and contract.

# Rollback

Roll back the exact Engine candidate and Development Channel registration. Existing generated projects remain on their pinned Engine until they explicitly consume an authorized update.

# Release

Development Engine candidate only. Stable and Production remain unchanged.
