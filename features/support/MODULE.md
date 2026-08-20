---
module: support
status: template
source: starter
---

# Support module

Purpose: provide a lightweight product support and bug-intake function inside the existing account and Admin surfaces, not a separate helpdesk product.

- Initial intake: authenticated Web form for support or bug reports, with CFsend notification and an Admin inbox.
- Minimal states: open, in progress, resolved, closed. A report may be classified as support or bug without creating separate workflow engines.
- Initial storage: PostgreSQL only. Threads, organization scope, SLA automation, and R2 attachments are optional later capabilities, not baseline requirements.
- Privacy and ownership: project-specific retention and operator access are explicit before release.

Document escalation, privacy, and operational changes in a Change Spec.
