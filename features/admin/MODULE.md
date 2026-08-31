---
module: admin
status: local-verified
source: starter
---

# Admin module

Purpose: provide a route-addressable platform control center whose navigation contains only executable capabilities and whose optional modules appear only after their owning Packs are selected.

- Implemented scope: `/admin`, `/admin/access`, `/admin/communications/support`, `/admin/communications/announcements`, `/admin/growth/analytics`, `/admin/operations/health`, and `/admin/operations/audit` are stable executable routes. Unselected Organizations, Billing, Entitlements, Usage, API Keys and Webhooks appear in the Overview capability catalog rather than primary navigation.
- Shared shell: `/admin`, `/support`, Dashboard and Settings use the same permanent responsive Product Shell, registered navigation, notification Bell and account entry. Selecting a StyleKit global system changes the shell and all Admin modules through the generated semantic adapter rather than page-local redesign.
- Admin authority: Better Auth's official Admin plugin owns the `admin` platform role and identity endpoints. The Starter UI does not create a second role model. The first account in an empty database becomes Admin under a serialized PostgreSQL trigger; an existing database with no Admin promotes its oldest account during migration. `/admin` may add or remove other Admins, while the database refuses removal or deletion of the final Admin. Optional organization membership never grants platform Admin access.
- Admin subscription bypass: platform Admins resolve every product entitlement defined by the selected Packs as enabled and unlimited. This bypass belongs to the generated product itself; it does not grant an All2CF cloud maintenance entitlement or mutate customer subscriptions.
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
- Analytics & Scripts stores only external destination configuration, immutable revisions and Admin audit events. Cloudflare Web Analytics, Google Analytics, Google Tag Manager, Plausible and reviewed external HTTPS scripts publish through one same-origin cached Loader. Starter does not store product pageviews, visitor sessions or analytics events. Admin/Auth/Setup/Maintenance are excluded by default, and inline JavaScript is not accepted.

The disposable empty-database workerd smoke proves initial Admin assignment, ordinary-user denial, Better Auth Admin search, role round trip, last-Admin protection, subscription bypass, ban/unban, impersonated identity, return to Admin, session listing/revocation, exact mutation audit evidence, Admin overview, thread visibility, admin-only assignment, public replies, internal notes, transactional announcement broadcast, filtered non-overlapping audit pagination, invalid-cursor rejection, and Admin-only operations health. Separate selected-pack flows prove Stripe webhook and Cloudflare Queue ledger recognition. The authenticated browser matrix covers Admin, announcement publishing and audit filters at desktop/mobile widths in both modes with axe, overflow, console and screenshot review. Remote release remains unverified. Privileged actions must be explicit, auditable, and covered by a Change Spec before release.
