---
module: support
status: local-verified
source: starter
---

# Support module

Purpose: provide a lightweight product support and bug-intake function inside the existing account and Admin surfaces, not a separate helpdesk product.

- Implemented intake: `/support` gives authenticated, verified users a Web form for a support request or bug report and a list restricted to their own submissions. Each account is limited to five new tickets per hour.
- Implemented operations: `/admin` lists tickets for platform admins and supports open, in progress, resolved, and closed states. A report may be classified as support or bug without separate workflow engines.
- Storage: the empty Starter baseline creates PostgreSQL ticket and Admin audit tables directly. Threads, replies, notifications, organization scope, SLA automation, and R2 attachments are absent rather than stubbed.
- Privacy and ownership: project-specific retention and operator access are explicit before release.

The current module does not promise email notifications; authentication mail remains the separate provider-backed CFsend contract. Local workerd verification covers verified-user intake, per-user isolation, Admin denial/allow, status change, and audit evidence in a temporary empty database. Document future escalation, notification, privacy, and operational changes in a Change Spec.
