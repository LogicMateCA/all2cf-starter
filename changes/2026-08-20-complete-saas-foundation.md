---
id: complete-saas-foundation
title: Make the complete SaaS platform the reusable baseline
status: local-verified
affectedModules:
  [
    assembler,
    auth,
    product-shell,
    notifications,
    admin,
    billing,
    usage,
    organizations,
    support,
    docs,
  ]
docsImpact:
  [
    PROJECT.md,
    ARCHITECTURE.md,
    features/assembler/MODULE.md,
    features/auth/MODULE.md,
    features/admin/MODULE.md,
    features/billing/MODULE.md,
    features/organizations/MODULE.md,
    features/notifications/MODULE.md,
    features/support/MODULE.md,
    starter.blueprint.json,
    catalog/catalog.json,
    /setup,
    /dp,
  ]
---

# Outcome

A copied Starter begins with a complete, coherent SaaS platform rather than a login page and a lightweight operations screen. The product owner and AI only need to define what the new SaaS does, its core objects and workflows, and any product-specific capabilities.

# Source decisions

- Pin Open SaaS commit `cbd30162b05d798b3a3f955ab5781940b67bec89` as the MIT-licensed product-shell and standard SaaS-flow donor. Adapt its Dashboard, Account, Admin, Billing, Analytics, Messages, Settings, file, job, landing, and content boundaries without importing Wasp, Prisma, or its server runtime.
- Pin SaaSBoard commit `6cb1b4c84aec1adb8cfbc4df6e38b6717ca50382` as the MIT-licensed authenticated-shell interaction donor. Adapt its Sidebar, Topbar, search, notification bell, account/plan state, Dashboard, Reports, Billing, Settings, and Support organization without copying mock behavior or fixed styling.
- Pin LastSaaS commit `c692923ed98ee503f2de61180ff530a5b05f71a6` as the MIT-licensed completeness checklist for multi-tenancy, RBAC, subscriptions, seats, trials, entitlements, credits, API keys, signed outgoing webhooks, usage, telemetry, announcements, branding, system health, and platform administration.
- Better Auth and its official plugins own identity, Admin authority, Organization, API Key, Passkey, 2FA, Magic Link, Captcha, Stripe, MCP authentication, and other available upstream behavior. Starter-owned code fills only product and Cloudflare-specific gaps.
- Runtime implementation remains Cloudflare Workers, SQL-first PostgreSQL through Hyperdrive, Queues/Workflows/Cron where justified, R2 for files, CFsend by default, and Stripe through the aligned Better Auth plugin. Donor runtimes never enter generated products.

# Required baseline

- One shared authenticated Product Shell with responsive navigation, optional workspace switcher, global search seam, notification bell and unread count, account/plan state, theme, language, help, Admin entry, and sign out.
- Account and security surfaces for profile, preferences, email, linked providers, sessions, Passkey, 2FA, and account lifecycle when the corresponding Better Auth capability is selected.
- A useful empty-state Dashboard, recent activity, notifications center, Settings, Support, Docs entry, and consistent loading, empty, error, permission-denied, and upgrade-required states.
- A modular Admin shell with Overview, Users, Organizations, Billing, Entitlements, Usage, API Keys, Webhooks, Support, Notifications, Audit, System Health, and Settings registrations. A module may report unavailable until its executable pack exists, but the platform navigation and ownership contract are stable.
- Support and bug intake with threads, replies, status, priority, assignment seam, internal notes, user/admin notifications, and an R2 attachment seam. It remains a small product module, not a helpdesk suite.
- Notifications with persisted recipients, categories, unread state, deep links, Bell preview, full inbox, mark-read/all-read behavior, and event adapters for support, billing, organization, security, announcement, and product events.
- Billing plans, Checkout/Portal, subscription lifecycle, entitlements, quotas, trials and usage; Organization billing and per-seat behavior remain explicit project choices rather than silent defaults.
- API keys, scopes, usage records, outgoing signed webhooks and delivery/retry evidence as executable packs before they can be selected.

# Assembly contract

