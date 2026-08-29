---
id: auth-smoke-selected-social-providers
title: Verify only the selected social providers in Auth smoke
status: implemented
affectedModules: [auth, operations]
docsImpact: [features/auth/MODULE.md, features/operations/MODULE.md, /dp]
---

# Outcome

Make the disposable Auth smoke compare Operations Health with the generated Blueprint's selected Google, GitHub and Apple providers and the generated project's own service slug. Selected providers must be configured and healthy; unselected providers must truthfully report `not-selected`. The shared parser distinguishes an absent legacy setting (Google default) from an explicit selection, while generated Wrangler configs encode no-social as the durable `none` sentinel because Cloudflare may omit empty-string vars. Runtime methods and health therefore cannot silently re-enable Google, and copied projects are not mistaken for the canonical `starter` service.

Email selection is equally exclusive at release time. Rewriting a Wrangler config removes stale CFsend and Resend secret requirements before adding only the selected provider's requirements; Cloudflare Email Service uses the `EMAIL` binding and `CLOUDFLARE_EMAIL_FROM` without inheriting CFsend blockers.

The disposable Auth smoke remains provider-independent: its temporary Wrangler config explicitly declares the three CFsend contract-double secrets that its own env-file supplies. This local test requirement never leaks back into the generated project's real Development Worker configuration.

Remote Development smoke is also selection-driven. It requires `/api/auth-methods` to equal the exact selected Google/GitHub/Apple set, validates each selected provider's secure host-only authorization state cookie, and treats an empty method list as the correct result for an explicit no-social project.

# Verification

The social-provider contract covers selected, deferred, explicit-empty, legacy-default and unselected health states. The full SQL-first and Drizzle portable verification gates, Auth smoke, types, builds, bundle budgets and both Wrangler dry-runs must pass before a new Engine candidate exists.

# Threat model

The Blueprint remains the sole social-provider selection authority. Runtime credentials are never returned or logged; the assertion consumes only read-only health status and configured booleans. An unselected provider with stray credentials must still report `not-selected`, while a selected provider with incomplete credentials must fail the smoke.

# Migration

No schema or customer-data migration exists. Newly generated empty projects receive only the corrected verification helper and contract.

# Rollback

Roll back the exact Engine candidate and Development Channel registration. Existing generated projects remain on their pinned Engine until they explicitly consume an authorized update.

# Release

Development Engine candidate only. Stable and Production remain unchanged.
