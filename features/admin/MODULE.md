---
module: admin
status: local-verified
source: starter
---

# Admin module

Purpose: provide a small authenticated product-operations shell whose sections are added only when their owning SaaS modules are selected.

- Implemented scope: `/admin` has one stable module registry for Overview, Users, Organizations, Billing, Entitlements, Usage, API Keys, Webhooks, Onboarding, Support, Notifications & Announcements, Audit, System Health, and Settings. Overview, Better Auth Users, Support threads, platform announcements, Audit, and System Health are executable. API Keys, Entitlements, Usage, Onboarding, and Outgoing Webhooks become executable only when their owning packs are materialized; Usage, Onboarding, Webhook, and Health Admin access are deliberately read-only. Other registrations truthfully report `optional` or `planned` until their owning pack exists.
- Shared shell: `/admin`, `/support`, Dashboard and Settings use the same permanent responsive Product Shell, registered navigation, notification Bell and account entry. Selecting a StyleKit global system changes the shell and all Admin modules through the generated semantic adapter rather than page-local redesign.
- Admin authority: Better Auth's official Admin plugin owns the `admin` platform role and identity endpoints. The Starter UI does not create a second role model. Optional organization membership never grants platform Admin access.
- Audit events: support assignment, status, priority, public replies, and internal notes append actor, action, target, metadata, and time to `app_admin_audit_event`. Admin exposes exact action, target type, actor, bounded search, date-range and stable `(created_at, id)` cursor filters; read-only screens do not create artificial audit noise.
- Announcement operations append `announcement.published` with exact recipient count and same-origin destination. The announcement row, all user notification rows and audit record commit or roll back together.
- Better Auth Users owns bounded email search, pagination, identity details, `user`/`admin` role changes, timed or permanent bans, unban, active-session readback and revocation, and one-hour impersonation with an explicit return-to-Admin action. The UI prevents self-directed privileged actions and leaves Admin-to-Admin impersonation disabled by the server policy.
- Hard deletion, forced password/email changes, and Admin-created users are deliberately not default buttons. A copied product must define its approval, recovery, notification, and retention policy before exposing those upstream endpoints.
- Optional and planned sections keep stable navigation and ownership, but never display fake data or editable controls until executable. `/admin` is not the `/setup` configurator and is never a general-purpose back-office framework.
- Approval boundaries: project-specific destructive actions require explicit intent.
- Provider operations are intentionally read-only in Admin. System Health reports configured/missing fields, but adding or replacing Google, CFsend, Resend, Stripe or Cloudflare Email Service values requires the local `/setup` workflow and a reviewed Development release.
- Optional Workers AI adds one platform-Admin-only fixed-prompt Binding test. It returns bounded model/Gateway/log evidence and is not an arbitrary prompt console; model and Gateway changes remain local Setup work.
- Optional Vectorize adds one platform-Admin-only generated-vector round trip. It never accepts product text or client-selected vectors and always attempts to delete its test vector.
- Optional Expo Push adds a platform-Admin-only fixed-message test to the current admin's registered devices; it never accepts another user ID or performs a broadcast.
- Optional Twilio SMS adds a platform-Admin-only fixed-message test to an explicit E.164 number. It records only provider SID/status and privacy-bounded recipient evidence.
- Optional Cloudflare Images adds a platform-Admin-only fixed PNG-to-WebP Binding test; it is not a public image playground or arbitrary origin proxy.
- Optional Stream exposes configuration/asset state in health; Setup owns the provider token test. Admin never receives a raw Stream token or arbitrary account mutation console.
- Optional Cron exposes bounded heartbeat readback. Admin cannot execute arbitrary scheduled product work from the dashboard.
- Optional Workflows exposes only fixed test-instance create/status; it cannot select a class, arbitrary payload or arbitrary code.
- Optional realtime exposes one fixed Admin socket/state round-trip. Ordinary users may join authenticated product rooms but cannot invoke the Admin test, reset test state or select arbitrary Durable Object classes.
- Emergency access and rollback: release identity and runbook are recorded before use.
- Admin data is module-lazy. Overview loads only aggregate counts; Support loads tickets plus assignee identities; Notifications and Audit load only when selected; Users and Health retain focused loaders.

The disposable empty-database workerd smoke proves ordinary-user denial, Better Auth Admin search, role round trip, ban/unban, impersonated identity, return to Admin, session listing/revocation, exact mutation audit evidence, Admin overview, thread visibility, admin-only assignment, public replies, internal notes, transactional announcement broadcast, filtered non-overlapping audit pagination, invalid-cursor rejection, and Admin-only operations health. Separate selected-pack flows prove Stripe webhook and Cloudflare Queue ledger recognition. The authenticated browser matrix covers Admin, announcement publishing and audit filters at desktop/mobile widths in both modes with axe, overflow, console and screenshot review. Remote release remains unverified. Privileged actions must be explicit, auditable, and covered by a Change Spec before release.