- Replace `basic-product` with an executable `saas-foundation` preset. Identity, Product Shell, notifications, settings, support, Admin framework, Docs, audit, and operations health are baseline.
- Organization, Billing, API platform, storage, maps, AI, and other business capabilities remain selectable only where their product meaning differs. Their navigation, permission, notification, audit, and Admin registration seams are part of the baseline.
- `/setup` first asks what the SaaS does, who uses it, its core objects, tenant model and charging model. It then orders SaaS, capabilities, providers and pages before the replaceable Design choice. AI derives a proposed product module set and shows consequences before materialization.
- `/dp` reports every baseline function and selected product capability separately across defined, materialized, locally verified, Development verified, and Production released states.

# Verification

- Contract tests prove every baseline route and shell registration, authenticated/unauthenticated state, notification unread behavior, account menu, permissions, and module ownership.
- Empty-database smoke tests prove selected Better Auth plugins, notification/support/audit records, billing/webhook replay, API-key isolation, and organization boundaries without legacy migration logic.
- Browser tests cover signed-out and signed-in shell, Bell, account menu, Dashboard, Settings, Support and Admin on desktop and responsive widths.
- `starter:materialize` cycles prove that optional product capabilities add and remove their owned files, dependencies, routes, SQL, bindings, navigation, notifications, Admin sections and receipts without touching the baseline shell.
- Run `knowledge:sync`, `knowledge:check`, `change:check`, `ai:context -- --json`, all workspace type checks, builds, budgets, workerd smoke tests, and Development/Production Wrangler dry runs.

# Current implementation evidence

- The shared Product Shell owns the responsive Sidebar/Topbar frame, registered-route search, Personal workspace seam, Bell/inbox, account actions, Dashboard empty states, and product-module slot. Account Settings owns profile, appearance, language, session, and honest optional-security capability states.
- `catalog/saas-sources.json` pins the three donor revisions, license hashes, accepted paths, rejected runtimes, target paths, and review policy. `catalog/saas-capabilities.json` records 18 baseline, materializer, and planned capabilities with ownership, routes, APIs, schema, verification, and gaps. `saas:contract` validates both contracts and the default `saas-foundation` preset.
- `starter.blueprint.json` now requires `productIntent`; `/setup` captures purpose, audiences, core objects, tenant model, and charging model, then derives an explicit Organization/Billing proposal rather than silently changing selections.
- Support has customer/admin threads, public/internal visibility, priority, admin-only assignment, customer/admin notifications, audit events, and an R2 attachment-metadata seam. Successful Better Auth Admin role, ban, unban, session-revocation and impersonation mutations produce recipient-scoped security notifications alongside exact audit evidence. Admin has a stable LastSaaS-informed module registry, Overview, Better Auth Users, Support, filtered stable-cursor Audit and System Health implementations. Dashboard Recent activity reads the same real recipient-isolated notification stream rather than remaining a mock empty state. The optional Organization pack completes Product Shell switching, member administration, verified invitation lifecycle and organization notifications through Better Auth. The TOTP 2FA pack completes the password second-factor lifecycle, while `api-saas` composes Billing, API Keys, Entitlements, Usage, Queue Webhooks, Developer UI and API Docs into one executable platform. Onboarding and the remaining independent packs continue to pass focused select/smoke/remove cycles. Credits, organization-owned metering and copied-product event/resource vocabulary remain separate explicit capabilities rather than being silently bundled.
- `auth:smoke:dev` passes against a disposable empty PostgreSQL database and proves Better Auth Admin search, role changes, bans, impersonation and session revocation with exact audit evidence; thread visibility, assignment authority, support and announcement notifications, exact filters, non-overlapping cursor pagination, invalid-cursor rejection, Overview, mandatory verification email, password reset, and CFsend contract delivery also remain covered. After every optional-pack cycle, the current default authenticated browser mode passed 28 desktop/mobile, light/dark cases and 48 screenshots for Product Shell, persisted Dashboard Recent activity, Bell, account menu, Settings, notifications, Support, Admin announcements, Audit filters, Docs and `/dp`, with zero axe, overflow, console or subresource failures at `test-results/browser-acceptance/2026-08-21T05-22-32-541Z/authenticated`.
- This promotes the reusable baseline to local verification, not Development or Production release. Copied products still define their own core modules, billing/tenant ownership, events, permissions, retention and provider credentials.

# Release

No deployment is authorized by this change. Development and Production remain unchanged until their respective release commands are used; real provider-backed acceptance remains an environment-specific release gate.
