---
title: Restore the mature SaaS Admin interaction contract
status: implemented
affectedOwners: [admin, identity, organizations, billing, support, analytics]
---

# Intent

Keep the canonical Starter, rather than any generated product, responsible for the reusable SaaS Admin experience. Generated products adapt this contract to their own data without redefining the Admin foundation.

# Provenance

- Open SaaS `cbd30162b05d798b3a3f955ab5781940b67bec89` is the primary Admin layout, navigation, user-directory, analytics, messages and settings interaction donor.
- SaaSBoard `6cb1b4c84aec1adb8cfbc4df6e38b6717ca50382` is the authenticated shell, Billing, Support and Settings information-architecture donor.
- LastSaaS `c692923ed98ee503f2de61180ff530a5b05f71a6` is a capability and data-table completeness reference only.
- All three sources are pinned in `catalog/saas-sources.json` with MIT license evidence. Their runtimes, persistence, mock data and donor styling remain rejected.

# Contract

- Admin modules share one persistent shell and client-side navigation.
- Users and organizations render one record per row. Search, filters, status and the primary identity remain visible; full controls open in a focused detail drawer.
- Support remains inside Admin and owns assignment, replies, internal notes and ticket state.
- Analytics & Scripts supports Cloudflare Web Analytics, GA, GTM, Plausible and privileged custom snippets. External script sources must use HTTPS. Inline bodies are served through a same-origin endpoint without `eval` or `unsafe-inline`.
- Generated products may add columns and modules but must not replace the shared interaction model with nested customer or organization cards.
- Selected SaaS Pack tables are discovered lazily through `to_regclass`; an unselected Pack returns an unavailable state and is never queried. Admin directories add no Provider dependency.
- Subscription pause/activate, Entitlement enable/disable, API-key enable/disable, Webhook enable/disable and Onboarding reset are explicit allow-listed mutations. Each mutation is transactional and writes an Admin audit event. Organizations and Usage remain evidence-only in this shared directory; their owned Pack flows retain membership and metering mutations.

# Open SaaS capability mapping

| Open SaaS capability | Canonical Starter capability | Requirement |
| --- | --- | --- |
| Analytics dashboard | Admin Overview plus Analytics & Scripts | Use real account, subscription and operational aggregates. Visitor analytics remains external-provider owned. |
| Users dashboard | Users & access | Search, pagination, role control, ban/unban, sessions, session revocation and audited impersonation remain functional. |
| Messages | Support inbox plus Announcements | Starter replaces the donor placeholder with real threads, assignment, public replies, internal notes and product announcements. |
| Settings | Account settings, Provider setup and Analytics & Scripts | Settings are split by owner instead of placed in one mixed form; every mutation remains real and auditable. |
| Admin layout | Product shell plus Admin module navigation | Persistent responsive shell, permission boundary, history navigation and focused detail surfaces remain mandatory. |

Open SaaS Calendar and UI Buttons are donor demonstration pages, not SaaS operating capabilities. They are intentionally not shipped as fake product features. Starter must not remove any functional Admin capability merely because one generated product does not currently expose it.

# Validation

- TypeScript application and Worker checks.
- Admin, platform-Admin and site-integration contracts.
- Desktop and mobile Admin browser acceptance with zero horizontal overflow.
- PostgreSQL 18 disposable-database proof covers all baseline migrations, selected API-key Pack materialization, three simultaneous product subscriptions, Entitlement/API-key/Webhook state changes, Onboarding reset and persisted Platform Settings.
- Change Spec enforcement begins after audited legacy commit `3841824faf3088e5e7bc0f921e84d5a934a3f65e`; published pre-baseline release-note and receipt commits are not rewritten.
- Production adaptation remains a separate generated-product release.
