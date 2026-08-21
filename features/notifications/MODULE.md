---
module: notifications
status: local-verified
source: starter
---

# Notifications module

Purpose: provide the permanent user-notification contract used by the Product Shell, SaaS modules, and later product-specific events.

- The signed-in Product Shell places an accessible Bell immediately before the account trigger and links to `/app/notifications`.
- PostgreSQL owns notification recipient, category, title, body, internal deep link, read time, and created time. Every query and mutation is filtered by the current Better Auth user; a client-supplied user ID is never authoritative.
- The Worker exposes bounded list and unread-count reads plus idempotent mark-one and mark-all mutations. Responses are private and `no-store`.
- Web owns loading, empty, error, unread, read, retry, single-read, all-read and full-inbox states. Stored deep links are followed only when they are same-origin absolute paths.
- Dashboard Recent activity consumes the same bounded, recipient-isolated notification API and read state. It is not a separate activity ledger and cannot invent events that were not persisted by an owning module.
- Platform announcements are a baseline Admin producer. A bounded Admin-only transaction stores immutable announcement history, creates one recipient-isolated in-app record for every verified non-banned user, and appends one audit event. Same-origin deep links are mandatory; email and push are not implied.
- Support is the first registered producer: new tickets and customer replies notify platform admins, while public Admin replies notify the ticket owner with a thread deep link. Better Auth Admin hooks emit recipient-scoped security events for role changes, bans, access restoration, session revocation and audited impersonation. Platform Admin announcements broadcast to eligible users transactionally. When selected, Better Auth Organization lifecycle hooks emit workspace, invitation and membership events; Better Auth Stripe lifecycle callbacks emit idempotent user billing events keyed by provider event ID. Copied-product events must still register ownership and deduplication policy before they emit records.
- Delivery channels are separate. An in-app record does not imply an email or push notification; CFsend remains the default email provider and native push requires its own selected capability.

Disposable empty-database smoke evidence covers unauthenticated denial, two-user isolation, unread list/count, foreign-notification denial, idempotent single-read, mark-all and the final zero-unread state. The authenticated browser matrix additionally proves the real Bell preview and full inbox on desktop/mobile in light/dark modes. Remote Development release remains unverified.
