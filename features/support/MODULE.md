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
- Attachment boundary: PostgreSQL owns only validated metadata and state; R2 owns future file bytes. No upload endpoint is claimed until a selected R2 capability supplies authorization, object lifecycle, malware policy, and verified deletion behavior.
- Deliberate omissions: organization scope, SLA automation, mail mirroring, omnichannel intake, macros, and helpdesk reporting remain product-owned. This module stays small.
- Privacy and ownership: project-specific retention and operator access are explicit before release.

The module does not promise email notifications; authentication mail remains the separate provider-backed CFsend contract. The disposable empty-database workerd smoke proves thread visibility, assignment authorization, in-app event delivery, overview, and audit evidence. The authenticated browser matrix covers the responsive intake form, ticket list and selected StyleKit presentation in both modes with axe and screenshot review. Remote release remains unverified. Document future escalation, notification, privacy, and operational changes in a Change Spec.
