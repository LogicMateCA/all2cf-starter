---
module: support
status: local-verified
source: starter
---

# Support module

Purpose: provide a lightweight product support and bug-intake function inside the existing account and Admin surfaces, not a separate helpdesk product.

- Implemented intake: `/support` gives authenticated, verified users a Web form for a support request or bug report and a list restricted to their own submissions. Each account is limited to five new tickets per hour.
- Implemented operations: `/admin` lists tickets for platform admins, opens the complete thread, adds public replies or private internal notes, assigns only platform admins, controls low/normal/high priority, and supports open, in progress, resolved, and closed states.
- Storage: the empty Starter baseline creates ticket, message, attachment-metadata, notification, and Admin-audit tables directly. Customer messages notify platform admins; public Admin replies notify the ticket owner and link to the exact thread. Internal notes are never returned by the customer API.
- Attachment boundary: PostgreSQL owns validated support metadata and state. A selected Object Storage Pack can own bytes and verified deletion, but ticket-specific attachment authorization, malware scanning and retention remain separate product work rather than being implied by generic file upload.
- Deliberate omissions: organization scope, SLA automation, mail mirroring, omnichannel intake, macros, and helpdesk reporting remain product-owned. This module stays small.
- Privacy and ownership: project-specific retention and operator access are explicit before release.
- The hourly reply limit uses an author/created-time partial index; ticket/thread reads keep their existing owner, status and ticket/time indexes.

The module does not promise email notifications; authentication mail remains the separate provider-backed CFsend contract. The disposable empty-database workerd smoke proves thread visibility, assignment authorization, in-app event delivery, overview, and audit evidence. The authenticated browser matrix covers responsive intake and ticket flows; Visual Design owns presentation acceptance. Remote release remains unverified. Document future escalation, notification, privacy, and operational changes in a Change Spec.
