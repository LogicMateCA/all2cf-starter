---
module: organizations
status: local-verified
source: starter
---

# Organizations module

Purpose: add optional multi-tenant workspaces without changing platform administration authority.

- Provider: the official Better Auth Organization plugin aligned at 1.7.2 with Better Auth core.
- Selection boundary: server/client plugin adapters, `/app/team`, `/app/invitation`, organization/team SQL, session fields, and invitation email support exist only while `saas.team-organizations` is selected.
- Roles: organization `owner`, `admin`, and `member` are tenant-scoped. They never grant Better Auth platform Admin access.
- Workspace shell: when the pack is materialized, the shared Product Shell lists real memberships, persists the selected active organization through Better Auth, allows an explicit return to Personal context, and links to one organization-management surface instead of creating a second shell.
- Member administration: the organization owner/admin can list up to 100 members, promote or demote non-owners, remove a member only after an explicit confirmation step, list pending invitations, and cancel invitations. Better Auth remains the authorization authority for every mutation.
- Teams: owners/admins can create and remove Teams, select active Team, and add/remove existing organization members. The final Team cannot be removed.
- Dynamic access: organization-scoped custom roles use Better Auth Dynamic Access Control. Starter supplies Viewer and Project Editor templates plus `project` and `branding` resources; these roles never grant platform Admin.
- Plan limits: free organizations receive bounded organization, member, Team and Team-member limits; active Pro subscriptions raise those limits. The plugin remains the enforcement authority.
- White-label: owners/admins can update organization name, slug, logo and metadata-backed brand color, support contact, email sender label and desired custom domain. Invitation email uses the organization brand. A custom domain is not considered active until the product domain workflow separately proves DNS ownership.
- Lifecycle: owners may delete organizations after typing the slug; non-owners may leave; invitees may accept or reject invitations.
- Invitations: require a verified recipient account and expire after 48 hours. CFsend remains the default delivery provider through the shared authentication email outbox; Resend and Cloudflare Email Service remain explicit alternatives.
- Event delivery: organization creation, invitation of an existing verified account, invitation acceptance/cancellation, member-role changes and member removal emit recipient-scoped in-app organization notifications through Better Auth's official lifecycle hooks. Email invitation delivery remains separate.
- Database: the pack contributes current SQL only to a new empty Starter database. There is no historical migration, data backfill, or dual-write path.

Local workerd evidence covers organization creation/listing, active-workspace switching, owner membership, default-team creation, bounded member listing, member role changes and removal, provider-backed invitation listing/cancellation/acceptance, lifecycle notifications, cross-organization membership isolation, and continued platform Admin denial. The selected Web build and 32-case authenticated browser matrix verify the shared Product Shell and management route together on desktop/mobile in both modes. A real remote mailbox, product-data tenant authorization, and Development release remain later gates.
