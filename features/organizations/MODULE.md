---
module: organizations
status: local-verified
source: starter
---

# Organizations module

Purpose: add optional multi-tenant workspaces without changing platform administration authority.

- Provider: the official Better Auth Organization plugin aligned at 1.7.1 with Better Auth core.
- Selection boundary: server/client plugin adapters, `/app/team`, `/app/invitation`, organization/team SQL, session fields, and invitation email support exist only while `saas.team-organizations` is selected.
- Roles: organization `owner`, `admin`, and `member` are tenant-scoped. They never grant Better Auth platform Admin access.
- Teams: enabled with Better Auth's default team behavior. Product-specific team and membership limits are deliberately not invented by Starter.
- Invitations: require a verified recipient account and expire after 48 hours. CFsend remains the default delivery provider through the shared authentication email outbox; Resend and Cloudflare Email Service remain explicit alternatives.
- Database: the pack contributes current SQL only to a new empty Starter database. There is no historical migration, data backfill, or dual-write path.

Local workerd evidence covers organization creation/listing, owner membership, default-team creation, provider-backed invitation, and continued platform Admin denial. Acceptance/rejection by a second real mailbox, cross-tenant application-data authorization, and remote Development release remain product-level gates.
